// Celestial Garden brand pieces: logo, fireflies, botanical sprig, moon-phase
// loader and constellation progress. Pure SVG/CSS, all original artwork.
// Ambient pieces are aria-hidden and fall back to still under reduced motion.

/**
 * Brand symbol, exactly as on the Celestial Garden brand board: a fine-line
 * crescent whose inner curve becomes a sprig of three almond leaves, with the
 * guiding four-point star. Strokes scale per the guide (≈1.5px at 48px, 2px at
 * 112px, never below 1.1px) so it stays crisp from 16px favicons to hero size.
 */
export function LogoSymbol({ size = 28, className, title }: { size?: number; className?: string; title?: string }) {
  const px = Math.max(1.1, Math.min(2.2, 1.5 + (size - 48) * (0.5 / 64)));
  const u = (px * 100) / size; // stroke in viewBox units
  const ink = "var(--c-primary)";
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} fill="none" role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <path d="M50 12 A38 38 0 0 0 50 88 A40 40 0 0 1 50 12 Z" stroke={ink} strokeWidth={u} strokeLinejoin="round" />
      <path d="M44 80 C 56 66, 60 50, 66 34" stroke={ink} strokeWidth={u * 0.89} strokeLinecap="round" />
      <path d="M52 66 c6 -8 14 -8 18 -6 c-4 6 -12 9 -18 6z" stroke={ink} strokeWidth={u * 0.78} />
      <path d="M57 53 c-8 -4 -12 -10 -12 -16 c7 2 11 8 12 16z" stroke={ink} strokeWidth={u * 0.78} />
      <path d="M62 42 c5 -8 12 -10 17 -9 c-3 6 -10 10 -17 9z" stroke={ink} strokeWidth={u * 0.78} />
      <path d="M80 8 L82.5 15.5 L90 18 L82.5 20.5 L80 28 L77.5 20.5 L70 18 L77.5 15.5 Z" fill="var(--c-accent)" />
    </svg>
  );
}

/** Horizontal lockup from the brand board: symbol, "Aesthetic OS" (OS italic), optional bronze tagline. */
export function Logo({ size = 28, tagline = false }: { size?: number; tagline?: boolean }) {
  const word = size * 0.59; // board: 66px wordmark beside a 112px symbol
  return (
    <span className="inline-flex items-center" style={{ gap: size * 0.23 }}>
      <LogoSymbol size={size} />
      <span className="flex flex-col" style={{ gap: size * 0.07 }}>
        <span className="font-heading font-medium leading-none" style={{ fontSize: Math.max(18, word), letterSpacing: "0.5px" }}>Aesthetic <em className="em">OS</em></span>
        {tagline && <span className="uppercase leading-none text-bronze" style={{ fontSize: Math.max(10, size * 0.125), letterSpacing: Math.max(2.5, size * 0.031) }}>Your business, beautifully guided</span>}
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
