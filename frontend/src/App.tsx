import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginForm } from './components/auth/LoginForm';
import { Header } from './components/layout/Header';
import { Dashboard } from './components/dashboard/Dashboard';
import { SearchInterface } from './components/search/SearchInterface';
import { ProfileSettings } from './components/profile/ProfileSettings';
import { AdminPanel } from './components/admin/AdminPanel';
import { ChurchYearCalendar } from './components/church/ChurchYearCalendar';
import './styles/globals.css';

// Wrapper für geschützte Routen
function ProtectedRoutes() {
  const { isAuthenticated, login, user } = useAuth();
  const [loginError, setLoginError] = useState<string>('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogin = (username: string, password: string) => {
    const success = login(username, password);
    if (!success) {
      setLoginError('Ungültige Anmeldedaten. Bitte versuche es erneut.');
    } else {
      setLoginError('');
    }
  };

  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleRouteChange = () => {
    setIsMenuOpen(false);
  };

  if (!isAuthenticated) {
    return <LoginForm onLogin={handleLogin} error={loginError} />;
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header
        isMenuOpen={isMenuOpen}
        onMenuToggle={handleMenuToggle}
        user={{ username: user?.username || 'Unbekannt' }}
      />

      <main onClick={handleRouteChange}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/search" element={<SearchInterface />} />
          <Route path="/profile" element={<ProfileSettings />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/kirchenjahr" element={<ChurchYearCalendar />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <ProtectedRoutes />
      </AuthProvider>
    </Router>
  );
}


export default App;
