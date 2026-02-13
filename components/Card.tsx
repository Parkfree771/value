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
  const baseStyles = 'transition-all duration-200';

  const variantStyles = {
    base: 'card-base',

    interactive: 'card-interactive',

    glass: 'card-base',

    elevated: 'card-base shadow-pixel-lg',
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
