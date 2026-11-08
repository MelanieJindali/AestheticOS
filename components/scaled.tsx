"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Scales a fixed-size design (e.g. 1080×1350) to fit its container. */
export function Scaled({ width, height, children, label, className }: { width: number; height: number; children: ReactNode; label: string; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.25);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);
  return (
    <div ref={box} role="img" aria-label={label} className={`relative w-full overflow-hidden rounded-2xl ring-1 ring-line ${className ?? ""}`} style={{ aspectRatio: `${width} / ${height}` }}>
      <div aria-hidden style={{ width, height, transform: `scale(${scale})`, transformOrigin: "top left", position: "absolute", inset: 0 }}>{children}</div>
    </div>
  );
}
