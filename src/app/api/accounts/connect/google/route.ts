import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getGmailAuthUrl, getReconnectAuthUrl } from '@/lib/google/oauth'
import { z } from 'zod'

const Schema = z.object({
  accountLabel: z.string().min(1).max(50).default('Personal'),
  // If set, this is a reconnect — update existing account instead of creating new
  reconnectAccountId: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = Schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { accountLabel, reconnectAccountId } = parsed.data

  const state = Buffer.from(
    JSON.stringify({
      userId: session.user.id,
      label: accountLabel,
      reconnectAccountId: reconnectAccountId ?? null,
    })
  ).toString('base64url')

  // Use consent-forced URL for reconnects so new scopes are granted
  const authUrl = reconnectAccountId
    ? getReconnectAuthUrl(state)
    : getGmailAuthUrl(state)

  return NextResponse.json({ authUrl })
}
