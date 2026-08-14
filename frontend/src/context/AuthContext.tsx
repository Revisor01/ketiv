import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  username: string;
  apiKey: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => boolean;
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

  // Credentials come from build-time env vars (see frontend/.env.example)
  const VALID_USERS: Record<string, string> = {
    [import.meta.env.REACT_APP_AUTH_USER || '']: import.meta.env.REACT_APP_AUTH_PASSWORD || ''
  };

  useEffect(() => {
    // Check for stored auth data on app start
    const storedUser = localStorage.getItem('biblescraper_user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
      } catch (error) {
        console.error('Failed to parse stored user data:', error);
        localStorage.removeItem('biblescraper_user');
      }
    }
  }, []);

  const login = (username: string, password: string): boolean => {
    // Check credentials (empty configured credentials never authenticate)
    const expected = VALID_USERS[username];
    if (username && password && expected && expected === password) {
      const userData: User = {
        username,
        apiKey: import.meta.env.REACT_APP_API_KEY || ''
      };
      
      setUser(userData);
      localStorage.setItem('biblescraper_user', JSON.stringify(userData));
      
      // Update API service with new key
      updateGlobalApiKey(userData.apiKey);
      
      return true;
    }
    
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('biblescraper_user');
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