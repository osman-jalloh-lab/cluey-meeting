import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { runCalendarInviteAgent } from '@/lib/agents/calendarInviteAgent'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runCalendarInviteAgent(session.user.id)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Calendar invite agent error:', error)
    return NextResponse.json(
      { error: 'Failed to process calendar invites' },
      { status: 500 }
    )
  }
}
