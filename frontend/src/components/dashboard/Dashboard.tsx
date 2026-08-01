import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CalendarDaysIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { BibleTextDisplay } from '../bible/BibleTextDisplay';
import { TranslationSelector } from '../bible/TranslationSelector';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';
import { apiService } from '../../services/api';
import { DailyLosung } from '../../types';

export const Dashboard: React.FC = () => {
  const [losung, setLosung] = useState<DailyLosung | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTranslation, setSelectedTranslation] = useState('LUT');
  
  const availableTranslations = apiService.getAvailableTranslations();

  const loadLosung = async (translation: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getTodayLosung(translation);
      if (response.success && response.data) {
        setLosung(response.data);
      } else {
        setError(response.error || 'Fehler beim Laden der Tageslosung');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLosung(selectedTranslation);
  }, [selectedTranslation]);

  const handleTranslationChange = (translation: string) => {
    setSelectedTranslation(translation);
  };

  const getCurrentGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Guten Morgen';
    if (hour < 18) return 'Guten Tag';
    return 'Guten Abend';
  };

  const formatDate = (dateString: string): string => {
    const date = apiService.parseGermanDate(dateString);
    if (!date) return dateString;
    
    const formatter = new Intl.DateTimeFormat('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Format: "Freitag, 1. August 2025"
    return formatter.format(date).replace(/(\d+)\.\s/, '$1. ');
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center mb-4">
            <SparklesIcon className="w-8 h-8 text-royal-500 mr-3" />
            <h1 className="font-heading text-4xl font-bold gradient-text">
              {getCurrentGreeting()}
            </h1>
          </div>
          
          <p className="text-lg text-gray-600 font-body">
            {losung ? formatDate(losung.date) : 'Lade Tageslosung...'}
          </p>
        </motion.div>

        {/* Translation Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8 relative z-30"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-xl font-semibold text-gray-900">
              Tageslosung
            </h2>
            <div className="w-64">
              <TranslationSelector
                selected={selectedTranslation}
                onSelect={handleTranslationChange}
                available={availableTranslations}
              />
            </div>
          </div>
        </motion.div>

        {/* Loading State */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center py-12"
          >
            <LoadingSpinner size="lg" />
          </motion.div>
        )}

        {/* Error State */}
        {error && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <ErrorMessage
              message={error}
              onRetry={() => loadLosung(selectedTranslation)}
            />
          </motion.div>
        )}

        {/* Losung Content */}
        {losung && !loading && !error && (
          <div className="space-y-8">
            {/* Losung (AT) */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center mb-4">
                <CalendarDaysIcon className="w-5 h-5 text-blue-500 mr-2" />
                <h3 className="font-heading text-lg font-semibold text-gray-900">
                  Losung ({losung.losung.testament})
                </h3>
              </div>
              <BibleTextDisplay verse={losung.losung} />
            </motion.div>

            {/* Lehrtext (NT) */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center mb-4">
                <SparklesIcon className="w-5 h-5 text-purple-500 mr-2" />
                <h3 className="font-heading text-lg font-semibold text-gray-900">
                  Lehrtext ({losung.lehrtext.testament})
                </h3>
              </div>
              <BibleTextDisplay verse={losung.lehrtext} />
            </motion.div>

            {/* Source Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="card p-4 bg-gradient-to-r from-gray-50 to-blue-50"
            >
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center space-x-4">
                  <span>Quelle: {losung.source}</span>
                  {losung.translation && (
                    <span>Übersetzung: {losung.translation.name}</span>
                  )}
                </div>
                {losung.cached_at && (
                  <span className="text-xs text-gray-500">
                    Geladen: {new Date(losung.cached_at).toLocaleTimeString('de-DE')}
                  </span>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <QuickActionCard
            title="Bibelstelle suchen"
            description="Suche nach beliebigen Bibelversen"
            href="/search"
            icon="🔍"
          />
          <QuickActionCard
            title="Kirchenjahr"
            description="Sonntage und Feiertage mit Perikopen"
            href="/kirchenjahr"
            icon="📅"
          />
        </motion.div>
      </div>
    </div>
  );
};

interface QuickActionCardProps {
  title: string;
  description: string;
  href: string;
  icon: string;
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({
  title,
  description,
  href,
  icon
}) => (
  <motion.a
    href={href}
    whileHover={{ scale: 1.02, y: -2 }}
    whileTap={{ scale: 0.98 }}
    className="card p-6 block hover:shadow-card-hover transition-all group"
  >
    <div className="flex items-center space-x-3 mb-2">
      <span className="text-2xl">{icon}</span>
      <h3 className="font-heading text-lg font-semibold text-gray-900 group-hover:text-royal-600 transition-colors">
        {title}
      </h3>
    </div>
    <p className="text-gray-600 text-sm">{description}</p>
  </motion.a>
);