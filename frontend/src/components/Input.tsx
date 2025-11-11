import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-dark-text-secondary mb-2">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full px-4 py-2.5 bg-dark-bg-tertiary border rounded-lg text-dark-text-primary placeholder-dark-text-tertiary focus:outline-none focus:ring-2 focus:ring-dark-accent-primary focus:border-transparent transition-all duration-200 ${
          error 
            ? 'border-dark-accent-danger focus:ring-dark-accent-danger' 
            : 'border-dark-border-primary hover:border-dark-border-secondary'
        } ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1.5 text-sm text-dark-accent-danger flex items-center gap-1">
          <span>⚠</span>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="mt-1.5 text-sm text-dark-text-tertiary">{helperText}</p>
      )}
    </div>
  );
};
