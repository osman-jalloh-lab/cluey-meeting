/**
 * DEV-ONLY login bypass — skips Google OAuth.
 * Creates a local user and session directly in the database.
 * Remove this route before deploying to production.
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import crypto from 'crypto'

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  // Upsert the dev user
  const user = await prisma.user.upsert({
    where: { email: 'osman.jalloh@g.austincc.edu' },
    create: {
      email: 'osman.jalloh@g.austincc.edu',
      name: 'Osman Jalloh',
      emailVerified: new Date(),
    },
    update: {},
  })

  // Create a session token
  const sessionToken = crypto.randomUUID()
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

  await prisma.session.create({
    data: {
      sessionToken,
      userId: user.id,
      expires,
    },
  })

  // Set the NextAuth session cookie
  const response = NextResponse.json({ success: true, userId: user.id })
  response.cookies.set('authjs.session-token', sessionToken, {
    httpOnly: true,
    expires,
    path: '/',
    sameSite: 'lax',
  })

  return response
}
