import React from 'react';
import { AlertTriangle, XCircle, AlertCircle, Info } from 'lucide-react';

interface ErrorMessageProps {
  type?: 'error' | 'warning' | 'info';
  message: string;
  details?: string;
  onClose?: () => void;
}

export default function ErrorMessage({ 
  type = 'error', 
  message, 
  details,
  onClose 
}: ErrorMessageProps) {
  const getIcon = () => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-500/10';
      case 'info':
        return 'bg-blue-500/10';
      default:
        return 'bg-red-500/10';
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'warning':
        return 'border-yellow-500/20';
      case 'info':
        return 'border-blue-500/20';
      default:
        return 'border-red-500/20';
    }
  };

  return (
    <div className={`${getBackgroundColor()} border ${getBorderColor()} rounded-lg p-4 relative animate-fade-in`}>
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1 min-w-0">
          <p className="font-medium">{message}</p>
          {details && (
            <p className="text-sm text-gray-400 mt-1">{details}</p>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XCircle className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}