"use client";
import * as React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", label, hint, id, ...props }, ref) => {
    // Always call useId, then prefer provided id. This avoids hydration mismatches.
    const autoId = React.useId();
    const inputId = id ?? autoId;
    const hintId = hint ? `${inputId}-hint` : undefined;
    return (
      <div className="w-full">
        {label ? (
          <label htmlFor={inputId} className="block text-sm font-medium mb-1">
            {label}
          </label>
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


