import React, { memo } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const baseStyles = "font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors duration-150";

const variantStyles = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  outline: 'bg-transparent border border-[var(--theme-border-control)] text-[var(--foreground)] rounded-sm hover:border-[var(--theme-border)]',
  danger: 'btn-danger',
} as const;

const sizeStyles = {
  sm: 'px-3 py-1.5 text-xs h-8',
  md: 'px-5 py-2 text-sm h-10',
  lg: 'px-8 py-3 text-base h-12',
} as const;

const Button = memo(function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});

export default Button;
