"use client";
import * as React from "react";

type Toast = { id: number; message: string };

const ToastContext = React.createContext<{
  toasts: Toast[];
  push: (message: string) => void;
  remove: (id: number) => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const push = (message: string) => setToasts((t) => [...t, { id: Date.now(), message }]);
  const remove = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));
  return (
    <ToastContext.Provider value={{ toasts, push, remove }}>
      {children}
      <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 space-y-2">
        {toasts.map((t) => (
          <div key={t.id} className="rounded-md bg-neutral-900 text-white px-3 py-2 shadow-lg">
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}


