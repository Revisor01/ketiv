import React from 'react';
import { motion } from 'framer-motion';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ 
  message, 
  onRetry, 
  className = '' 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`card p-6 border-red-200 bg-red-50 ${className}`}
    >
      <div className="flex items-start space-x-3">
        <ExclamationTriangleIcon className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
        
        <div className="flex-1">
          <h3 className="font-heading text-lg font-semibold text-red-800 mb-2">
            Fehler aufgetreten
          </h3>
          <p className="text-red-700 mb-4">
            {message}
          </p>
          
          {onRetry && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onRetry}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              <ArrowPathIcon className="w-4 h-4 mr-2" />
              Erneut versuchen
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
};