import { useState } from 'react';
import type { Meeting } from '../types';

export interface AIResult {
  summary: string;
  decisions: string[];
  actions: string[];
  commitments: string[];
  tags: string[];
  aiSucceeded: boolean;
}

export function useAI() {
  const [isProcessing, setIsProcessing] = useState(false);

  const summarize = async (
    rawNotes: string,
    who: string,
    projName: string,
    history: Meeting[]
  ): Promise<AIResult> => {
    setIsProcessing(true);
    try {
      const histContent = history.length
        ? `Previous meetings:\n${history.map(m => `- ${m.createdAt}: ${m.summary}`).join('\n')}`
        : '';

      const promptText = `Analyze these meeting notes. Respond ONLY with valid JSON, no markdown formatting or fences.
Meeting with: ${who}
Project: ${projName || 'none'}
${histContent}
Notes: """${rawNotes}"""
Structure your JSON exactly like this:
{
  "summary": "2-3 sentence engaging summary",
  "decisions": ["decision 1", "decision 2"],
  "actions": ["action item 1", "action item 2"],
  "commitments": ["commitment or follow up with date 1", "commitment 2"],
  "tags": ["topic1", "topic2"]
}`;

      // Always route through the serverless proxy — the API key must never be
      // bundled into the browser. For local dev, run `netlify dev` which starts
      // both the Vite dev server and the Netlify functions proxy on one port.
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText })
      });

      if (!res.ok) {
        throw new Error(`API error ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      // Groq uses OpenAI response format: choices[0].message.content
      const content = data.choices?.[0]?.message?.content || '';
      const cleanContent = content.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanContent) as Omit<AIResult, 'aiSucceeded'>;

      return {
        summary: parsed.summary || rawNotes,
        decisions: parsed.decisions || [],
        actions: parsed.actions || [],
        commitments: parsed.commitments || [],
        tags: parsed.tags || [],
        aiSucceeded: true
      };
    } catch (err) {
      console.error('AI summarization failed:', err);
      return {
        summary: rawNotes,
        decisions: [],
        actions: [],
        commitments: [],
        tags: [],
        aiSucceeded: false
      };
    } finally {
      setIsProcessing(false);
    }
  };

  return { summarize, isProcessing };
}
