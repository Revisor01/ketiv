import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ClipboardDocumentIcon,
  ShareIcon,
  ArrowTopRightOnSquareIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { BibleTextDisplayProps } from '../../types';

export const BibleTextDisplay: React.FC<BibleTextDisplayProps> = ({
  verse,
  className = '',
  showReference = true,
  showSource = true
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const textToCopy = showReference 
      ? `"${verse.text}" - ${verse.reference}`
      : verse.text;
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: verse.reference,
          text: `"${verse.text}" - ${verse.reference}`,
          url: verse.bibleserver_url
        });
      } catch (err) {
        console.error('Failed to share:', err);
      }
    }
  };

  // Funktion um optionale Verse kursiv zu formatieren
  const formatText = (text: string) => {
    // Ersetze [OPTIONAL]...[/OPTIONAL] mit kursivem Text
    return text.replace(/\[OPTIONAL\](.*?)\[\/OPTIONAL\]/g, '<em>$1</em>');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card p-6 ${className}`}
    >
      {/* Reference Header */}
      {showReference && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-lg font-semibold text-gray-900">
            {verse.reference}
          </h3>
          
          <div className="flex items-center space-x-2">
            {/* Copy Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCopy}
              className="p-2 rounded-lg text-gray-400 hover:text-royal-600 hover:bg-royal-50 transition-colors"
              title="Text kopieren"
            >
              {copied ? (
                <CheckIcon className="w-5 h-5 text-green-600" />
              ) : (
                <ClipboardDocumentIcon className="w-5 h-5" />
              )}
            </motion.button>

            {/* Share Button (nur auf mobilen Geräten mit Web Share API) */}
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleShare}
                className="p-2 rounded-lg text-gray-400 hover:text-royal-600 hover:bg-royal-50 transition-colors"
                title="Teilen"
              >
                <ShareIcon className="w-5 h-5" />
              </motion.button>
            )}

            {/* External Link */}
            {(verse.bibleserver_url || verse.url) && (
              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href={verse.bibleserver_url || verse.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg text-gray-400 hover:text-royal-600 hover:bg-royal-50 transition-colors"
                title="Zur Quelle"
              >
                <ArrowTopRightOnSquareIcon className="w-5 h-5" />
              </motion.a>
            )}
          </div>
        </div>
      )}

      {/* Bible Text */}
      <blockquote 
        className="text-lg leading-relaxed text-gray-700 mb-4 font-body"
        dangerouslySetInnerHTML={{ 
          __html: `"${formatText(verse.text)}"` 
        }}
      />

      {/* Source & Testament Info */}
      {showSource && (
        <div className="flex items-center justify-between text-sm text-gray-500 border-t border-gray-100 pt-4">
          <div className="flex items-center space-x-4">
            {verse.translation_source && (
              <span>Quelle: {verse.translation_source}</span>
            )}
            {verse.testament && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                verse.testament === 'AT' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-purple-100 text-purple-700'
              }`}>
                {verse.testament === 'AT' ? 'Altes Testament' : 'Neues Testament'}
              </span>
            )}
          </div>
          
          {copied && (
            <motion.span
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="text-green-600 font-medium"
            >
              ✓ Kopiert
            </motion.span>
          )}
        </div>
      )}
    </motion.div>
  );
};