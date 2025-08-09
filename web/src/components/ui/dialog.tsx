"use client";
import * as React from "react";

type DialogProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
};

const DialogContext = React.createContext<{
  open: boolean;
  setOpen: (o: boolean) => void;
} | null>(null);

export function Dialog({ open: openProp, onOpenChange, children }: DialogProps) {
  const [internal, setInternal] = React.useState(false);
  const open = openProp ?? internal;
  const setOpen = (o: boolean) => {
    setInternal(o);
    onOpenChange?.(o);
  };
  return <DialogContext.Provider value={{ open, setOpen }}>{children}</DialogContext.Provider>;
}

export function DialogTrigger({ children }: { children: React.ReactNode }) {
  const ctx = React.useContext(DialogContext)!;
  return (
    <button onClick={() => ctx.setOpen(true)} className="inline-flex items-center px-3 py-1.5 rounded-md border">
      {children}
    </button>
  );
}

export function DialogContent({ children }: { children: React.ReactNode }) {
  const ctx = React.useContext(DialogContext)!;
  if (!ctx.open) return null;
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center">
      <div
        className="fixed inset-0 bg-black/50"
        role="button"
        tabIndex={0}
        aria-label="Close overlay"
        onClick={() => ctx.setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") ctx.setOpen(false);
        }}
      />
      <div className="relative z-10 w-[90vw] max-w-md rounded-xl bg-white p-4 shadow-lg">
        {children}
        <button
          aria-label="Close"
          onClick={() => ctx.setOpen(false)}
          className="absolute right-3 top-3 rounded-md p-1 text-muted hover:bg-neutral-100"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export function DialogHeader({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 text-base font-semibold">{children}</div>;
}

export function DialogFooter({ children }: { children: React.ReactNode }) {
  return <div className="mt-3 flex justify-end gap-2">{children}</div>;
}


