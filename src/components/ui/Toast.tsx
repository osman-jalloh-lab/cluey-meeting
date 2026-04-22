import React, { useEffect } from 'react';
import { Check } from 'lucide-react';

export const Toast: React.FC<{ message: string; onClose: () => void }> = ({ message, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 999,
      background: 'var(--paper)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--r-md)',
      padding: '11px 16px',
      font: '400 13px/1.4 var(--font-ui)',
      color: 'var(--ink)',
      display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: 'var(--shadow-pop)',
      animation: 'toastUp .25s cubic-bezier(0.34,1.15,0.64,1)',
    }}>
      <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--ok-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Check size={11} strokeWidth={2.5} style={{ color: 'var(--ok-ink)' }} />
      </div>
      {message}
    </div>
  );
};
