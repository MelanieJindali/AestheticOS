"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

interface Toast { id: number; message: string; tone: "ok" | "error"; undo?: () => void | Promise<void> }
const Ctx = createContext<(t: Omit<Toast, "id">) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((x) => [...x.slice(-2), { ...t, id }]);
    setTimeout(() => setToasts((x) => x.filter((y) => y.id !== id)), t.undo ? 8000 : 4500);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div aria-live="polite" className="fixed inset-x-0 bottom-24 md:bottom-8 z-50 flex flex-col items-center gap-2 px-6 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} role="status" className={`${t.tone === "error" ? "nudge" : "rise"} glass pointer-events-auto flex items-center gap-3 rounded-full px-5 py-3 text-sm text-ink`}>
            {t.tone === "error" ? <span className="h-1.5 w-1.5 rounded-full bg-danger" aria-hidden /> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--c-calm)" strokeWidth="1.5" strokeLinecap="round" aria-hidden><path d="M5 19c0-8 6-13 14-14-1 8-6 14-14 14zm0 0 7-7" /></svg>}
            <span>{t.message}</span>
            {t.undo && (
              <button className="font-medium text-primary underline underline-offset-4" onClick={async () => { await t.undo?.(); setToasts((x) => x.filter((y) => y.id !== t.id)); }}>Undo</button>
            )}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
