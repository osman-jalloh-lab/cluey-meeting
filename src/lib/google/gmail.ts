import { google, gmail_v1 } from 'googleapis'
import { getAuthenticatedClient } from './oauth'

export async function getGmailClient(connectedAccountId: string) {
  const auth = await getAuthenticatedClient(connectedAccountId)
  return google.gmail({ version: 'v1', auth })
}

export interface EmailMessage {
  id: string
  threadId: string
  from: string
  to: string
  subject: string
  snippet: string
  bodyText: string
  receivedAt: Date
  isUnread: boolean
  isImportant: boolean
  hasAttachment: boolean
}

function extractHeader(headers: Array<{ name?: string | null; value?: string | null }>, name: string): string {
  return headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value ?? ''
}

function decodeBody(data?: string): string {
  if (!data) return ''
  return Buffer.from(data, 'base64url').toString('utf-8')
}

function extractTextBody(payload: gmail_v1.Schema$MessagePart | null | undefined): string {
  if (!payload) return ''

  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBody(payload.body.data)
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      const text = extractTextBody(part)
      if (text) return text
    }
  }

  return ''
}

export async function fetchRecentEmails(
  connectedAccountId: string,
  maxResults = 20
): Promise<EmailMessage[]> {
  const gmail = await getGmailClient(connectedAccountId)

  const listResponse = await gmail.users.messages.list({
    userId: 'me',
    maxResults,
    q: 'in:inbox',
  })

  const messages = listResponse.data.messages ?? []

  const emailPromises = messages.map(async (msg) => {
    if (!msg.id) return null

    try {
      const msgResponse = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full',
      })

      const data = msgResponse.data
      const headers = data.payload?.headers ?? []

      return {
        id: data.id!,
        threadId: data.threadId!,
        from: extractHeader(headers, 'from'),
        to: extractHeader(headers, 'to'),
        subject: extractHeader(headers, 'subject'),
        snippet: data.snippet ?? '',
        bodyText: extractTextBody(data.payload).slice(0, 2000),
        receivedAt: new Date(parseInt(data.internalDate ?? '0')),
        isUnread: data.labelIds?.includes('UNREAD') ?? false,
        isImportant: data.labelIds?.includes('IMPORTANT') ?? false,
        hasAttachment: data.payload?.parts?.some(p => p.filename) ?? false,
      } satisfies EmailMessage
    } catch {
      return null
    }
  })

  const results = await Promise.all(emailPromises)
  return results.filter((e): e is EmailMessage => e !== null)
}

export async function fetchUnreadCount(connectedAccountId: string): Promise<number> {
  const gmail = await getGmailClient(connectedAccountId)

  const response = await gmail.users.labels.get({
    userId: 'me',
    id: 'INBOX',
  })

  return response.data.messagesUnread ?? 0
}

export async function createDraft(
  connectedAccountId: string,
  to: string,
  subject: string,
  body: string
): Promise<string> {
  const gmail = await getGmailClient(connectedAccountId)

  const message = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    '',
    body,
  ].join('\n')

  const encodedMessage = Buffer.from(message).toString('base64url')

  const response = await gmail.users.drafts.create({
    userId: 'me',
    requestBody: {
      message: { raw: encodedMessage },
    },
  })

  return response.data.id ?? ''
}

export async function sendEmail(
  connectedAccountId: string,
  to: string,
  subject: string,
  body: string
): Promise<void> {
  const gmail = await getGmailClient(connectedAccountId)

  const message = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    '',
    body,
  ].join('\n')

  const encodedMessage = Buffer.from(message).toString('base64url')

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: encodedMessage },
  })
}
