"use client";
import * as React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", label, hint, id, ...props }, ref) => {
    const inputId = id ?? `input-${Math.random().toString(36).slice(2, 8)}`;
    const hintId = hint ? `${inputId}-hint` : undefined;
    return (
      <div className="w-full">
        {label ? (
          <span className="block text-sm font-medium mb-1">{label}</span>
        ) : null}
        <input
          id={inputId}
          ref={ref}
          aria-describedby={hintId}
          className={`w-full h-10 px-3 rounded-md border border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 ${className}`}
          {...props}
        />
        {hint ? (
          <p id={hintId} className="mt-1 text-xs text-neutral-500">{hint}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";


