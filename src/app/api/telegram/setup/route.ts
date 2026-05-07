import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { setWebhook, getWebhookInfo, deleteWebhook } from '@/lib/telegram'

// POST /api/telegram/setup
// Body: { url: "https://your-ngrok-url.ngrok-free.app" }
// Registers the webhook with Telegram so messages route to your app.
// Must be called once after starting ngrok or after deploying to Vercel.
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const baseUrl: string = body.url ?? process.env.NEXTAUTH_URL ?? ''

  if (!baseUrl) {
    return NextResponse.json({
      error: 'Provide a base URL. Example: { "url": "https://abc123.ngrok-free.app" }',
    }, { status: 400 })
  }

  const webhookUrl = `${baseUrl.replace(/\/$/, '')}/api/telegram/webhook`
  const result = await setWebhook(webhookUrl)

  return NextResponse.json({
    registered: result?.ok === true,
    webhookUrl,
    telegram: result,
  })
}

// GET /api/telegram/setup
// Returns current webhook info — use to verify it's pointing at the right URL.
export async function GET(): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const info = await getWebhookInfo()
  return NextResponse.json(info)
}

// DELETE /api/telegram/setup
// Removes the webhook — reverts to polling mode.
export async function DELETE(): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await deleteWebhook()
  return NextResponse.json({ ok: true, message: 'Webhook removed.' })
}
