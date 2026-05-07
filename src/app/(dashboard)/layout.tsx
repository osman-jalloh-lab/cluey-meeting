import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import TopNav from '@/components/layout/TopNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      <TopNav user={session.user ?? {}} />
      <main style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {children}
      </main>
    </div>
  )
}
