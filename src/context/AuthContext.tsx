import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useGoogleLogin } from '@react-oauth/google';

export interface UserProfile {
  sub: string;
  name: string;
  email: string;
  picture: string;
}

interface AuthContextType {
  user: UserProfile | null;
  accessToken: string | null;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(() => localStorage.getItem('gcal_token'));
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (token: string) => {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser({
          sub: data.sub,
          name: data.name,
          email: data.email,
          picture: data.picture,
        });
      } else {
        throw new Error('Failed to fetch user profile');
      }
    } catch (err) {
      console.error(err);
      setAccessToken(null);
      localStorage.removeItem('gcal_token');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchProfile(accessToken);
    } else {
      setIsLoading(false);
    }
  }, [accessToken]);

  const login = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
    onSuccess: (tokenResponse) => {
      setAccessToken(tokenResponse.access_token);
      localStorage.setItem('gcal_token', tokenResponse.access_token);
    },
    onError: () => {
      console.error('Login failed');
    }
  });

  const logout = () => {
    setAccessToken(null);
    setUser(null);
    localStorage.removeItem('gcal_token');
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
