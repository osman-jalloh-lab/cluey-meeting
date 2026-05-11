import { signIn } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import DevLoginButton from './DevLoginButton'

export default async function LoginPage() {
  const session = await auth()
  if (session) redirect('/dashboard')

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)' }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '40px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--r-5)', boxShadow: 'var(--sh-3)' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: 'var(--r-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', background: 'linear-gradient(135deg, var(--c-blue), var(--c-purple))' }}>
            <span style={{ fontSize: '24px' }}>⚡</span>
          </div>
          <h1 style={{ margin: '0 0 6px', font: '700 22px/1.2 var(--font-sans)', color: 'var(--fg-primary)', letterSpacing: '-0.02em' }}>PARAWI</h1>
          <p style={{ margin: 0, font: '400 13px/1 var(--font-sans)', color: 'var(--fg-muted)' }}>Command Centre — sign in to continue</p>
        </div>

        {/* Google Sign in */}
        <form action={async () => {
          'use server'
          await signIn('google', { redirectTo: '/dashboard' })
        }}>
          <button
            type="submit"
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              padding: '11px 16px', borderRadius: 'var(--r-3)', border: '1px solid var(--border-default)',
              background: 'var(--bg-surface-2)', color: 'var(--fg-primary)',
              font: '600 13px/1 var(--font-sans)', cursor: 'pointer', transition: 'filter 0.15s',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.440 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        </form>

        {/* Dev login bypass */}
        <div style={{ marginTop: '12px' }}>
          <DevLoginButton />
        </div>

        <p style={{ textAlign: 'center', marginTop: '24px', font: '400 11px/1.5 var(--font-sans)', color: 'var(--fg-faint)' }}>
          Your data stays private. AI suggestions require your approval.
        </p>
      </div>
    </div>
  )
}
