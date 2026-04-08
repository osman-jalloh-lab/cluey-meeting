import React, { useEffect } from 'react';
import { Check } from 'lucide-react';

export const Toast: React.FC<{ message: string; onClose: () => void }> = ({ message, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 right-6 z-[999] bg-paper3 border border-line2 text-ink rounded-[10px] px-4 py-[11px] text-[13px] flex items-center gap-2.5 shadow-card-hover animate-[toastUp_0.25s_cubic-bezier(0.34,1.15,0.64,1)] font-sans">
      <div className="w-[18px] h-[18px] rounded-full bg-lime-bg flex items-center justify-center shrink-0">
        <Check className="w-3 h-3 text-lime" strokeWidth={2.5} />
      </div>
      {message}
    </div>
  );
};
