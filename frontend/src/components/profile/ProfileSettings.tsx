import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { EyeIcon, EyeSlashIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';

export const ProfileSettings: React.FC = () => {
  const { user, updateApiKey, logout } = useAuth();
  const [apiKey, setApiKey] = useState(user?.apiKey || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    updateApiKey(apiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="card p-8">
          <div className="mb-6">
            <h1 className="font-heading text-2xl font-bold text-gray-900 mb-2">
              Profil Einstellungen
            </h1>
            <p className="text-gray-600">
              Verwalte deine Kontoeinstellungen und API-Zugangsdaten.
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

            {/* API Key */}
            <div>
              <h3 className="font-heading text-lg font-semibold text-gray-900 mb-4">
                API-Zugang
              </h3>
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  API Key für Backend-Zugriff
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="input-field pr-20"
                    placeholder="Gib deinen API Key ein"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center space-x-1 pr-3">
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="p-1 rounded hover:bg-gray-100 transition-colors"
                      title={showApiKey ? 'API Key verstecken' : 'API Key anzeigen'}
                    >
                      {showApiKey ? (
                        <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                      ) : (
                        <EyeIcon className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Der API Key wird sicher in deinem Browser gespeichert und für alle Anfragen an das Backend verwendet.
                </p>
              </div>
            </div>

            {/* Speichern Button */}
            <div className="flex justify-end">
              <motion.button
                onClick={handleSave}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn-primary px-6 py-2 flex items-center space-x-2"
                disabled={saved}
              >
                {saved ? (
                  <>
                    <CheckIcon className="w-4 h-4" />
                    <span>Gespeichert</span>
                  </>
                ) : (
                  <span>Speichern</span>
                )}
              </motion.button>
            </div>

            {/* Erfolgsanzeige */}
            {saved && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg"
              >
                ✓ API Key erfolgreich aktualisiert
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};