import React, { memo } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const baseStyles = "font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-150 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none";

const variantStyles = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  outline: 'bg-transparent border-3 border-ant-red-500 text-ant-red-500 hover:bg-ant-red-500/10 shadow-pixel',
  danger: 'bg-red-700 text-white border-3 border-red-900 shadow-pixel hover:bg-red-600',
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
