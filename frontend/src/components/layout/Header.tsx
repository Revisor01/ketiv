import React from 'react';
import { Bars3Icon, XMarkIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from 'react-router-dom';

interface HeaderProps {
  isMenuOpen: boolean;
  onMenuToggle: () => void;
  user?: {
    username: string;
  } | null;
}

export const Header: React.FC<HeaderProps> = ({ 
  isMenuOpen, 
  onMenuToggle, 
  user 
}) => {
  const { logout } = useAuth();
  const location = useLocation();
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-royal-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-3"
            >
              <div className="w-8 h-8 bg-gradient-royal rounded-xl flex items-center justify-center">
                <span className="text-white font-heading font-bold text-lg">B</span>
              </div>
              <h1 className="font-heading text-xl font-bold gradient-text">
                BibleScraper Pro
              </h1>
            </motion.div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <NavLink href="/" active={location.pathname === '/'}>Tageslosung</NavLink>
            <NavLink href="/search" active={location.pathname === '/search'}>Bibelsuche</NavLink>
            <NavLink href="/kirchenjahr" active={location.pathname === '/kirchenjahr'}>Kirchenjahr</NavLink>
            <NavLink href="/profile" active={location.pathname === '/profile'}>Profil</NavLink>
            <NavLink href="/admin" active={location.pathname === '/admin'}>Admin</NavLink>
          </nav>

          {/* User Menu & Mobile Toggle */}
          <div className="flex items-center space-x-4">
            {/* User Info */}
            {user ? (
              <div className="hidden sm:flex items-center space-x-3">
                <span className="text-sm text-gray-600">Hallo, {user.username}</span>
                <button
                  onClick={logout}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                  title="Abmelden"
                >
                  <ArrowRightOnRectangleIcon className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button className="btn-secondary text-sm px-4 py-2">
                Anmelden
              </button>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={onMenuToggle}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Menu"
            >
              <AnimatePresence mode="wait">
                {isMenuOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Bars3Icon className="w-6 h-6" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="md:hidden bg-white/95 backdrop-blur-lg border-b border-royal-100"
          >
            <nav className="px-4 py-4 space-y-3">
              <MobileNavLink href="/" active={location.pathname === '/'}>Tageslosung</MobileNavLink>
              <MobileNavLink href="/search" active={location.pathname === '/search'}>Bibelsuche</MobileNavLink>
              <MobileNavLink href="/kirchenjahr" active={location.pathname === '/kirchenjahr'}>Kirchenjahr</MobileNavLink>
              <MobileNavLink href="/profile" active={location.pathname === '/profile'}>Profil</MobileNavLink>
              <MobileNavLink href="/admin" active={location.pathname === '/admin'}>Admin</MobileNavLink>
              
              {user ? (
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between px-4 py-2">
                    <span className="text-sm text-gray-600">Hallo, {user.username}</span>
                    <button
                      onClick={logout}
                      className="flex items-center space-x-2 text-sm text-gray-500 hover:text-red-600 transition-colors"
                    >
                      <ArrowRightOnRectangleIcon className="w-4 h-4" />
                      <span>Abmelden</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pt-3 border-t border-gray-200">
                  <button className="btn-primary w-full">
                    Anmelden
                  </button>
                </div>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

const NavLink: React.FC<{ 
  href: string; 
  children: React.ReactNode; 
  active?: boolean 
}> = ({ href, children, active }) => (
  <a
    href={href}
    className={`font-medium transition-colors hover:text-royal-600 ${
      active 
        ? 'text-royal-600 border-b-2 border-royal-600 pb-1' 
        : 'text-gray-600'
    }`}
  >
    {children}
  </a>
);

const MobileNavLink: React.FC<{ 
  href: string; 
  children: React.ReactNode; 
  active?: boolean 
}> = ({ href, children, active }) => (
  <a
    href={href}
    className={`block px-4 py-3 rounded-xl font-medium transition-all ${
      active
        ? 'bg-gradient-royal text-white shadow-royal'
        : 'text-gray-600 hover:bg-royal-50 hover:text-royal-600'
    }`}
  >
    {children}
  </a>
);