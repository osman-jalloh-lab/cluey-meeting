import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens, storeTokens } from '@/lib/google/oauth'
import { google } from 'googleapis'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/accounts?error=${error}`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/accounts?error=missing_params`)
  }

  try {
    const stateData = JSON.parse(Buffer.from(state, 'base64url').toString('utf-8'))
    const { userId, label, reconnectAccountId } = stateData

    const tokens = await exchangeCodeForTokens(code)

    // Resolve the actual Google email for this token
    const { createOAuthClient } = await import('@/lib/google/oauth')
    const oauth2Client = createOAuthClient()
    oauth2Client.setCredentials(tokens)
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
    const userInfo = await oauth2.userinfo.get()
    const emailAddress = userInfo.data.email!

    // storeTokens uses upsert on (userId, emailAddress), so reconnecting
    // the same Google account will always update — never create a duplicate.
    // The label is preserved from the state (passed by the Reconnect button).
    await storeTokens(userId, emailAddress, label, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
      scope: tokens.scope,
    })

    const successParam = reconnectAccountId ? 'reconnected' : 'connected'
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/accounts?success=${successParam}`)
  } catch (err) {
    console.error('OAuth callback error:', err)
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/accounts?error=callback_failed`)
  }
}
