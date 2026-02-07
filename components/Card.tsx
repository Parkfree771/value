import React, { memo } from 'react';

interface CardProps {
  children: React.ReactNode;
  variant?: 'base' | 'interactive' | 'glass' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

const Card = memo(function Card({
  children,
  variant = 'base',
  padding = 'md',
  className = '',
  onClick,
}: CardProps) {
  const baseStyles = 'rounded-xl transition-all duration-300';

  const variantStyles = {
    base: 'bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700',

    interactive: `bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700
      hover:border-electric-blue-500 dark:hover:border-electric-blue-500
      hover:scale-[1.01] hover:ring-2 hover:ring-electric-blue-500/20
      cursor-pointer`,

    glass: `bg-white/80 dark:bg-gray-900/60 backdrop-blur-md shadow-glass
      border border-gray-200 dark:border-white/10
      hover:shadow-neon-blue`,

    elevated: `bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700
      shadow-lg hover:shadow-xl`,
  };

  const paddingStyles = {
    none: '',
    sm: 'p-3 sm:p-4',
    md: 'p-3 sm:p-6',
    lg: 'p-6 sm:p-8',
  };

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${paddingStyles[padding]} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
});

export default Card;
