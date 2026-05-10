import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import PixelSidebar from '@/components/layout/PixelSidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="office-layout">
      <PixelSidebar user={session.user ?? {}} />
      {children}
    </div>
  )
}
