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
  loginAsGuest: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(() => sessionStorage.getItem('gcal_token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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
        sessionStorage.removeItem('gcal_token');
      } finally {
        setIsLoading(false);
      }
    };

    const isGuest = localStorage.getItem('cluey_guest_mode') === 'true';
    if (accessToken) {
      fetchProfile(accessToken);
    } else if (isGuest) {
      setUser({
        sub: 'guest-user-1',
        name: 'Guest',
        email: 'guest@cluey.app',
        picture: `https://ui-avatars.com/api/?name=Guest&background=A3E635&color=000`
      });
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, [accessToken]);

  const login = useGoogleLogin({
    scope: 'openid email profile https://www.googleapis.com/auth/calendar.readonly',
    onSuccess: (tokenResponse) => {
      localStorage.removeItem('cluey_guest_mode');
      setAccessToken(tokenResponse.access_token);
      sessionStorage.setItem('gcal_token', tokenResponse.access_token);
    },
    onError: () => {
      console.error('Login failed');
    }
  });

  const loginAsGuest = () => {
    localStorage.setItem('cluey_guest_mode', 'true');
    setUser({
      sub: 'guest-user-1',
      name: 'Guest',
      email: 'guest@cluey.app',
      picture: `https://ui-avatars.com/api/?name=Guest&background=A3E635&color=000`
    });
  };

  const logout = () => {
    setAccessToken(null);
    setUser(null);
    sessionStorage.removeItem('gcal_token');
    localStorage.removeItem('cluey_guest_mode');
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoading, login, loginAsGuest, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
