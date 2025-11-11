import React from 'react';

interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  onDismiss,
  className = '',
}) => {
  return (
    <div className={`bg-dark-accent-danger/10 border border-dark-accent-danger/30 text-dark-accent-danger px-4 py-3 rounded-lg relative ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-lg">⚠</span>
        <span className="flex-1 font-medium">{message}</span>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-4 text-dark-accent-danger hover:text-red-400 transition-colors text-xl font-bold leading-none"
            aria-label="Dismiss"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};
