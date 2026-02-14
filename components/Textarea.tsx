import React, { memo } from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = memo(function Textarea({
  label,
  error,
  className = '',
  ...props
}: TextareaProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="pixel-label mb-1">
          {label}
        </label>
      )}
      <textarea
        className={`pixel-input resize-vertical ${
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

export default Textarea;
