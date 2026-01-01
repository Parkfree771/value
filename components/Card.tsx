import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      className={`bg-white dark:bg-gray-900 rounded-xl transition-all duration-300
        border-2 border-gray-200 dark:border-gray-700
        hover:border-electric-blue-500 dark:hover:border-electric-blue-500
        hover:scale-[1.01] hover:ring-2 hover:ring-electric-blue-500/20
        ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
