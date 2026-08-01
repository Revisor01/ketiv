import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon, CheckIcon, DocumentTextIcon, CodeBracketIcon, LanguageIcon, DocumentIcon } from '@heroicons/react/24/outline';

const formatOptions = [
  { value: 'json', label: 'Standard', description: 'Strukturierte Daten', icon: CodeBracketIcon },
  { value: 'text', label: 'Nur Text', description: 'Reiner Bibeltext', icon: DocumentTextIcon },
  { value: 'markdown', label: 'Markdown', description: 'Für Predigten & Dokumente', icon: LanguageIcon },
  { value: 'html', label: 'HTML', description: 'Web-formatiert', icon: DocumentIcon }
];

interface FormatSelectorProps {
  selected: string;
  onSelect: (format: string) => void;
  disabled?: boolean;
  className?: string;
}

export const FormatSelector: React.FC<FormatSelectorProps> = ({
  selected,
  onSelect,
  disabled = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedFormat = formatOptions.find(f => f.value === selected);

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

  const handleSelect = (format: typeof formatOptions[0]) => {
    onSelect(format.value);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <motion.button
        whileHover={{ scale: disabled ? 1 : 1.02 }}
        whileTap={{ scale: disabled ? 1 : 0.98 }}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full flex items-center justify-between bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl px-4 py-3 text-left shadow-card hover:shadow-card-hover transition-all focus:outline-none focus:ring-2 focus:ring-royal-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center space-x-3">
          {selectedFormat?.icon && (
            <selectedFormat.icon className="w-5 h-5 text-royal-600" />
          )}
          <div>
            <span className="font-medium text-gray-900 block">
              {selectedFormat?.label}
            </span>
            <span className="text-sm text-gray-500">
              {selectedFormat?.description}
            </span>
          </div>
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
            className="absolute z-[9999] w-full mt-2 bg-white/95 backdrop-blur-lg border border-gray-200 rounded-xl shadow-xl overflow-hidden"
          >
            {/* Format List */}
            <div className="py-1">
              {formatOptions.map(format => (
                <motion.button
                  key={format.value}
                  whileHover={{ backgroundColor: 'rgba(99, 102, 241, 0.05)' }}
                  onClick={() => handleSelect(format)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-royal-25 transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <format.icon className="w-5 h-5 text-royal-600 group-hover:text-royal-700" />
                    <div>
                      <span className="font-medium text-gray-900 block">
                        {format.label}
                      </span>
                      <span className="text-sm text-gray-500">
                        {format.description}
                      </span>
                    </div>
                  </div>
                  
                  {selected === format.value && (
                    <CheckIcon className="w-5 h-5 text-royal-600" />
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};