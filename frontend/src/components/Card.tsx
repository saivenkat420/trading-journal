import React from 'react';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  headerActions?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  title,
  children,
  className = '',
  headerActions,
}) => {
  return (
    <div className={`bg-dark-bg-secondary rounded-xl border border-dark-border-primary shadow-dark p-6 ${className}`}>
      {title && (
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-dark-border-primary">
          <h2 className="text-xl font-semibold text-dark-text-primary">{title}</h2>
          {headerActions && <div>{headerActions}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
};
