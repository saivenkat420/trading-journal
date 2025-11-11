import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  helperText,
  className = '',
  id,
  ...props
}) => {
  const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={textareaId} className="block text-sm font-medium text-dark-text-secondary mb-2">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`w-full px-4 py-2.5 bg-dark-bg-tertiary border rounded-lg text-dark-text-primary placeholder-dark-text-tertiary focus:outline-none focus:ring-2 focus:ring-dark-accent-primary focus:border-transparent transition-all duration-200 resize-y min-h-[100px] ${
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
