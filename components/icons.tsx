// Thin outline icons (1.5px stroke, rounded caps). Decorative by default.
import type { SVGProps } from "react";

const PATHS = {
  today: "M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z",
  create: "M12 5v14M5 12h14",
  plan: "M4.5 6.5h15v13h-15zM4.5 10.5h15M9 4v4M15 4v4",
  muse: "M5 19c0-8 6-13 14-14-1 8-6 14-14 14zm0 0 7-7",
  brand: "M12 4a8 8 0 1 0 0 16c.9 0 1.4-.6 1.4-1.3 0-.9-.7-1.3-.7-2.1 0-.8.6-1.5 1.5-1.5H16a4 4 0 0 0 4-4C20 7.4 16.4 4 12 4zM8 11.5h.01M10.5 8h.01M14.5 8.5h.01",
  settings: "M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 12a7.5 7.5 0 0 1 .2-1.7l-1.9-1.4 2-3.4 2.2.9a7.5 7.5 0 0 1 2.9-1.7L10.2 2h3.6l.3 2.7a7.5 7.5 0 0 1 2.9 1.7l2.2-.9 2 3.4-1.9 1.4a7.5 7.5 0 0 1 0 3.4l1.9 1.4-2 3.4-2.2-.9a7.5 7.5 0 0 1-2.9 1.7l-.3 2.7h-3.6l-.3-2.7a7.5 7.5 0 0 1-2.9-1.7l-2.2.9-2-3.4 1.9-1.4a7.5 7.5 0 0 1-.2-1.7z",
  lock: "M7 10.5V8a5 5 0 0 1 10 0v2.5M5.5 10.5h13v9h-13zM12 14.5v1.5",
  camera: "M4 8h3.5L9 5.5h6L16.5 8H20v11H4zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
  check: "M5 12.5 10 17l9-10",
  alert: "M12 8v5M12 16.5h.01M10.3 4.3 2.8 17.5A2 2 0 0 0 4.5 20.5h15a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z",
  close: "M6 6l12 12M18 6 6 18",
  back: "M14.5 6 8.5 12l6 6",
  next: "M9.5 6l6 6-6 6",
  sparkle: "M12 3.5 13.8 10l6.7 2-6.7 2L12 20.5 10.2 14l-6.7-2 6.7-2z",
  download: "M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14",
  copy: "M9 9h10v11H9zM5 15V4h10",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...rest}>
      <path d={PATHS[name]} />
    </svg>
  );
}

/** "Private to you" reassurance shown wherever data is entered. */
export function PrivateNote({ text = "Private to you" }: { text?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <Icon name="lock" size={14} /> {text}
    </span>
  );
}
