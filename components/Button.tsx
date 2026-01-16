import React, { memo } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const baseStyles = 'font-medium rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-md active:scale-95';

const variantStyles = {
  primary: 'bg-gradient-to-r from-electric-blue-600 to-electric-blue-700 hover:from-electric-blue-500 hover:to-electric-blue-600 text-white shadow-lg shadow-electric-blue-500/30 border border-electric-blue-500/50',
  secondary: 'bg-gray-700 text-gray-200 hover:bg-gray-600 hover:text-white border border-gray-600',
  outline: 'bg-transparent border border-electric-blue-500 text-electric-blue-500 hover:bg-electric-blue-500/10 hover:text-electric-blue-400',
  danger: 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-lg shadow-red-500/30',
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
