import React, { memo } from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
  error?: string;
}

const Select = memo(function Select({
  label,
  options,
  error,
  className = '',
  ...props
}: SelectProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="pixel-label mb-1">
          {label}
        </label>
      )}
      <select
        className={`pixel-select ${
          error ? '!border-[var(--pixel-accent)]' : ''
        } ${className}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 font-pixel text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
});

export default Select;
