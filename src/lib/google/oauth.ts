import { google } from 'googleapis'
import { encrypt, decrypt } from '@/lib/crypto'
import { prisma } from '@/lib/db'

// Full scope set — includes Gmail + Calendar read/write + identity
export const FULL_GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
  'https://www.googleapis.com/auth/calendar.events.readonly',
  'https://www.googleapis.com/auth/calendar.events',
]

// Detect whether a stored scope string includes Calendar access
export function hasCalendarScope(scopes: string | null | undefined): boolean {
  if (!scopes) return false
  return scopes.includes('calendar')
}

// Detect whether a stored scope string includes Gmail access
export function hasGmailScope(scopes: string | null | undefined): boolean {
  if (!scopes) return false
  return scopes.includes('gmail') || scopes.includes('mail')
}

export function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    `${process.env.NEXTAUTH_URL}/api/accounts/callback/google`
  )
}

// Used when connecting a new account
export function getGmailAuthUrl(state: string): string {
  const oauth2Client = createOAuthClient()

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: FULL_GOOGLE_SCOPES,
    state,
  })
}

// Used when reconnecting an existing account to grant new scopes
// Forces the consent screen so Google re-issues a refresh token with new scopes
export function getReconnectAuthUrl(state: string): string {
  const oauth2Client = createOAuthClient()

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',        // Always force — needed to get calendar scopes added
    include_granted_scopes: false, // Request full scope set, not incremental
    scope: FULL_GOOGLE_SCOPES,
    state,
  })
}

export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = createOAuthClient()
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}

export async function getAuthenticatedClient(connectedAccountId: string) {
  const account = await prisma.connectedAccount.findUnique({
    where: { id: connectedAccountId },
  })

  if (!account) throw new Error('Connected account not found')
  if (!account.accessTokenEncrypted) throw new Error('No access token found')

  const oauth2Client = createOAuthClient()

  const accessToken = decrypt(account.accessTokenEncrypted)
  const refreshToken = account.refreshTokenEncrypted
    ? decrypt(account.refreshTokenEncrypted)
    : undefined

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: account.tokenExpiresAt?.getTime(),
  })

  // Auto-refresh and persist new token
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      await prisma.connectedAccount.update({
        where: { id: connectedAccountId },
        data: {
          accessTokenEncrypted: encrypt(tokens.access_token),
          tokenExpiresAt: tokens.expiry_date
            ? new Date(tokens.expiry_date)
            : undefined,
        },
      })
    }
  })

  return oauth2Client
}

export async function storeTokens(
  userId: string,
  emailAddress: string,
  accountLabel: string,
  tokens: {
    access_token?: string | null
    refresh_token?: string | null
    expiry_date?: number | null
    scope?: string | null
  }
) {
  return prisma.connectedAccount.upsert({
    where: { userId_emailAddress: { userId, emailAddress } },
    create: {
      userId,
      emailAddress,
      accountLabel,
      accessTokenEncrypted: tokens.access_token ? encrypt(tokens.access_token) : null,
      refreshTokenEncrypted: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
      tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      scopes: tokens.scope,
    },
    update: {
      accessTokenEncrypted: tokens.access_token ? encrypt(tokens.access_token) : undefined,
      // Only update refresh token if a new one was issued (Google only re-issues on consent)
      ...(tokens.refresh_token
        ? { refreshTokenEncrypted: encrypt(tokens.refresh_token) }
        : {}),
      tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      scopes: tokens.scope,
      accountLabel,
    },
  })
}
