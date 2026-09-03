import { useEffect, useState } from 'react';

/**
 * Premium minimal scroll-driven background.
 * Monochromatic warm cream/stone/brown tones only — no saturated colors.
 * Fully reversible parallax on scroll.
 */
export const ScrollBackground: React.FC = () => {
  const [y, setY] = useState(0);

  useEffect(() => {
    let ticking = false;

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setY(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 0,
        opacity: 0.4,
      }}
    >
      {/* ── Soft Graphite Haze (top-left, drifts gently down-right) ─── */}
      <div
        style={{
          position: 'absolute',
          top: '-80px',
          left: '-60px',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(190, 190, 185, 0.45) 0%, rgba(190, 190, 185, 0.12) 50%, transparent 72%)',
          filter: 'blur(60px)',
          transform: `translate3d(${y * 0.08}px, ${y * 0.12}px, 0)`,
          willChange: 'transform',
        }}
      />

      {/* ── Cool Slate Whisper (bottom-right, drifts up-left) ─── */}
      <div
        style={{
          position: 'absolute',
          bottom: '-40px',
          right: '-80px',
          width: '550px',
          height: '550px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(160, 160, 155, 0.35) 0%, rgba(160, 160, 155, 0.08) 50%, transparent 70%)',
          filter: 'blur(70px)',
          transform: `translate3d(${-y * 0.06}px, ${-y * 0.1}px, 0)`,
          willChange: 'transform',
        }}
      />

      {/* ── Faint Center Haze ─── */}
      <div
        style={{
          position: 'absolute',
          top: '35%',
          left: '50%',
          marginLeft: '-200px',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(215, 214, 209, 0.4) 0%, transparent 65%)',
          filter: 'blur(50px)',
          transform: `translate3d(${-y * 0.03}px, ${y * 0.06}px, 0) scale(${1 + y * 0.00015})`,
          willChange: 'transform',
        }}
      />

      {/* ── Geometric Accents (monochrome, editorial) ─── */}

      {/* Thin cross — upper left */}
      <svg
        width="20" height="20" viewBox="0 0 20 20"
        style={{
          position: 'absolute',
          top: '160px',
          left: '10%',
          transform: `translate3d(0px, ${-y * 0.3}px, 0) rotate(${y * 0.15}deg)`,
          willChange: 'transform',
          opacity: 0.55,
        }}
      >
        <line x1="10" y1="1" x2="10" y2="19" stroke="#A4A49F" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="1" y1="10" x2="19" y2="10" stroke="#A4A49F" strokeWidth="1.5" strokeLinecap="round" />
      </svg>

      {/* Dashed ring — right side */}
      <svg
        width="36" height="36" viewBox="0 0 36 36"
        style={{
          position: 'absolute',
          top: '340px',
          right: '8%',
          transform: `translate3d(0px, ${-y * 0.45}px, 0) rotate(${-y * 0.12}deg)`,
          willChange: 'transform',
          opacity: 0.45,
        }}
      >
        <circle cx="18" cy="18" r="14" stroke="#C9C8C3" strokeWidth="1.2" strokeDasharray="3.5 3" fill="none" />
      </svg>

      {/* Small diamond — left mid */}
      <svg
        width="14" height="14" viewBox="0 0 14 14"
        style={{
          position: 'absolute',
          top: '540px',
          left: '15%',
          transform: `translate3d(0px, ${-y * 0.35}px, 0) rotate(${45 + y * 0.1}deg)`,
          willChange: 'transform',
          opacity: 0.5,
        }}
      >
        <rect x="1" y="1" width="12" height="12" rx="1" stroke="#A4A49F" strokeWidth="1.2" fill="none" />
      </svg>

      {/* Tiny dot pair — right lower */}
      <div
        style={{
          position: 'absolute',
          top: '700px',
          right: '12%',
          transform: `translate3d(0px, ${-y * 0.5}px, 0)`,
          willChange: 'transform',
          opacity: 0.45,
          display: 'flex',
          flexDirection: 'column' as const,
          gap: '6px',
        }}
      >
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#C9C8C3' }} />
        <div style={{ width: 3, height: 3, borderRadius: '50%', background: '#C9C8C3', marginLeft: 4 }} />
      </div>

      {/* Single thin horizontal rule accent */}
      <div
        style={{
          position: 'absolute',
          top: '880px',
          left: '8%',
          width: '28px',
          height: '1.5px',
          borderRadius: '2px',
          background: '#C9C8C3',
          transform: `translate3d(0px, ${-y * 0.4}px, 0)`,
          willChange: 'transform',
          opacity: 0.5,
        }}
      />

      {/* ── Subtle dot grid that scrolls at a slower parallax rate ─── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(160, 160, 155, 0.14) 0.8px, transparent 0)',
          backgroundSize: '40px 40px',
          backgroundPosition: `0px ${-y * 0.1}px`,
          willChange: 'background-position',
        }}
      />
    </div>
  );
};
