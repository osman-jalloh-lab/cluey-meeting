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
