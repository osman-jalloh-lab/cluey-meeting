// Telegram Bot — personal AI partner
// Handles both outbound notifications and inbound message processing via webhook

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const CHAT_ID = process.env.TELEGRAM_CHAT_ID

const API = BOT_TOKEN ? `https://api.telegram.org/bot${BOT_TOKEN}` : null

// ── Core send ─────────────────────────────────────────────────────────────────

async function callApi(method: string, body: object): Promise<any> {
  if (!API) return null
  try {
    const res = await fetch(`${API}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return res.json()
  } catch {
    return null
  }
}

// Send plain text to Osman's chat
async function send(text: string, extra: object = {}): Promise<any> {
  if (!API || !CHAT_ID) return null
  return callApi('sendMessage', {
    chat_id: CHAT_ID,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...extra,
  })
}

// Send to a specific chat_id (used in webhook responses)
export async function sendTo(chatId: string | number, text: string, extra: object = {}): Promise<any> {
  if (!API) return null
  return callApi('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...extra,
  })
}

// Show "typing..." indicator in the chat
export async function sendTyping(chatId: string | number): Promise<void> {
  await callApi('sendChatAction', { chat_id: chatId, action: 'typing' })
}

// Send message with inline approval buttons
export async function sendWithApprovalButtons(
  chatId: string | number,
  text: string,
  taskId: string,
  actions: Array<{ label: string; callbackData: string }> = []
): Promise<any> {
  const defaultActions = [
    { label: '✅ Approve', callbackData: `approve_${taskId}` },
    { label: '✏️ Edit', callbackData: `edit_${taskId}` },
    { label: '❌ Ignore', callbackData: `ignore_${taskId}` },
    { label: '⏰ Remind Later', callbackData: `remind_${taskId}` },
  ]

  const buttons = actions.length > 0 ? actions : defaultActions

  return callApi('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [buttons.map(a => ({ text: a.label, callback_data: a.callbackData }))],
    },
  })
}

// Send message with simple confirm/ignore buttons
export async function sendWithConfirmButtons(
  chatId: string | number,
  text: string,
  taskId: string,
  confirmLabel = '✅ Do it',
  ignoreLabel = '❌ Skip'
): Promise<any> {
  return callApi('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [[
        { text: confirmLabel, callback_data: `approve_${taskId}` },
        { text: ignoreLabel, callback_data: `ignore_${taskId}` },
      ]],
    },
  })
}

// Edit an existing message (used after approval to confirm action)
export async function editMessage(
  chatId: string | number,
  messageId: number,
  text: string
): Promise<void> {
  await callApi('editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'HTML',
  })
}

// Acknowledge a button tap — removes the loading spinner
export async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  await callApi('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text: text ?? '',
    show_alert: false,
  })
}

// Register a webhook URL with Telegram
export async function setWebhook(url: string): Promise<any> {
  return callApi('setWebhook', {
    url,
    allowed_updates: ['message', 'callback_query'],
    drop_pending_updates: true,
  })
}

// Get current webhook info
export async function getWebhookInfo(): Promise<any> {
  if (!API) return null
  const res = await fetch(`${API}/getWebhookInfo`)
  return res.json()
}

// Delete webhook (revert to polling)
export async function deleteWebhook(): Promise<void> {
  await callApi('deleteWebhook', { drop_pending_updates: false })
}

// ── Notification helpers (outbound, push-style) ────────────────────────────────

export async function sendTelegramAlert({
  inboxType, category, from, subject, summary, suggestedAction, priority,
}: {
  inboxType: 'work' | 'student_job'
  category: string
  from: string
  subject: string
  summary: string
  suggestedAction: string
  priority: string
}): Promise<void> {
  const icon = priority === 'high' ? '🚨' : '⚠️'
  const label = inboxType === 'work' ? 'ACC Work' : 'Student/Job'
  const text = [
    `${icon} <b>${inboxType === 'work' ? `ACC ${category}` : category} Email</b>`,
    `<b>From:</b> ${from}`,
    `<b>Subject:</b> ${subject}`,
    `<b>Summary:</b> ${summary}`,
    `<b>Next step:</b> ${suggestedAction}`,
    `<i>${label} inbox</i>`,
  ].join('\n')
  await send(text)
}

export async function sendTelegramMorningBriefing({
  greeting, overview, topPriorities, workUnread, studentJobUnread,
  urgentCount, calendarSummary, taskSummary, suggestedNextActions,
}: {
  greeting: string
  overview: string
  topPriorities: string[]
  workUnread: number
  studentJobUnread: number
  urgentCount: number
  calendarSummary: string
  taskSummary: string
  suggestedNextActions: string[]
}): Promise<void> {
  const priorities = topPriorities.slice(0, 3).map((p, i) => `${i + 1}. ${p}`).join('\n')
  const actions = suggestedNextActions.slice(0, 4).map((a, i) => `${i + 1}. ${a}`).join('\n')
  const text = [
    `🌅 <b>${greeting}</b>`,
    '',
    overview,
    '',
    `📬 <b>Inbox</b>`,
    `Work: ${workUnread} unread  |  Student/Job: ${studentJobUnread} unread  |  🚨 ${urgentCount} urgent`,
    '',
    `📅 <b>Calendar</b>`,
    calendarSummary,
    '',
    `✅ <b>Tasks</b>`,
    taskSummary,
    '',
    `🎯 <b>Top Priorities</b>`,
    priorities || 'None',
    '',
    `🚀 <b>Do Next</b>`,
    actions || 'Check your inbox',
    '',
    `<i>Reply with any question or command. /help for the full list.</i>`,
  ].join('\n')
  await send(text)
}

export async function sendTelegramTaskResult({
  taskTitle, assignedTo, result, agentNotes,
}: {
  taskTitle: string
  assignedTo: string
  result: string
  agentNotes?: string
}): Promise<void> {
  const text = [
    `✅ <b>Task Complete</b>`,
    `<b>Task:</b> ${taskTitle}`,
    `<b>Agent:</b> ${assignedTo}`,
    '',
    `<b>Output:</b>`,
    result.slice(0, 800),
    agentNotes ? `\n<i>Notes: ${agentNotes}</i>` : '',
  ].filter(Boolean).join('\n')
  await send(text)
}

export async function sendTelegramMessage(text: string): Promise<void> {
  await send(text)
}

export function telegramConfigured(): boolean {
  return !!(BOT_TOKEN && CHAT_ID)
}

// Verify that an incoming update is from Osman's authorized chat
export function isAuthorizedChat(chatId: number | string): boolean {
  if (!CHAT_ID) return false
  return String(chatId) === String(CHAT_ID)
}
