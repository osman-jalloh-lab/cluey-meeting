import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  // Use Turso in prod, local sqlite in dev
  const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || 'file:./dev.db'
  const authToken = process.env.TURSO_AUTH_TOKEN

  // Format local URLs correctly
  const formattedUrl = url.startsWith('file:') || url.startsWith('libsql:') || url.startsWith('http')
    ? url
    : `file:${url}`

  // Prisma 7: PrismaLibSql is a factory — pass config directly, not a pre-created client
  const adapter = new PrismaLibSql({ url: formattedUrl, authToken })

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
