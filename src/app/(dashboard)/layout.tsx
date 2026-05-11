import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import PixelSidebar from '@/components/layout/PixelSidebar'
import CommandTopBar from '@/components/layout/CommandTopBar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="shell">
      <CommandTopBar user={session.user ?? {}} />
      <PixelSidebar user={session.user ?? {}} />
      <main className="shell-canvas">
        {children}
      </main>
    </div>
  )
}
