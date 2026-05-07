import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const Schema = z.object({
  command: z.string().min(1).max(500),
})

// Agent routing by keyword — no API cost
const ROUTING_RULES: Array<{ keywords: string[]; agent: string; priority: string; source: string }> = [
  {
    keywords: ['email', 'inbox', 'gmail', 'unread', 'reply', 'message', 'recruiter email', 'check mail'],
    agent: 'Inbox Specialist',
    priority: 'normal',
    source: 'gmail',
  },
  {
    keywords: ['calendar', 'schedule', 'meeting', 'event', 'appointment', 'block time', 'week', 'tomorrow'],
    agent: 'Schedule Manager',
    priority: 'normal',
    source: 'calendar',
  },
  {
    keywords: ['job', 'internship', 'apply', 'career', 'resume', 'cover letter', 'hiring', 'opportunity', 'cpt', 'opt', 'cybersecurity intern', 'find jobs'],
    agent: 'Career Advisor',
    priority: 'high',
    source: 'job-search',
  },
  {
    keywords: ['hr', 'i-9', 'i9', 'compliance', 'ead', 'workday', 'verify', 'immigration', 'uscis', 'opt status'],
    agent: 'HR Compliance Specialist',
    priority: 'high',
    source: 'hr',
  },
  {
    keywords: ['task', 'priority', 'focus', 'today', 'finish', 'unfinished', 'todo', 'action', 'blocked', 'carry', 'history', 'completed', 'what have i done'],
    agent: 'Ops Manager',
    priority: 'normal',
    source: 'tasks',
  },
  {
    keywords: ['briefing', 'morning', 'summary', 'plan my day', 'daily', 'recap', 'overview', 'what do i have', 'assign', 'delegate', 'report', 'status update', 'check in'],
    agent: 'Chief of Staff',
    priority: 'normal',
    source: 'briefing',
  },
  {
    keywords: ['learn', 'study', 'course', 'certification', 'cert', 'school', 'class', 'deadline', 'assignment', 'skill', 'grow', 'improve', 'reading', 'book'],
    agent: 'Growth Coach',
    priority: 'normal',
    source: 'learning',
  },
]

function routeCommand(command: string): { agent: string; priority: string; source: string } {
  const lower = command.toLowerCase()
  for (const rule of ROUTING_RULES) {
    if (rule.keywords.some(kw => lower.includes(kw))) {
      return { agent: rule.agent, priority: rule.priority, source: rule.source }
    }
  }
  return { agent: 'Chief of Staff', priority: 'normal', source: 'manual' }
}

function buildTaskTitle(command: string, agent: string): string {
  const lower = command.toLowerCase()
  if (lower.startsWith('find') || lower.startsWith('search') || lower.startsWith('look')) return command
  if (lower.startsWith('check')) return command
  if (lower.startsWith('create') || lower.startsWith('make') || lower.startsWith('generate')) return command
  if (lower.startsWith('plan')) return command
  if (lower.startsWith('show') || lower.startsWith('list')) return command
  return `${agent}: ${command}`
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { command } = parsed.data
  const userId = session.user.id!

  const routing = routeCommand(command)
  const taskTitle = buildTaskTitle(command, routing.agent)

  // Create agent task
  const task = await prisma.agentTask.create({
    data: {
      userId,
      title: taskTitle,
      description: command,
      assignedTo: routing.agent,
      createdBy: 'Chief of Staff',
      priority: routing.priority as 'low' | 'normal' | 'high' | 'urgent',
      status: 'open',
      source: routing.source,
      requiresApproval: false,
    },
  })

  // Create routing message
  await prisma.agentMessage.create({
    data: {
      userId,
      fromAgent: 'Chief of Staff',
      toAgent: routing.agent,
      taskId: task.id,
      message: `Got your command: "${command}". Routing to ${routing.agent}.`,
      messageType: 'handoff',
    },
  })

  return NextResponse.json({
    task,
    routing,
    message: buildAgentAck(routing.agent, command),
  })
}

function buildAgentAck(agent: string, command: string): string {
  const acks: Record<string, (cmd: string) => string> = {
    'Inbox Specialist': (cmd) => `On it. Scanning your inbox for: "${cmd}".`,
    'Schedule Manager': (cmd) => `Got it. Pulling up your calendar for: "${cmd}".`,
    'Career Advisor': (cmd) => `Locked in. Running job search for: "${cmd}".`,
    'HR Compliance Specialist': (cmd) => `Understood. Reviewing HR/compliance context for: "${cmd}".`,
    'Ops Manager': (cmd) => `On it. Pulling up tasks and history for: "${cmd}".`,
    'Chief of Staff': (cmd) => `On it. Coordinating and routing your command: "${cmd}".`,
    'Growth Coach': (cmd) => `Got you. Pulling up your learning and growth path for: "${cmd}".`,
  }
  const fn = acks[agent] ?? ((cmd: string) => `Routing "${cmd}" to ${agent}.`)
  return fn(command)
}
