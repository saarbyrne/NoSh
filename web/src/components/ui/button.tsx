"use client";
import * as React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  fullWidth?: boolean;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", fullWidth = false, ...props }, ref) => {
    const base = "inline-flex items-center justify-center rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none transition-colors";
    const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
      primary: "bg-black text-white hover:bg-neutral-800 focus-visible:ring-neutral-500",
      secondary: "bg-neutral-100 text-neutral-900 hover:bg-neutral-200 focus-visible:ring-neutral-400",
      ghost: "bg-transparent text-neutral-900 hover:bg-neutral-100 focus-visible:ring-neutral-400",
    };
    const width = fullWidth ? "w-full" : "";
    return (
      <button ref={ref} className={`${base} h-10 px-4 ${variants[variant]} ${width} ${className}`} {...props} />
    );
  }
);

Button.displayName = "Button";


