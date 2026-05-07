// Job Evaluator — adapted from Career-Ops scoring framework
// Evaluates jobs against Osman's profile with an honest 1-5 score.
// Never invents experience. Flags gaps clearly.

import * as openai from '@/lib/ai/openai'
import { prisma } from '@/lib/db'
import { estimateCost } from '@/lib/ai/router'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface JobEvaluation {
  title: string
  company: string
  location: string
  workType: string           // Remote | Hybrid | On-site | Unknown
  score: 1 | 2 | 3 | 4 | 5
  recommendation: string     // "Apply now" | "Apply after small edits" | "Review gaps first" | "Probably skip" | "Skip"
  whyItMatches: string       // Honest summary of alignment
  gaps: string[]             // Real gaps — skills or experience missing
  resumeKeywords: string[]   // ATS keywords from this JD to weave into resume
  resumeAngle: string        // Which part of Osman's background to lead with
  nextAction: string         // Specific, immediate action
  scoreBreakdown: {
    skillsMatch: number       // 1-5: How well skills align
    experienceMatch: number   // 1-5: Level and years match
    roleLevel: number         // 1-5: Entry/intern/junior fit
    cyberRelevance: number    // 1-5: Cybersecurity/SOC relevance
    grcRelevance: number      // 1-5: GRC/compliance relevance
    itSupportRelevance: number// 1-5: IT support/sysadmin relevance
    hrisRelevance: number     // 1-5: HRIS/HR tech relevance
    locationFit: number       // 1-5: Austin TX / remote fit
    workAuthFit: number       // 1-5: CPT/OPT compatible, no clearance blocker
    growthValue: number       // 1-5: Career value, learning, network
  }
  workAuthNotes: string       // OPT/CPT compatibility, sponsorship flags
  sponsorshipRequired: boolean
  clearanceRequired: boolean
  applicationEffort: 'low' | 'medium' | 'high'  // How much tailoring needed
}

// ── Osman's profile summary for evaluation ────────────────────────────────────

const OSMAN_PROFILE = `
## Candidate: Osman Jalloh

### Background
- F-1 international student, authorized to work in the US (OPT/CPT)
- Austin Community College, Computer Information Technology — graduating May 2026
- CompTIA Security+ (SY0-701) and CySA+ (CS0-003)
- Starting UT System OCIO role May 18 2026 (Client Services Student Associate, ~19.5 hrs/week)

### Work Experience
- Technical Support & Compliance Auditor, ACC HR Department
  - Daily I-9 auditing, E-Verify case review, Workday audit trail analysis
  - EAD/I-94/I-797 document verification, reverification tracking
  - Workday (daily operational use: reports, tasks, I-9 verification)
  - Ticketing: TDX, Mojo, Zendesk — HR ticket triage and employee support
  - Trained HR staff and managers on I-9 compliance
  - Systems: E-Verify, Box, Google Sheets, Excel

### Technical Skills
- Networking: TCP/IP, subnetting, LAN, VPNs, firewalls, pfSense, RDP
- Windows: Windows Server basics, Active Directory concepts, Group Policy
- Linux: file management, permissions, users/groups, Apache, auditd, syslog
- Cybersecurity tools: Splunk (labs), Nmap, Zenmap, Burp Suite, Event Viewer
- SIEM basics, IDS/IPS concepts, phishing awareness, access control basics
- Python (beginner-intermediate), HTML/CSS, React/TypeScript
- Building AI dashboards with Next.js, Prisma, Telegram bots, multi-agent systems

### Certifications
- CompTIA Security+ — held
- CompTIA CySA+ — held

### Target Roles
- SOC Analyst Intern or entry-level
- Cybersecurity Intern
- GRC Analyst (entry-level or intern)
- IT Support / Help Desk
- HRIS Analyst or HR Tech support
- IAM / Active Directory support
- Security Operations (entry-level)
- CPT/OPT-friendly internships in Austin TX or remote

### What Makes Him Competitive
- Real HR/compliance experience — not theory
- I-9/E-Verify expertise is rare at his level
- Workday operational experience
- Security certifications (Security+, CySA+)
- Building real AI tools (not just coursework)
- Authorized to work — no sponsorship needed for current OPT period

### Honest Gaps
- No professional SOC or security operations experience yet (only labs)
- No enterprise Active Directory hands-on (concepts only)
- Limited Python (beginner-intermediate)
- No clearance — cannot apply to positions requiring security clearance
- Cannot commit to full-time while at UT System (~19.5 hrs/week)
`

// ── Scoring prompt — adapted from Career-Ops 10-dimension model ───────────────

function buildEvalPrompt(jobTitle: string, company: string, jobDescription: string): string {
  return `You are evaluating a job opportunity for Osman Jalloh. Be honest. Do not inflate scores. If a job is a bad fit, say so clearly.

## Candidate Profile
${OSMAN_PROFILE}

## Job to Evaluate
Title: ${jobTitle}
Company: ${company}
Description:
${jobDescription.slice(0, 3000)}

## Scoring System
Score each job 1-5:
- 5 = Strong match — apply now, minimal tailoring needed
- 4 = Good match — apply after small resume edits
- 3 = Possible match — review the gaps, decide carefully
- 2 = Weak match — significant gaps, probably skip
- 1 = Bad match — skip, not worth the time

## Your Job
Analyze this job against Osman's ACTUAL background. Do not assume skills he does not have. Flag real gaps.

Return ONLY valid JSON matching this exact structure:
{
  "title": "exact job title from listing",
  "company": "company name",
  "location": "location from listing",
  "workType": "Remote|Hybrid|On-site|Unknown",
  "score": 1|2|3|4|5,
  "recommendation": "Apply now|Apply after small edits|Review gaps first|Probably skip|Skip",
  "whyItMatches": "2-3 sentences on genuine alignment. Be specific about which of Osman's real experiences apply.",
  "gaps": ["specific gap 1", "specific gap 2"],
  "resumeKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "resumeAngle": "Which part of his background to lead with and why. One paragraph max.",
  "nextAction": "One specific action: e.g. Apply today, tailoring the compliance section to match their I-9 mention.",
  "scoreBreakdown": {
    "skillsMatch": 1-5,
    "experienceMatch": 1-5,
    "roleLevel": 1-5,
    "cyberRelevance": 1-5,
    "grcRelevance": 1-5,
    "itSupportRelevance": 1-5,
    "hrisRelevance": 1-5,
    "locationFit": 1-5,
    "workAuthFit": 1-5,
    "growthValue": 1-5
  },
  "workAuthNotes": "OPT compatible yes/no. Any sponsorship mentions. Any clearance requirements.",
  "sponsorshipRequired": true|false,
  "clearanceRequired": true|false,
  "applicationEffort": "low|medium|high"
}

Rules:
- Do not invent skills Osman does not have
- Do not inflate scores to be encouraging
- workAuthFit should be 1 if clearance is required (he cannot get clearance)
- sponsorshipRequired true if the job explicitly says "must be US citizen/PR" or "no sponsorship"
- applicationEffort: low = apply as-is, medium = minor tailoring, high = major resume rewrite needed
- Return ONLY the JSON object. No markdown fences. No extra text.`
}

// ── Follow-up cadence — adapted from Career-Ops followup-cadence.mjs ──────────

export type FollowUpUrgency = 'overdue' | 'due-today' | 'due-soon' | 'waiting' | 'cold'

export interface FollowUpStatus {
  urgency: FollowUpUrgency
  daysUntilFollowUp: number
  message: string
  suggestedDate: Date
}

export function calculateFollowUpStatus(
  status: string,
  appliedAt: Date | null,
  followUpDate: Date | null,
  followUpCount: number
): FollowUpStatus {
  const now = new Date()
  const maxFollowUps: Record<string, number> = {
    Applied: 2,
    Screening: 1,
    Interview: 1,
  }
  const cadenceDays: Record<string, number> = {
    Applied: 7,
    Screening: 3,
    Interview: 1,
  }

  const max = maxFollowUps[status] ?? 0
  if (max === 0 || followUpCount >= max) {
    return {
      urgency: 'cold',
      daysUntilFollowUp: 0,
      message: 'Max follow-ups reached. Move on or mark as cold.',
      suggestedDate: now,
    }
  }

  const baseDate = followUpDate ?? appliedAt
  if (!baseDate) {
    return {
      urgency: 'waiting',
      daysUntilFollowUp: cadenceDays[status] ?? 7,
      message: 'Set an applied date to start tracking follow-ups.',
      suggestedDate: new Date(now.getTime() + (cadenceDays[status] ?? 7) * 86400000),
    }
  }

  const daysSince = Math.floor((now.getTime() - baseDate.getTime()) / 86400000)
  const cadence = cadenceDays[status] ?? 7
  const daysUntil = cadence - daysSince

  if (daysUntil < 0) {
    return {
      urgency: 'overdue',
      daysUntilFollowUp: daysUntil,
      message: `Follow-up overdue by ${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? '' : 's'}. Send one today.`,
      suggestedDate: now,
    }
  }
  if (daysUntil === 0) {
    return {
      urgency: 'due-today',
      daysUntilFollowUp: 0,
      message: 'Follow-up is due today.',
      suggestedDate: now,
    }
  }
  if (daysUntil <= 2) {
    return {
      urgency: 'due-soon',
      daysUntilFollowUp: daysUntil,
      message: `Follow-up due in ${daysUntil} day${daysUntil === 1 ? '' : 's'}.`,
      suggestedDate: new Date(now.getTime() + daysUntil * 86400000),
    }
  }
  return {
    urgency: 'waiting',
    daysUntilFollowUp: daysUntil,
    message: `Next follow-up in ${daysUntil} days.`,
    suggestedDate: new Date(now.getTime() + daysUntil * 86400000),
  }
}

// ── Main evaluator function ────────────────────────────────────────────────────

export async function evaluateJob(
  userId: string,
  jobTitle: string,
  company: string,
  jobDescription: string
): Promise<JobEvaluation> {
  const prompt = buildEvalPrompt(jobTitle, company, jobDescription)

  const result = await openai.chatJson<JobEvaluation>([
    { role: 'user', content: prompt },
  ], 'gpt-4o-mini')

  await prisma.apiUsageLog.create({
    data: {
      userId,
      provider: 'openai',
      model: 'gpt-4o-mini',
      inputTokens: Math.floor(prompt.length / 4),
      outputTokens: 600,
      estimatedCost: estimateCost('gpt-4o-mini', Math.floor(prompt.length / 4), 600),
      action: 'job_evaluate',
    },
  })

  return result
}

// ── Interview prep generator — adapted from Career-Ops modes/interview-prep.md ─

export async function generateInterviewPrep(
  userId: string,
  jobTitle: string,
  company: string,
  jobDescription: string,
  evaluation?: JobEvaluation
): Promise<string> {
  const prompt = `Generate interview preparation notes for Osman Jalloh applying to:
Title: ${jobTitle}
Company: ${company}
${evaluation ? `Score: ${evaluation.score}/5 — ${evaluation.recommendation}` : ''}

Candidate profile:
${OSMAN_PROFILE}

Job description:
${jobDescription.slice(0, 2000)}

${evaluation?.gaps?.length ? `Known gaps to address: ${evaluation.gaps.join(', ')}` : ''}

Return a structured prep guide with these sections:
1. Role breakdown — what this role actually does day-to-day
2. Top 5 likely interview questions for this specific role + honest answer angles based on Osman's real experience
3. Technical questions to expect (if any) + what to study
4. Behavioral questions + which STAR stories from his background fit best (I-9 work, HR compliance, AI projects)
5. Questions to ask them (3-4 smart ones)
6. Red flags to watch for in this role
7. One thing to memorize before the interview

Be specific. Do not give generic advice. Base answers on his actual experience.`

  const result = await openai.chat([
    { role: 'user', content: prompt },
  ], 'gpt-4o-mini')

  await prisma.apiUsageLog.create({
    data: {
      userId,
      provider: 'openai',
      model: 'gpt-4o-mini',
      inputTokens: Math.floor(prompt.length / 4),
      outputTokens: 800,
      estimatedCost: estimateCost('gpt-4o-mini', Math.floor(prompt.length / 4), 800),
      action: 'interview_prep',
    },
  })

  return result.content
}

// ── Company research — adapted from Career-Ops modes/deep.md ─────────────────

export async function generateCompanyResearch(
  userId: string,
  company: string,
  jobTitle: string
): Promise<string> {
  const prompt = `Research ${company} for a candidate applying for ${jobTitle}.

Focus on these 6 areas (Career-Ops deep research framework):
1. What they actually do — products, clients, revenue model
2. Hiring signals — are they growing, recent layoffs, team size trends
3. Culture indicators — glassdoor signals, work-life balance, remote policy
4. Challenges — what problems does this company face right now
5. How ${jobTitle} fits their mission — why does this role exist
6. Alignment check — is this a good fit for someone in cybersecurity/GRC/IT support career path

Be direct. Flag any concerns honestly. Keep it under 400 words total.`

  const result = await openai.chat([
    { role: 'user', content: prompt },
  ], 'gpt-4o-mini')

  await prisma.apiUsageLog.create({
    data: {
      userId,
      provider: 'openai',
      model: 'gpt-4o-mini',
      inputTokens: Math.floor(prompt.length / 4),
      outputTokens: 500,
      estimatedCost: estimateCost('gpt-4o-mini', Math.floor(prompt.length / 4), 500),
      action: 'company_research',
    },
  })

  return result.content
}

// ── Daily job summary — adapted from Career-Ops analyze-patterns.mjs ─────────

export interface DailyJobSummary {
  topToReview: Array<{ id: string; title: string; company: string; score: number }>
  readyToApply: Array<{ id: string; title: string; company: string; score: number }>
  followUpsDue: Array<{ id: string; title: string; company: string; urgency: FollowUpUrgency; message: string }>
  interviewsUpcoming: Array<{ id: string; title: string; company: string; interviewDate: Date }>
  todayActions: string[]
  stats: {
    totalLeads: number
    applied: number
    inProgress: number
    skipped: number
    averageScore: number
  }
}

export async function getDailyJobSummary(userId: string): Promise<DailyJobSummary> {
  const leads = await prisma.jobLead.findMany({
    where: { userId },
    orderBy: [{ matchScore: 'desc' }, { createdAt: 'desc' }],
    take: 50,
  })

  const now = new Date()
  const sevenDaysOut = new Date(now.getTime() + 7 * 86400000)

  const topToReview = leads
    .filter(l => l.status === 'Found' && l.matchScore >= 60)
    .slice(0, 5)
    .map(l => ({ id: l.id, title: l.title, company: l.company, score: l.matchScore }))

  const readyToApply = leads
    .filter(l => l.status === 'Evaluated' && l.matchScore >= 70)
    .slice(0, 5)
    .map(l => ({ id: l.id, title: l.title, company: l.company, score: l.matchScore }))

  const followUpsDue = leads
    .filter(l => ['Applied', 'Screening', 'Interview'].includes(l.status))
    .map(l => {
      const fu = calculateFollowUpStatus(l.status, l.appliedAt, l.followUpDate, l.followUpCount)
      return { id: l.id, title: l.title, company: l.company, urgency: fu.urgency, message: fu.message }
    })
    .filter(l => ['overdue', 'due-today', 'due-soon'].includes(l.urgency))

  const interviewsUpcoming = leads
    .filter(l => l.interviewDate && l.interviewDate >= now && l.interviewDate <= sevenDaysOut)
    .map(l => ({ id: l.id, title: l.title, company: l.company, interviewDate: l.interviewDate! }))
    .sort((a, b) => a.interviewDate.getTime() - b.interviewDate.getTime())

  const todayActions: string[] = []
  if (followUpsDue.some(f => f.urgency === 'overdue')) todayActions.push(`Send overdue follow-up${followUpsDue.filter(f => f.urgency === 'overdue').length > 1 ? 's' : ''}`)
  if (topToReview.length > 0) todayActions.push(`Review ${topToReview.length} new lead${topToReview.length > 1 ? 's' : ''} waiting for evaluation`)
  if (readyToApply.length > 0) todayActions.push(`Apply to ${readyToApply.length} job${readyToApply.length > 1 ? 's' : ''} that scored 70+`)
  if (interviewsUpcoming.length > 0) todayActions.push(`Prep for ${interviewsUpcoming[0].company} interview`)
  if (todayActions.length === 0) todayActions.push('Add new job leads to the tracker')

  const appliedStatuses = ['Applied', 'Screening', 'Interview', 'Offer', 'Accepted']
  const inProgressStatuses = ['Evaluated', 'Applying']
  const skippedStatuses = ['Rejected', 'Skipped']

  const scores = leads.filter(l => l.matchScore > 0).map(l => l.matchScore)
  const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0

  return {
    topToReview,
    readyToApply,
    followUpsDue,
    interviewsUpcoming,
    todayActions: todayActions.slice(0, 3),
    stats: {
      totalLeads: leads.length,
      applied: leads.filter(l => appliedStatuses.includes(l.status)).length,
      inProgress: leads.filter(l => inProgressStatuses.includes(l.status)).length,
      skipped: leads.filter(l => skippedStatuses.includes(l.status)).length,
      averageScore,
    },
  }
}
