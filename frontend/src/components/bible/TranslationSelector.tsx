import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/24/outline';
import { TranslationSelectorProps } from '../../types';

export const TranslationSelector: React.FC<TranslationSelectorProps> = ({
  selected,
  onSelect,
  available,
  className = '',
  allowNone = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const NONE_OPTION = { code: '', name: '– keine –', language: '' };
  const selectedTranslation = selected === '' && allowNone
    ? NONE_OPTION
    : available.find(t => t.code === selected);
  
  const filteredTranslations = available.filter(translation =>
    translation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    translation.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Gruppiere Übersetzungen nach Sprache
  const groupedTranslations = filteredTranslations.reduce((groups, translation) => {
    const language = translation.language;
    if (!groups[language]) {
      groups[language] = [];
    }
    groups[language].push(translation);
    return groups;
  }, {} as Record<string, typeof available>);

  // Schließe Dropdown bei Klick außerhalb
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fokussiere Suchfeld wenn Dropdown öffnet
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);


  const handleSelect = (translation: typeof available[0]) => {
    onSelect(translation.code);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className={`relative ${className} ${isOpen ? 'z-50' : 'z-10'}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl px-4 py-3 text-left shadow-card hover:shadow-card-hover transition-all focus:outline-none focus:ring-2 focus:ring-royal-500/20"
      >
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          {selectedTranslation?.code && (
            <span className="font-mono text-sm font-medium text-royal-600 bg-royal-50 px-2 py-1 rounded-md flex-shrink-0">
              {selectedTranslation.code}
            </span>
          )}
          <span className="font-medium text-gray-900 truncate">
            {selectedTranslation?.name}
          </span>
        </div>
        
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDownIcon className="w-5 h-5 text-gray-400" />
        </motion.div>
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-80 overflow-hidden z-[100]"
          >
            {/* Search Input */}
            <div className="p-3 border-b border-gray-100">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Übersetzung suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-royal-500/20 focus:border-royal-500"
              />
            </div>

            {/* Translation List */}
            <div className="max-h-64 overflow-y-auto">
              {allowNone && (
                <motion.button
                  onClick={() => { onSelect(''); setIsOpen(false); setSearchTerm(''); }}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-royal-25 transition-colors border-b border-gray-100"
                >
                  <span className="font-medium text-gray-500 italic">– keine –</span>
                  {selected === '' && <CheckIcon className="w-5 h-5 text-royal-600" />}
                </motion.button>
              )}
              {Object.entries(groupedTranslations).map(([language, translations]) => (
                <div key={language} className="py-2">
                  {/* Language Header */}
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
                    {language === 'German' ? 'Deutsch' : 
                     language === 'English' ? 'Englisch' : 
                     language === 'French' ? 'Französisch' : language}
                  </div>
                  
                  {/* Translations */}
                  {translations.map(translation => (
                    <motion.button
                      key={translation.code}
                      whileHover={{ backgroundColor: 'rgba(99, 102, 241, 0.05)' }}
                      onClick={() => handleSelect(translation)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-royal-25 transition-colors"
                    >
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <span className="font-mono text-sm font-medium text-royal-600 bg-royal-50 px-2 py-1 rounded-md min-w-[3rem] text-center flex-shrink-0">
                          {translation.code}
                        </span>
                        <span className="font-medium text-gray-900 truncate">
                          {translation.name}
                        </span>
                      </div>
                      
                      {selected === translation.code && (
                        <CheckIcon className="w-5 h-5 text-royal-600" />
                      )}
                    </motion.button>
                  ))}
                </div>
              ))}
              
              {filteredTranslations.length === 0 && (
                <div className="px-4 py-8 text-center text-gray-500">
                  Keine Übersetzungen gefunden
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};