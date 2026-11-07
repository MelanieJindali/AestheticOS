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
      <div aria-live="polite" className="fixed inset-x-0 bottom-24 md:bottom-6 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} role="status" className={`pointer-events-auto flex items-center gap-4 rounded-full px-5 py-3 shadow-lg text-sm ${t.tone === "error" ? "bg-red-800 text-white" : "bg-ink text-bg"}`}>
            <span>{t.message}</span>
            {t.undo && (
              <button className="font-semibold underline underline-offset-4" onClick={async () => { await t.undo?.(); setToasts((x) => x.filter((y) => y.id !== t.id)); }}>
                Undo
              </button>
            )}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
