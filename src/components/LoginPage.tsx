import React from 'react';
import { Hexagon, LogIn, Lock, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login, loginAsGuest } = useAuth();

  return (
    <div className="flex h-screen items-center justify-center bg-paper text-ink font-sans relative overflow-hidden">
      {/* Background aesthetics */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-lime/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue/5 blur-[100px] rounded-full pointer-events-none" />

      {/* Main Card */}
      <div className="relative z-10 w-[420px] max-w-[90vw] bg-paper2/80 backdrop-blur-xl border border-white/5 rounded-[24px] p-10 flex flex-col items-center text-center shadow-card-hover animate-[modalIn_0.8s_cubic-bezier(0.16,1,0.3,1)]">
        <div className="w-[60px] h-[60px] bg-lime rounded-[16px] flex items-center justify-center shadow-lime-glow mb-6">
          <Hexagon className="w-8 h-8 text-paper stroke-[2.5px]" />
        </div>
        
        <h1 className="font-serif text-[32px] font-normal tracking-[-0.6px] leading-[1.1] mb-3">
          Clue<em className="font-light italic text-ink2">y</em>
        </h1>
        
        <p className="text-[14px] text-ink2 leading-relaxed mb-8 max-w-[280px]">
          Your private, AI-powered meeting memory. Log in to keep your recaps and calendar synced seamlessly.
        </p>

        <div className="flex flex-col gap-3 w-full">
          <button 
            onClick={() => login()}
            className="flex items-center justify-center gap-3 bg-paper3 border border-line2 hover:border-lime/40 text-ink px-6 py-3.5 rounded-[12px] font-medium text-[14px] transition-all duration-300 hover:shadow-lime-glow group w-full active:scale-[0.98]"
          >
            <LogIn className="w-4 h-4 text-ink3 group-hover:text-lime transition-colors" />
            Continue with Google
          </button>

          <button 
            onClick={() => loginAsGuest()}
            className="flex items-center justify-center gap-3 bg-paper border border-line hover:border-line2 text-ink2 px-6 py-3.5 rounded-[12px] font-medium text-[14px] transition-all duration-300 group w-full active:scale-[0.98]"
          >
            <User className="w-4 h-4 text-ink4 group-hover:text-ink2 transition-colors" />
            Continue as Guest
          </button>
        </div>

        <div className="flex items-center gap-2 mt-8 text-[11px] text-ink4 font-mono">
          <Lock className="w-3 h-3" />
          Secure OAuth 2.0 connection
        </div>
      </div>
    </div>
  );
};
