import React from "react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "md",
  className = "",
}) => {
  const sizeStyles = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-4",
    lg: "w-12 h-12 border-4",
  };
  
  return (
    <div className={`inline-block ${className}`}>
      <div
        className={`${sizeStyles[size]} border-dark-bg-tertiary border-t-dark-accent-primary rounded-full animate-spin`}
      />
    </div>
  );
};

export default LoadingSpinner;
