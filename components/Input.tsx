import React, { memo } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = memo(function Input({
  label,
  error,
  className = '',
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="pixel-label mb-1">
          {label}
        </label>
      )}
      <input
        className={`pixel-input ${
          error ? '!border-[var(--pixel-accent)]' : ''
        } ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 font-pixel text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
});

export default Input;
