'use client'

export default function DevLoginButton() {
  const handleDevLogin = async () => {
    const res = await fetch('/api/dev/login', { method: 'POST' })
    if (res.ok) {
      window.location.href = '/dashboard'
    } else {
      alert('Dev login failed')
    }
  }

  return (
    <button
      onClick={handleDevLogin}
      className="w-full py-3 px-4 rounded-xl font-medium transition-all text-sm"
      style={{
        background: 'transparent',
        color: 'var(--muted)',
        border: '1px dashed var(--border)',
        cursor: 'pointer',
      }}
    >
      ⚡ Dev Login (osman.jalloh@g.austincc.edu)
    </button>
  )
}
