import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "outline" | "success";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  isLoading = false,
  children,
  className = "",
  disabled,
  ...props
}) => {
  const baseStyles =
    "font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed";

  const variantStyles = {
    primary:
      "bg-dark-accent-primary text-white hover:bg-blue-600 focus:ring-dark-accent-primary shadow-lg shadow-dark-accent-primary/20 hover:shadow-xl hover:shadow-dark-accent-primary/30",
    secondary:
      "bg-dark-bg-tertiary text-dark-text-primary hover:bg-dark-bg-elevated focus:ring-dark-border-secondary border border-dark-border-primary",
    danger:
      "bg-slate-700 text-white hover:bg-slate-600 focus:ring-slate-500 shadow-lg shadow-slate-900/30 hover:shadow-xl hover:shadow-slate-800/40 active:bg-slate-800 border border-slate-600/50",
    success:
      "bg-dark-accent-success text-white hover:bg-green-600 focus:ring-dark-accent-success shadow-lg shadow-dark-accent-success/20",
    outline:
      "border-2 border-dark-border-primary text-dark-text-primary hover:bg-dark-bg-tertiary focus:ring-dark-border-secondary",
  };

  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <LoadingSpinner size="sm" />
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  );
};

// Simple inline spinner for button
const LoadingSpinner = ({ size }: { size: "sm" }) => (
  <div
    className={`${
      size === "sm" ? "w-4 h-4" : ""
    } border-2 border-white/30 border-t-white rounded-full animate-spin`}
  />
);
