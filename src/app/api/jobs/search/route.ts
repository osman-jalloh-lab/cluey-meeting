import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import * as openai from '@/lib/ai/openai'
import { PERSONAL_CONTEXT } from '@/lib/context/personal'
import { z } from 'zod'

const Schema = z.object({
  query: z.string().min(1).max(200).optional(),
  location: z.string().optional(),
})

const SYSTEM = `You are a job search assistant with access to current job market data for Austin, TX.
The user's profile is below — match jobs to their background and goals.

${PERSONAL_CONTEXT}

Return a JSON array of 6 jobs matching the user's profile. Each job must have:
{
  "id": "unique string",
  "title": "Job Title",
  "company": "Company Name",
  "location": "City, State or Remote",
  "type": "Full-time | Part-time | Contract | Internship",
  "salary": "$X - $Y/year or $X/hr",
  "posted": "X days ago or today",
  "relevance": "high | medium",
  "match": "One sentence on why this fits the user's profile",
  "url": "https://www.indeed.com/jobs?q=...",
  "source": "Indeed | LinkedIn | ZipRecruiter | Handshake | Texas.gov"
}
Return ONLY the raw JSON array. No markdown, no extra text.`

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const parsed = Schema.safeParse(body)
  const query = parsed.success && parsed.data.query ? parsed.data.query : 'cybersecurity GRC compliance IT Austin TX'

  try {
    const result = await openai.chat([
      { role: 'system', content: SYSTEM },
      { role: 'user', content: `Search for jobs matching: ${query}. Focus on roles in Austin TX or remote that fit my background in cybersecurity, GRC, IT, and HR compliance. Include real companies actively hiring in 2026.` },
    ], 'gpt-4o')

    let jobs
    try {
      const text = result.content.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '')
      jobs = JSON.parse(text)
    } catch {
      return NextResponse.json({ error: 'Failed to parse job results' }, { status: 500 })
    }

    return NextResponse.json({ jobs, query, timestamp: new Date().toISOString() })
  } catch (error) {
    console.error('Jobs search error:', error)
    return NextResponse.json({ error: 'Job search failed' }, { status: 500 })
  }
}
