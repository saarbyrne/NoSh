"use client";
import { Badge } from "./ui/badge";

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showUser?: boolean;
  actions?: React.ReactNode;
}

export default function Header({
  title = "NoSh",
  subtitle,
  showUser = false,
  actions
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center justify-between px-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-semibold">{title}</h1>
            <Badge variant="secondary" className="text-xs">Beta</Badge>
          </div>
          {subtitle && (
            <p className="text-sm text-muted-foreground hidden sm:block">{subtitle}</p>
          )}
        </div>

        {actions && (
          <div className="flex items-center space-x-2">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
