import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      className={`bg-white/80 dark:bg-gray-900/60 backdrop-blur-md rounded-xl shadow-glass hover:shadow-lg transition-all duration-300 border border-gray-200 dark:border-white/10 ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
