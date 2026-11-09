// Celestial Garden brand pieces: logo, fireflies, botanical sprig, moon-phase
// loader and constellation progress. Pure SVG/CSS, all original artwork.
// Ambient pieces are aria-hidden and fall back to still under reduced motion.

/** Crescent moon whose inner curve becomes a leaf sprig, with the guiding star. */
export function LogoSymbol({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden className={className} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M50 12 A38 38 0 0 0 50 88 A40 40 0 0 1 50 12 Z" stroke="var(--c-primary)" strokeWidth="5" />
      <path d="M44 80 C 56 66, 60 50, 66 34" stroke="var(--c-primary)" strokeWidth="5" />
      <path d="M53 62 c7 -2 12 1 14 6 M58 48 c-6 -3 -8 -8 -7 -13" stroke="var(--c-primary)" strokeWidth="4" />
      <path d="M80 8 L82.5 15.5 L90 18 L82.5 20.5 L80 28 L77.5 20.5 L70 18 L77.5 15.5 Z" fill="var(--c-accent)" />
    </svg>
  );
}

/** Horizontal lockup: symbol + "Aesthetic OS" (OS in italic). */
export function Logo({ size = 28, tagline = false }: { size?: number; tagline?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoSymbol size={size} />
      <span className="flex flex-col leading-none">
        <span className="font-heading font-medium tracking-[0.02em]" style={{ fontSize: size * 0.85 }}>Aesthetic <em className="em">OS</em></span>
        {tagline && <span className="mt-1 text-[10px] uppercase tracking-[2.5px] text-muted">Your business, beautifully guided</span>}
      </span>
    </span>
  );
}

/** 6–8 fireflies drifting on slow, deterministic paths. Max one cluster per screen. */
export function Fireflies({ count = 6, seed = 5, className = "" }: { count?: number; seed?: number; className?: string }) {
  let s = seed;
  const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const flies = Array.from({ length: Math.min(count, 10) }, () => {
    const size = 3 + Math.round(r() * 2);
    return { left: `${Math.round(4 + r() * 90)}%`, top: `${Math.round(4 + r() * 88)}%`, width: size, height: size, animationDuration: `${(10 + r() * 6).toFixed(1)}s, ${(4 + r() * 3).toFixed(1)}s`, animationDelay: `${(-r() * 10).toFixed(1)}s` };
  });
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {flies.map((f, i) => <span key={i} className="firefly" style={f} />)}
    </div>
  );
}

/** Fine botanical line art (eucalyptus sprig) that sways ±2° around its stem. */
export function Sprig({ className = "", width = 120 }: { className?: string; width?: number }) {
  return (
    <svg className={`sway pointer-events-none ${className}`} aria-hidden width={width} height={width * 1.25} viewBox="0 0 120 150" fill="none" stroke="var(--c-calm)" strokeWidth="1.2">
      <path d="M10 145 C 40 110, 70 70, 110 10" />
      <path d="M32 116 c6 -9 18 -11 26 -7 c-5 8 -16 11 -26 7z" />
      <path d="M50 92 c-12 -4 -18 -12 -18 -22 c10 3 17 11 18 22z" />
      <path d="M68 66 c6 -9 18 -11 26 -7 c-5 8 -16 11 -26 7z" />
      <path d="M86 42 c-10 -4 -15 -11 -15 -19 c8 3 14 10 15 19z" />
    </svg>
  );
}

/** Moon waxing and waning: loading indicator. */
export function MoonLoader({ label = "Loading" }: { label?: string }) {
  return (
    <span role="status" aria-label={label} className="inline-grid place-items-center">
      <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
        <circle cx="22" cy="22" r="16" fill="none" stroke="var(--c-accent)" strokeWidth="1.2" opacity="0.5" />
        <circle cx="22" cy="22" r="16" fill="var(--c-accent)" style={{ animation: "wax 2.4s var(--ease-drift) infinite" }} />
      </svg>
    </span>
  );
}

/**
 * Weekly intention as a constellation: each task is a star; completed tasks
 * bloom into five-petal flowers joined by honey-gold lines.
 */
export function Constellation({ total, done, label }: { total: number; done: number; label: string }) {
  const n = Math.max(1, Math.min(total, 7));
  const pts = Array.from({ length: n }, (_, i) => ({ x: 14 + (i * 286) / Math.max(1, n - 1), y: [70, 34, 56, 18, 52, 26, 60][i % 7] }));
  const petals = (x: number, y: number) => Array.from({ length: 5 }, (_, k) => {
    const a = (k * 72 - 90) * (Math.PI / 180);
    return <circle key={k} cx={x + Math.cos(a) * 6.5} cy={y + Math.sin(a) * 6.5} r="4.2" fill="var(--c-warm)" stroke="var(--c-accent)" strokeWidth="0.8" />;
  });
  return (
    <svg viewBox="0 0 314 86" className="w-full h-auto" role="img" aria-label={label}>
      {pts.slice(1).map((p, i) => (
        <line key={i} x1={pts[i].x} y1={pts[i].y} x2={p.x} y2={p.y} stroke={i < done - 1 ? "var(--c-accent)" : "var(--c-lilac)"} strokeWidth={i < done - 1 ? 1.2 : 1} strokeDasharray={i < done - 1 ? undefined : "3 4"} className={i === done - 2 ? "draw" : undefined} />
      ))}
      {pts.map((p, i) => i < done ? (
        <g key={i} className="bloom" style={{ animationDelay: `${300 + i * 60}ms` }}>{petals(p.x, p.y)}<circle cx={p.x} cy={p.y} r="3.4" fill="var(--c-accent)" /></g>
      ) : (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="none" stroke="var(--c-calm)" strokeWidth="1.2" />
      ))}
    </svg>
  );
}
