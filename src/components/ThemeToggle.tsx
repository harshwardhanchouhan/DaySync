import React from 'react';

interface ThemeToggleProps {
  isDark: boolean;
  onToggle: () => void;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  isDark,
  onToggle,
  className = '',
}) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-300 active:scale-95 cursor-pointer select-none ${className}`}
      style={{
        background: isDark ? '#26292B' : 'rgba(20, 20, 19, 0.05)',
        border: `1px solid ${isDark ? '#3A3E40' : 'var(--color-border)'}`,
        color: isDark ? '#E6E6E3' : 'var(--color-brown-700)',
        boxShadow: isDark
          ? '0 1px 3px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
          : '0 1px 2px rgba(0, 0, 0, 0.04)',
      }}
    >
      {/* Icon */}
      <span className="text-sm leading-none transition-transform duration-300">
        {isDark ? '🌙' : '☀️'}
      </span>

      {/* Mode Label */}
      <span className="font-pixel text-[0.55rem] tracking-wider uppercase opacity-90">
        {isDark ? 'Dark' : 'Light'}
      </span>
    </button>
  );
};
