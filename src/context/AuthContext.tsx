import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export interface UserProfile {
  sub: string;
  name: string;
  email: string;
  picture: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isGuest: boolean;
  login: () => void;
  loginAsGuest: () => void;
  logout: () => void;
}

const GUEST_USER: UserProfile = {
  sub: 'guest-user-1',
  name: 'Guest',
  email: 'guest@parawi.app',
  picture: `https://ui-avatars.com/api/?name=Guest&background=A3E635&color=000`,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isGuest = user?.email === GUEST_USER.email;

  const checkSession = useCallback(async () => {
    // Guest mode short-circuit — stays client-side only
    const guestMode = localStorage.getItem('parawi_guest_mode') === 'true';
    if (guestMode) {
      setUser(GUEST_USER);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/.netlify/functions/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json() as UserProfile;
        setUser(data);
      } else {
        setUser(null);
      }
    } catch {
      // Network error — treat as unauthenticated
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = () => {
    // Redirect to the server-side OAuth flow
    window.location.href = '/.netlify/functions/google-auth';
  };

  const loginAsGuest = () => {
    localStorage.setItem('parawi_guest_mode', 'true');
    setUser(GUEST_USER);
    setIsLoading(false);
  };

  const logout = async () => {
    // Clear guest mode
    localStorage.removeItem('parawi_guest_mode');

    // Clear server-side cookies — fire and forget
    try {
      await fetch('/.netlify/functions/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // Best-effort — even if the request fails, clear local state
    }

    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isGuest, login, loginAsGuest, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
