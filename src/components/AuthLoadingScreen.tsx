import React from 'react';

/**
 * Clean, lightweight startup loading screen matching DaySync's tactile parchment design.
 * Rendered while initial session persistence is verified to prevent login modal flash.
 */
export const AuthLoadingScreen: React.FC = () => {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center select-none"
      style={{
        backgroundColor: 'var(--color-cream)',
        zIndex: 9999,
        fontFamily: 'var(--font-body)',
        transition: 'background-color 300ms ease',
      }}
      role="status"
      aria-live="polite"
      aria-label="Loading DaySync session..."
    >
      <div className="flex flex-col items-center gap-5 max-w-xs text-center px-6">
        {/* Animated Brand Logo Icon */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-md relative"
          style={{
            backgroundColor: 'var(--color-brown-950)',
            border: '1px solid var(--color-border)',
          }}
        >
          {/* Calendar / Clock Mark from Favicon */}
          <div
            className="w-6 h-6 rounded-xs relative flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-cream)' }}
          >
            <div
              className="absolute w-0.5 h-2.5 rounded-full"
              style={{ backgroundColor: 'var(--color-brown-950)', top: '2px', left: '11px' }}
            />
            <div
              className="absolute h-0.5 w-2 rounded-full"
              style={{ backgroundColor: 'var(--color-brown-950)', top: '10px', left: '11px' }}
            />
          </div>

          {/* Gentle Pulsing Glow Ring */}
          <div
            className="absolute inset-0 rounded-2xl animate-ping opacity-20 pointer-events-none"
            style={{ backgroundColor: 'var(--color-brown-950)' }}
          />
        </div>

        {/* Brand Title */}
        <div className="space-y-1.5">
          <h1
            className="font-pixel text-sm tracking-tight"
            style={{ color: 'var(--color-brown-950)' }}
          >
            DaySync
          </h1>
          <p
            className="text-xs font-medium tracking-normal"
            style={{ color: 'var(--color-brown-500)' }}
          >
            Restoring your schedule...
          </p>
        </div>

        {/* Minimal Progress Bar */}
        <div
          className="w-32 h-1 rounded-full overflow-hidden"
          style={{ backgroundColor: 'var(--color-brown-100)' }}
        >
          <div
            className="h-full rounded-full"
            style={{
              backgroundColor: 'var(--color-brown-950)',
              animation: 'pulse 1.2s ease-in-out infinite',
              width: '60%',
            }}
          />
        </div>
      </div>
    </div>
  );
};
