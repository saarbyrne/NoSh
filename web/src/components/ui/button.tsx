"use client";
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "outline" | "destructive";
  size?: "sm" | "default" | "lg";
  fullWidth?: boolean;
  asChild?: boolean;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "default", fullWidth = false, asChild = false, ...props }, ref) => {
    const base = "inline-flex items-center justify-center rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none transition-colors";
    const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
      primary: "bg-primary text-primary-foreground hover:bg-primary/90",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      ghost: "hover:bg-accent hover:text-accent-foreground",
      outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
      destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    };
    const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
      sm: "h-8 px-3 text-xs",
      default: "h-10 px-4",
      lg: "h-11 px-8",
    };
    const width = fullWidth ? "w-full" : "";
    const classes = `${base} ${sizes[size]} ${variants[variant]} ${width} ${className}`;
    
    const Comp = asChild ? Slot : "button";
    
    return (
      <Comp ref={ref} className={classes} {...props} />
    );
  }
);

Button.displayName = "Button";


