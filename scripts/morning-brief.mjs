/**
 * PARAWI Morning Brief
 * Runs at 8 AM via Windows Task Scheduler.
 * Fetches Gmail → Claude analyzes → Claude searches jobs + cyber news → HTML brief opens in browser.
 */

import { createClient } from '@libsql/client'
import { google } from 'googleapis'
import Anthropic from '@anthropic-ai/sdk'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { exec } from 'node:child_process'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

dotenv.config({ path: path.join(ROOT, '.env.local') })

// ── Crypto (mirrors src/lib/crypto.ts) ───────────────────────────────────────

function getKey() {
  const keyHex = process.env.ENCRYPTION_KEY
  if (!keyHex) throw new Error('ENCRYPTION_KEY not set in .env.local')
  const key = Buffer.from(keyHex, 'hex')
  if (key.length !== 32) return Buffer.from(keyHex.padEnd(32, '0').slice(0, 32))
  return key
}

function decrypt(encryptedText) {
  const key = getKey()
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':')
  if (!ivHex || !authTagHex || !encrypted) throw new Error('Invalid token format')
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)
  return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8')
}

// ── Database ──────────────────────────────────────────────────────────────────

async function getConnectedAccounts() {
  const db = createClient({ url: `file:${path.join(ROOT, 'dev.db')}` })
  try {
    const result = await db.execute(`
      SELECT id, emailAddress, accessTokenEncrypted, refreshTokenEncrypted, tokenExpiresAt
      FROM ConnectedAccount
      WHERE accessTokenEncrypted IS NOT NULL
    `)
    return result.rows
  } finally {
    db.close()
  }
}

// ── Gmail ─────────────────────────────────────────────────────────────────────

function extractBody(payload) {
  if (!payload) return ''
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64url').toString('utf-8')
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      const text = extractBody(part)
      if (text) return text
    }
  }
  return ''
}

async function fetchEmailsForAccount(account) {
  try {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/accounts/callback/google`
    )
    auth.setCredentials({
      access_token: decrypt(account.accessTokenEncrypted),
      refresh_token: account.refreshTokenEncrypted ? decrypt(account.refreshTokenEncrypted) : undefined,
      expiry_date: account.tokenExpiresAt ? Number(account.tokenExpiresAt) : undefined,
    })

    const gmail = google.gmail({ version: 'v1', auth })
    const since = Math.floor((Date.now() - 48 * 60 * 60 * 1000) / 1000)

    const list = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 30,
      q: `in:inbox after:${since}`,
    })

    const messages = list.data.messages || []
    const emails = []

    for (const msg of messages.slice(0, 20)) {
      try {
        const { data } = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full',
        })
        const headers = data.payload?.headers || []
        const h = (name) => headers.find(x => x.name?.toLowerCase() === name)?.value || ''

        emails.push({
          account: account.emailAddress,
          from: h('from'),
          subject: h('subject'),
          date: h('date'),
          snippet: data.snippet || '',
          body: extractBody(data.payload).slice(0, 1200),
          isUnread: data.labelIds?.includes('UNREAD') || false,
          isImportant: data.labelIds?.includes('IMPORTANT') || false,
        })
      } catch { /* skip individual failed messages */ }
    }

    return emails
  } catch (err) {
    console.warn(`  ⚠ Could not fetch emails for ${account.emailAddress}: ${err.message}`)
    return []
  }
}

// ── Claude (with web_search tool loop) ───────────────────────────────────────

async function callClaude(anthropic, systemPrompt, userPrompt, useWebSearch = false) {
  const tools = useWebSearch ? [{ type: 'web_search_20250305', name: 'web_search' }] : undefined
  const messages = [{ role: 'user', content: userPrompt }]
  let fullText = ''

  for (let turn = 0; turn < 20; turn++) {
    const params = {
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      system: systemPrompt,
      messages,
    }
    if (tools) params.tools = tools

    const response = await anthropic.messages.create(params)

    for (const block of response.content) {
      if (block.type === 'text') fullText += block.text
    }

    if (response.stop_reason === 'end_turn') break

    if (response.stop_reason === 'tool_use') {
      messages.push({ role: 'assistant', content: response.content })
      const toolResults = response.content
        .filter(b => b.type === 'tool_use')
        .map(b => ({ type: 'tool_result', tool_use_id: b.id, content: '' }))
      if (toolResults.length > 0) {
        messages.push({ role: 'user', content: toolResults })
      }
    } else {
      break
    }
  }

  return fullText
}

// ── Prompt builders ───────────────────────────────────────────────────────────

const SYSTEM_BASE = `You are Osman's personal morning action assistant. Be selective, direct, and practical. Never overwhelm. Only surface what genuinely matters.

Osman's background:
- Studying cybersecurity, IT, and network administration
- HR/I-9 compliance specialist at Austin Community College (Workday, E-Verify, onboarding, ticketing, documentation)
- Target roles: SOC Analyst, GRC Analyst, IT Support, Help Desk, HRIS Analyst, Workday Support, IAM, Cybersecurity Analyst, AI automation, entry-level/internships
- CompTIA Security+ and CySA+ background
- Open to CPT/OPT-eligible roles, Austin TX area or remote preferred`

function buildEmailPrompt(emails) {
  if (emails.length === 0) {
    return `No new emails fetched (accounts may not be connected yet — visit http://localhost:3000/accounts to connect Gmail).

Produce the following:

## SECTION 1 — URGENT EMAILS
No emails available. Note that Gmail accounts need to be connected at http://localhost:3000/accounts.

## SECTION 2 — SUGGESTED REPLIES
No replies needed.

## SECTION 3 — TODAY'S PRIORITIES
Based on Osman's background, suggest 5 practical priorities for today.

Top priorities today:
1.
2.
3.
4.
5.`
  }

  const emailDump = emails.map((e, i) => `
--- Email ${i + 1} ---
Account: ${e.account}
From: ${e.from}
Subject: ${e.subject}
Date: ${e.date}
Flagged important: ${e.isImportant} | Unread: ${e.isUnread}
Snippet: ${e.snippet}
Body: ${e.body}
`).join('\n')

  return `Here are Osman's recent emails from the past 48 hours across all connected Gmail accounts.

${emailDump}

Analyze them and produce exactly these sections:

## SECTION 1 — URGENT EMAILS

Scan ALL emails above. Surface ONLY those that are urgent, time-sensitive, work-related, school-related, job-related, immigration-related, money/billing-related, or require a reply. Skip newsletters, promotions, social notifications, and low-value updates unless genuinely useful.

For each important email use EXACTLY this format:

Email:
From:
Subject:
Why it matters:
Summary:
Deadline:
Action needed:
Suggested reply:

If no emails are urgent, say so clearly.

## SECTION 2 — SUGGESTED REPLIES

For every email from Section 1 that needs a response, write a ready-to-send reply:
- Polite, professional, clear, short, human-sounding
- Easy to copy and paste
- Add ⚠️ Review carefully before sending — if the email is legal, immigration, HR, financial, or sensitive

## SECTION 3 — TODAY'S PRIORITIES

Based on emails and Osman's background, give his top 5 priorities for today:

Top priorities today:
1.
2.
3.
4.
5.`
}

const SEARCH_PROMPT = `Search the web right now and produce Sections 4 through 7 of Osman's morning brief.

## SECTION 4 — JOB SEARCH UPDATE

Search LinkedIn, Indeed, Glassdoor, Handshake, USAJobs, and company career pages for jobs posted in the last 7 days. Find 3–5 strong matches for Osman. Focus on:
- IT Support / Help Desk
- SOC Analyst / Security Operations
- Cybersecurity Analyst / GRC Analyst
- HRIS Analyst / Workday Support
- Identity and Access Management
- Technical Support
- AI Assistant / Automation roles
- Entry-level or internships (note if CPT/OPT eligible)

For each strong match use EXACTLY this format:

Job:
Company:
Location:
Work type:
Pay:
Why it matches:
Missing skills or concerns:
Priority:
Recommended action:

Only list roles where Osman is a genuine fit. Mark anything requiring his decision as "Needs your approval."

## SECTION 5 — APPLICATION MATERIALS

For each HIGH priority job above, generate a full application package:

1. Resume headline
2. Professional summary (3–4 sentences, tailored to THIS job and company)
3. 5 tailored resume bullets (achievement-focused, ATS-optimized, use his real experience: Workday, E-Verify, I-9, onboarding, compliance, ticketing, documentation, IT support)
4. Cover letter draft (specific to job and company — not generic)
5. Short recruiter/LinkedIn message
6. ATS keywords to include

Make everything specific. No filler.

## SECTION 6 — CYBERSECURITY WORLD UPDATE

Search for today's most relevant cybersecurity news. Focus on:
- New CVEs / active exploits
- Attack campaigns or threat actor activity
- Microsoft, Azure, Google, Linux, Windows security updates
- AI security developments
- Cloud security
- SOC and threat intelligence
- Tools or resources useful for students / junior analysts
- Free certifications or learning resources

Give 4–6 items in EXACTLY this format:

What happened:
Why it matters:
Who is affected:
What Osman should learn or do:
Source:

## SECTION 7 — FINAL DAILY ACTION PLAN

Today, focus on:
1.
2.
3.

Emails to reply to:
1.
2.

Jobs to review or apply to:
1.
2.

Cybersecurity topic to learn today:
1.`

// ── HTML generation ───────────────────────────────────────────────────────────

function renderContent(text) {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  return escaped
    .replace(/^## (.+)$/gm, '</div><div class="brief-section"><h2>$1</h2><div class="inner">')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^(Email|From|Subject|Why it matters|Summary|Deadline|Action needed|Suggested reply|Job|Company|Location|Work type|Pay|Why it matches|Missing skills[^:]*|Priority|Recommended action|What happened|Who is affected|What Osman[^:]*|Source):/gm, '<span class="lbl">$1:</span>')
    .replace(/⚠️([^\n]+)/g, '<span class="warn">⚠️$1</span>')
    .replace(/Needs your approval/g, '<span class="approval">⚡ Needs your approval</span>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
}

function buildHTML(date, emailContent, searchContent) {
  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })
  const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  const emailHTML = renderContent(emailContent)
  const searchHTML = renderContent(searchContent)

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Morning Brief · ${dateStr}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    background: #0c0f18;
    color: #cbd5e1;
    line-height: 1.75;
    font-size: 15px;
  }

  /* ── Header ── */
  .header {
    background: linear-gradient(135deg, #111827 0%, #0c0f18 60%);
    border-bottom: 1px solid #1e2d40;
    padding: 2rem 2.5rem;
    position: sticky;
    top: 0;
    z-index: 10;
  }
  .header-inner { max-width: 960px; margin: 0 auto; }
  .pill { display: inline-block; background: #0f2942; color: #3b82f6; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 3px 10px; border-radius: 20px; margin-bottom: 0.5rem; }
  .header h1 { font-size: 1.65rem; font-weight: 700; color: #f1f5f9; letter-spacing: -0.4px; }
  .header .meta { color: #475569; font-size: 0.85rem; margin-top: 0.25rem; }

  /* ── Layout ── */
  .container { max-width: 960px; margin: 0 auto; padding: 2rem 1.5rem 4rem; }

  /* ── Cards ── */
  .card {
    background: #111827;
    border: 1px solid #1e2d40;
    border-radius: 14px;
    padding: 0;
    margin-bottom: 1.5rem;
    overflow: hidden;
  }
  .card-header {
    background: #0f1d2e;
    border-bottom: 1px solid #1e2d40;
    padding: 1rem 1.5rem;
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }
  .card-header h2 {
    font-size: 0.95rem;
    font-weight: 600;
    color: #60a5fa;
    letter-spacing: 0.01em;
  }
  .card-body { padding: 1.5rem; }

  /* ── Section content from Claude ── */
  .brief-section { margin-bottom: 1.5rem; }
  .brief-section h2 {
    font-size: 1rem;
    font-weight: 600;
    color: #93c5fd;
    margin: 1.5rem 0 0.6rem;
    padding-top: 1rem;
    border-top: 1px solid #1e2d40;
  }
  .brief-section h2:first-child { border-top: none; margin-top: 0; padding-top: 0; }
  .brief-section h3 { font-size: 0.9rem; color: #64748b; margin: 0.8rem 0 0.3rem; }
  .inner p { margin-bottom: 0.6rem; }

  .lbl { color: #3b82f6; font-weight: 600; }
  .warn { color: #f59e0b; font-weight: 600; display: block; margin: 0.4rem 0; padding: 0.5rem 0.8rem; background: rgba(245,158,11,0.08); border-left: 3px solid #f59e0b; border-radius: 4px; }
  .approval { display: inline-block; color: #f97316; font-weight: 700; background: rgba(249,115,22,0.1); padding: 1px 8px; border-radius: 4px; font-size: 0.85rem; }

  strong { color: #e2e8f0; }

  /* ── Footer ── */
  .footer { text-align: center; color: #334155; font-size: 0.8rem; padding-top: 2rem; }
</style>
</head>
<body>

<div class="header">
  <div class="header-inner">
    <div class="pill">PARAWI · Morning Brief</div>
    <h1>Good morning, Osman</h1>
    <div class="meta">${dateStr} &nbsp;·&nbsp; Generated at ${timeStr}</div>
  </div>
</div>

<div class="container">

  <div class="card">
    <div class="card-header">
      <h2>📧 &nbsp;Email Analysis &amp; Daily Priorities</h2>
    </div>
    <div class="card-body">
      <div class="brief-section"><div class="inner"><p>${emailHTML}</p></div></div>
    </div>
  </div>

  <div class="card">
    <div class="card-header">
      <h2>🔍 &nbsp;Jobs · Cybersecurity News · Action Plan</h2>
    </div>
    <div class="card-body">
      <div class="brief-section"><div class="inner"><p>${searchHTML}</p></div></div>
    </div>
  </div>

  <div class="footer">Generated by PARAWI Command Center &nbsp;·&nbsp; Do not apply to jobs or send emails without your approval.</div>
</div>

</body>
</html>`
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const now = new Date()
  console.log(`\n🌅  PARAWI Morning Brief — ${now.toLocaleDateString()}`)
  console.log('─'.repeat(50))

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌  ANTHROPIC_API_KEY not set in .env.local')
    process.exit(1)
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  // ── Step 1: Fetch emails ──
  console.log('\n📬  Fetching emails...')
  let emails = []
  try {
    const accounts = await getConnectedAccounts()
    console.log(`    Found ${accounts.length} connected account(s)`)
    for (const account of accounts) {
      const batch = await fetchEmailsForAccount(account)
      emails = emails.concat(batch)
      console.log(`    ${account.emailAddress}: ${batch.length} emails`)
    }
  } catch (err) {
    console.warn(`    ⚠ DB error: ${err.message}`)
  }

  // ── Step 2: Analyze emails ──
  console.log('\n🤖  Analyzing emails with Claude...')
  let emailSection = ''
  try {
    emailSection = await callClaude(anthropic, SYSTEM_BASE, buildEmailPrompt(emails), false)
  } catch (err) {
    console.error('    ❌ Email analysis failed:', err.message)
    emailSection = '## Email Analysis\nFailed to analyze emails. Check API key and try again.'
  }

  // ── Step 3: Job search + cybersecurity news ──
  console.log('\n🔍  Searching jobs and cybersecurity news...')
  let searchSection = ''
  try {
    searchSection = await callClaude(anthropic, SYSTEM_BASE, SEARCH_PROMPT, true)
  } catch (err) {
    console.warn('    ⚠ Web search failed, retrying without search tool...')
    try {
      searchSection = await callClaude(anthropic, SYSTEM_BASE, SEARCH_PROMPT, false)
    } catch (err2) {
      console.error('    ❌ Search section failed:', err2.message)
      searchSection = '## Job Search\nFailed to run job search. Check API key and try again.'
    }
  }

  // ── Step 4: Save HTML ──
  const briefsDir = path.join(ROOT, 'scripts', 'briefs')
  if (!fs.existsSync(briefsDir)) fs.mkdirSync(briefsDir, { recursive: true })

  const filename = `${now.toISOString().split('T')[0]}.html`
  const outputPath = path.join(briefsDir, filename)
  fs.writeFileSync(outputPath, buildHTML(now, emailSection, searchSection), 'utf8')
  console.log(`\n✅  Brief saved: ${outputPath}`)

  // ── Step 5: Open in browser ──
  exec(`start "" "${outputPath}"`, (err) => {
    if (err) {
      console.warn('    Could not open browser automatically.')
      console.log(`    Open manually: ${outputPath}`)
    } else {
      console.log('🌐  Opening in browser...\n')
    }
  })
}

main().catch(err => {
  console.error('\n❌  Fatal error:', err.message)
  process.exit(1)
})
