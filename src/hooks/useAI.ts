import { useState } from 'react';
import type { Meeting } from '../types';

interface AIResult {
  summary: string;
  decisions: string[];
  actions: string[];
  commitments: string[];
  tags: string[];
}

export function useAI() {
  const [isProcessing, setIsProcessing] = useState(false);

  const summarize = async (
    rawNotes: string,
    who: string,
    projName: string,
    history: Meeting[]
  ): Promise<AIResult | null> => {
    setIsProcessing(true);
    try {
      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
      if (!apiKey) {
        console.warn('No Anthropic API key found in VITE_ANTHROPIC_API_KEY. Using fallback.');
        return fallbackResult(rawNotes);
      }

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

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerously-allow-browser': 'true'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          messages: [{ role: 'user', content: promptText }]
        })
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.statusText}`);
      }

      const data = await res.json();
      const content = data.content?.[0]?.text || '';
      const cleanContent = content.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanContent) as AIResult;
      
      return {
        summary: parsed.summary || rawNotes,
        decisions: parsed.decisions || [],
        actions: parsed.actions || [],
        commitments: parsed.commitments || [],
        tags: parsed.tags || []
      };

    } catch (err) {
      console.error('AI summarization failed, returning raw notes', err);
      return fallbackResult(rawNotes);
    } finally {
      setIsProcessing(false);
    }
  };

  const fallbackResult = (rawNotes: string): AIResult => ({
    summary: rawNotes,
    decisions: [],
    actions: [],
    commitments: [],
    tags: []
  });

  return { summarize, isProcessing };
}
