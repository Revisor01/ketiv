import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ADMIN_BASE } from '../services/api';

interface User {
  username: string;
  apiKey: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  updateApiKey: (apiKey: string) => void;
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

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check for stored auth data on app start
    const storedUser = localStorage.getItem('biblescraper_user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        updateGlobalApiKey(userData.apiKey);
      } catch (error) {
        console.error('Failed to parse stored user data:', error);
        localStorage.removeItem('biblescraper_user');
      }
    }
  }, []);

  // Der Server prüft die Zugangsdaten; das Bundle enthält weder Passwort noch API-Schlüssel.
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(`${ADMIN_BASE}/admin.php?action=login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json();
      if (!response.ok || !result.success || !result.data?.api_key) {
        return false;
      }

      const userData: User = { username: result.data.username, apiKey: result.data.api_key };
      setUser(userData);
      localStorage.setItem('biblescraper_user', JSON.stringify(userData));
      updateGlobalApiKey(userData.apiKey);
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('biblescraper_user');
    updateGlobalApiKey('');
  };

  const updateApiKey = (apiKey: string) => {
    if (user) {
      const updatedUser = { ...user, apiKey };
      setUser(updatedUser);
      localStorage.setItem('biblescraper_user', JSON.stringify(updatedUser));
      updateGlobalApiKey(apiKey);
    }
  };

  // Helper to update API service
  const updateGlobalApiKey = (apiKey: string) => {
    // This will be handled by the API service
    (window as any).__BIBLESCRAPER_API_KEY__ = apiKey;
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    updateApiKey
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};