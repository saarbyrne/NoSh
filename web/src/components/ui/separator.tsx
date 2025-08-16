import * as React from "react";

type SeparatorProps = React.HTMLAttributes<HTMLDivElement> & {
  orientation?: "horizontal" | "vertical";
};

export const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  ({ className = "", orientation = "horizontal", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`shrink-0 bg-neutral-200 ${
          orientation === "horizontal" ? "h-px w-full" : "h-full w-px"
        } ${className}`}
        {...props}
      />
    );
  }
);

Separator.displayName = "Separator";
