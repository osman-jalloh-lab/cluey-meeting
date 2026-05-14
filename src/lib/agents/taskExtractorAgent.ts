import * as gemini from '@/lib/ai/gemini'
import { prisma } from '@/lib/db'
import { estimateCost } from '@/lib/ai/router'

export interface ExtractedTask {
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  dueDate?: string
  source: string
}

export interface MeetingRecapResult {
  summary: string
  decisions: string[]
  actions: ExtractedTask[]
  commitments: string[]
  tags: string[]
}

export async function extractTasksFromNote(
  userId: string,
  note: { id: string; title: string; content: string }
): Promise<ExtractedTask[]> {
  const prompt = `Extract actionable tasks from this note.

Note Title: ${note.title}
Note Content: ${note.content}

Return JSON array:
[
  {
    "title": "task title",
    "description": "task description",
    "priority": "high|medium|low",
    "dueDate": "YYYY-MM-DD or null",
    "source": "note"
  }
]

Only extract real actionable tasks. Return ONLY valid JSON array.`

  const result = await gemini.chatJson<ExtractedTask[]>(prompt)

  await prisma.apiUsageLog.create({
    data: {
      userId,
      provider: 'gemini',
      model: 'gemini-1.5-flash',
      inputTokens: prompt.length / 4,
      outputTokens: 300,
      estimatedCost: estimateCost('gemini-1.5-flash', prompt.length / 4, 300),
      action: 'task_extraction_note',
    },
  })

  return Array.isArray(result) ? result : []
}

export async function extractMeetingRecap(
  userId: string,
  meeting: { who: string; projectName?: string; rawNotes: string; history?: string }
): Promise<MeetingRecapResult> {
  const prompt = `Analyze these meeting notes and extract key information.

Meeting with: ${meeting.who}
Project: ${meeting.projectName || 'none'}
${meeting.history ? `Previous history:\n${meeting.history}\n` : ''}
Notes: """${meeting.rawNotes}"""

Respond ONLY with a JSON object matching this EXACT structure:
{
  "summary": "2-3 sentence engaging summary",
  "decisions": ["decision 1", "decision 2"],
  "actions": [
    {
      "title": "action item title",
      "description": "action description",
      "priority": "high|medium|low",
      "dueDate": "YYYY-MM-DD or null",
      "source": "meeting"
    }
  ],
  "commitments": ["commitment or follow up with date 1", "commitment 2"],
  "tags": ["topic1", "topic2"]
}

Return ONLY valid JSON.`

  const result = await gemini.chatJson<{
    summary: string
    decisions: string[]
    actions: ExtractedTask[]
    commitments: string[]
    tags: string[]
  }>(prompt)

  await prisma.apiUsageLog.create({
    data: {
      userId,
      provider: 'gemini',
      model: 'gemini-1.5-flash',
      inputTokens: Math.floor(prompt.length / 4),
      outputTokens: 600,
      estimatedCost: estimateCost('gemini-1.5-flash', Math.floor(prompt.length / 4), 600),
      action: 'task_extraction_meeting',
    },
  })

  return {
    summary: result.summary || 'No summary generated.',
    decisions: result.decisions || [],
    actions: result.actions || [],
    commitments: result.commitments || [],
    tags: result.tags || [],
  }
}
