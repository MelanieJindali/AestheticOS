"use client";

import { useRef, useState } from "react";

/** Captures a signature as a sanitised SVG path (no images, no scripts). */
export function SignaturePad({ onChange }: { onChange: (svg: string | null) => void }) {
  const ref = useRef<SVGSVGElement>(null);
  const [paths, setPaths] = useState<string[]>([]);
  const drawing = useRef(false);

  const point = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return `${(((e.clientX - r.left) / r.width) * 600).toFixed(1)} ${(((e.clientY - r.top) / r.height) * 200).toFixed(1)}`;
  };
  const emit = (ps: string[]) => onChange(ps.length ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 200">${ps.map((d) => `<path d="${d}" fill="none" stroke="#111" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`).join("")}</svg>` : null);

  return (
    <div>
      <svg ref={ref} viewBox="0 0 600 200" className="w-full h-40 rounded-[var(--radius-item)] border border-dashed border-accent bg-white touch-none" role="img" aria-label="Signature area. Draw with your finger."
        onPointerDown={(e) => { (e.target as Element).setPointerCapture(e.pointerId); drawing.current = true; setPaths((p) => [...p, `M${point(e)}`]); }}
        onPointerMove={(e) => { if (!drawing.current) return; setPaths((p) => { const c = [...p]; c[c.length - 1] += ` L${point(e)}`; return c; }); }}
        onPointerUp={() => { drawing.current = false; setPaths((p) => { emit(p); return p; }); }}>
        {paths.map((d, i) => <path key={i} d={d} fill="none" stroke="#111" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />)}
        {!paths.length && <text x="300" y="110" textAnchor="middle" fill="#999" fontSize="20">Client signs here</text>}
      </svg>
      <button type="button" className="mt-1 text-sm text-primary" onClick={() => { setPaths([]); emit([]); }}>Clear</button>
    </div>
  );
}
