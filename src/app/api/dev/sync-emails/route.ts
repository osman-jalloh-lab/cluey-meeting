/**
 * DEV-ONLY email sync endpoint.
 * Accepts email data fetched via Claude MCP and stores it in the database.
 * Remove this route before deploying to production.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const EmailSchema = z.object({
  gmailMessageId: z.string(),
  threadId: z.string().optional(),
  from: z.string(),
  to: z.string().optional(),
  subject: z.string().optional(),
  snippet: z.string().optional(),
  receivedAt: z.string().optional(),
  isUnread: z.boolean().default(true),
  isImportant: z.boolean().default(false),
  hasAttachment: z.boolean().default(false),
})

const SyncSchema = z.object({
  accountEmail: z.string().email(),
  accountLabel: z.string().default('Personal'),
  emails: z.array(EmailSchema),
})

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = SyncSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 })
  }

  const { accountEmail, accountLabel, emails } = parsed.data

  // Find the user
  const user = await prisma.user.findUnique({ where: { email: 'osman.jalloh@g.austincc.edu' } })
  if (!user) {
    return NextResponse.json({ error: 'User not found. Call /api/dev/login first.' }, { status: 404 })
  }

  // Upsert connected account (MCP mode — no OAuth tokens)
  const account = await prisma.connectedAccount.upsert({
    where: { userId_emailAddress: { userId: user.id, emailAddress: accountEmail } },
    create: {
      userId: user.id,
      emailAddress: accountEmail,
      accountLabel,
      isActive: true,
      scopes: 'mcp',
    },
    update: { accountLabel, isActive: true },
  })

  // Upsert emails
  let synced = 0
  for (const email of emails) {
    await prisma.emailCache.upsert({
      where: {
        connectedAccountId_gmailMessageId: {
          connectedAccountId: account.id,
          gmailMessageId: email.gmailMessageId,
        },
      },
      create: {
        userId: user.id,
        connectedAccountId: account.id,
        gmailMessageId: email.gmailMessageId,
        threadId: email.threadId,
        from: email.from,
        to: email.to,
        subject: email.subject,
        snippet: email.snippet,
        receivedAt: email.receivedAt ? new Date(email.receivedAt) : null,
        isUnread: email.isUnread,
        isImportant: email.isImportant,
        hasAttachment: email.hasAttachment,
      },
      update: {
        isUnread: email.isUnread,
        snippet: email.snippet,
      },
    })
    synced++
  }

  return NextResponse.json({ success: true, synced, accountId: account.id })
}
