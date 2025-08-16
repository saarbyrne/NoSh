"use client";
import * as React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "default" | "lg";
  fullWidth?: boolean;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "default", fullWidth = false, ...props }, ref) => {
    const base = "inline-flex items-center justify-center rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none transition-colors";
    const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
      primary: "bg-black text-white hover:bg-neutral-800 focus-visible:ring-neutral-500",
      secondary: "bg-neutral-100 text-neutral-900 hover:bg-neutral-200 focus-visible:ring-neutral-400",
      ghost: "bg-transparent text-neutral-900 hover:bg-neutral-100 focus-visible:ring-neutral-400",
      outline: "border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50 focus-visible:ring-neutral-400",
    };
    const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
      sm: "h-8 px-3 text-xs",
      default: "h-10 px-4",
      lg: "h-11 px-8",
    };
    const width = fullWidth ? "w-full" : "";
    return (
      <button ref={ref} className={`${base} ${sizes[size]} ${variants[variant]} ${width} ${className}`} {...props} />
    );
  }
);

Button.displayName = "Button";


