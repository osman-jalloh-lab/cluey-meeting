import React from 'react';
import { LogIn, Lock, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function LogoIcon() {
  return (
    <svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 12a5 5 0 0 1 8 0"/>
      <path d="M5 8a9 9 0 0 1 14 0"/>
      <circle cx="12" cy="16" r="1.5" fill="currentColor" stroke="none"/>
    </svg>
  );
}

export const LoginPage: React.FC = () => {
  const { login, loginAsGuest } = useAuth();

  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--paper)', overflow: 'hidden', position: 'relative' }}>
      {/* Soft background accent */}
      <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)', width: 600, height: 600, background: 'var(--accent-soft)', borderRadius: '50%', filter: 'blur(120px)', pointerEvents: 'none', opacity: 0.6 }} />

      <div style={{
        position: 'relative', zIndex: 1,
        width: 420, maxWidth: '90vw',
        background: 'var(--paper)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-xl)',
        padding: '48px 40px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
        boxShadow: 'var(--shadow-pop)',
        animation: 'modalIn .8s cubic-bezier(0.16,1,0.3,1)',
      }}>
        {/* Logo */}
        <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--ink)', color: 'var(--paper)', display: 'grid', placeItems: 'center', marginBottom: 20 }}>
          <LogoIcon />
        </div>

        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 300, fontStyle: 'italic', fontSize: 40, letterSpacing: '-1px', lineHeight: 1.05, margin: '0 0 12px', color: 'var(--ink)' }}>
          parawi
        </h1>

        <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.65, margin: '0 0 32px', maxWidth: 280 }}>
          Your private, AI-powered meeting memory. Keep your recaps and calendar synced.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
          <button
            onClick={() => login()}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '12px 20px', borderRadius: 'var(--r-md)', background: 'var(--ink)', color: 'var(--paper)', border: '1px solid var(--ink)', font: '500 14px/1 var(--font-ui)', cursor: 'pointer', transition: 'background .15s, border-color .15s', width: '100%' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--accent)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--ink)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--ink)'; }}
          >
            <LogIn size={16} /> Continue with Google
          </button>

          <button
            onClick={() => loginAsGuest()}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '12px 20px', borderRadius: 'var(--r-md)', background: 'var(--paper-2)', color: 'var(--ink-2)', border: '1px solid var(--line)', font: '500 14px/1 var(--font-ui)', cursor: 'pointer', transition: 'background .15s', width: '100%' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--paper-3)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--paper-2)'}
          >
            <User size={16} /> Continue as Guest
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 28, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>
          <Lock size={11} /> Secure OAuth 2.0 connection
        </div>
      </div>
    </div>
  );
};
