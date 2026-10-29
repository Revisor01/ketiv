import React from 'react';
import { useAuth } from '../../context/AuthContext';

export const ProfileSettings: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-subtle py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="card p-8">
          <div className="mb-6">
            <h1 className="font-heading text-2xl font-bold text-gray-900 mb-2">
              Profil Einstellungen
            </h1>
            <p className="text-gray-600">
              Dein Konto für die Verwaltung.
            </p>
          </div>

          <div className="space-y-6">
            {/* Benutzerinformationen */}
            <div>
              <h3 className="font-heading text-lg font-semibold text-gray-900 mb-4">
                Benutzerinformationen
              </h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Benutzername
                    </label>
                    <p className="text-gray-900 font-medium">{user?.username}</p>
                  </div>
                  <button
                    onClick={logout}
                    className="btn-secondary text-sm px-4 py-2 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    Abmelden
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};