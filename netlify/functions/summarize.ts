// Serverless proxy — keeps GROQ_API_KEY on the server, never in the browser bundle.
// Set GROQ_API_KEY in Netlify → Site settings → Environment variables.
// Free tier: https://console.groq.com (6,000 req/day, no credit card required)

// OWASP A04 / A08 — enforce a hard cap on prompt size to prevent abuse and
// prompt-injection payloads that try to exhaust quota or exfiltrate data.
const MAX_PROMPT_BYTES = 8_000;

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export const handler = async (event: any) => {
  // A05 — only allow POST; return minimal info on other methods
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    // A09 — log server-side but return a generic message to the client
    console.error('[summarize] GROQ_API_KEY is not set');
    return {
      statusCode: 503,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: 'AI service is not available.' })
    };
  }

  // A03 — enforce content-type to prevent unexpected payload formats
  const contentType = (event.headers?.['content-type'] || '').toLowerCase();
  if (!contentType.includes('application/json')) {
    return {
      statusCode: 415,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: 'Content-Type must be application/json' })
    };
  }

  let body: { prompt: string };
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: 'Invalid JSON body' })
    };
  }

  if (!body.prompt || typeof body.prompt !== 'string') {
    return {
      statusCode: 400,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: 'Missing or invalid prompt field' })
    };
  }

  // A04 / A08 — reject oversized payloads to limit abuse
  if (Buffer.byteLength(body.prompt, 'utf8') > MAX_PROMPT_BYTES) {
    return {
      statusCode: 413,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: 'Prompt exceeds maximum allowed size' })
    };
  }

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 1000,
        messages: [{ role: 'user', content: body.prompt }]
      })
    });

    const data = await groqRes.json();

    if (!groqRes.ok) {
      // A09 — log upstream errors server-side; send a generic message to the client
      console.error('[summarize] Groq API error', groqRes.status);
      return {
        statusCode: 502,
        headers: JSON_HEADERS,
        body: JSON.stringify({ error: 'AI service returned an error.' })
      };
    }

    return {
      statusCode: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify(data)
    };
  } catch (err) {
    console.error('[summarize] fetch failed:', err);
    return {
      statusCode: 502,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: 'Failed to reach AI service.' })
    };
  }
};
