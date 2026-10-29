import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ADMIN_BASE } from '../services/api';

interface User {
  username: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  checking: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

// Die Anmeldung trägt ein HttpOnly-Cookie des Servers; im Browser liegt kein Schlüssel.
const adminFetch = (action: string, init: RequestInit = {}) =>
  fetch(`${ADMIN_BASE}/admin.php?action=${action}`, { ...init, credentials: 'include' });

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Ältere Fassungen legten hier den API-Schlüssel ab.
    localStorage.removeItem('biblescraper_user');
    let aktiv = true;
    adminFetch('session')
      .then(async (response) => {
        const result = await response.json();
        if (aktiv && response.ok && result.success && result.data?.username) {
          setUser({ username: result.data.username });
        }
      })
      .catch(() => {})
      .finally(() => aktiv && setChecking(false));
    return () => {
      aktiv = false;
    };
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await adminFetch('login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json();
      if (!response.ok || !result.success || !result.data?.username) {
        return false;
      }
      setUser({ username: result.data.username });
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await adminFetch('logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout failed:', error);
    }
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    checking
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};