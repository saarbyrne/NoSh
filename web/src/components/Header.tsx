"use client";
import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { User, Bell, Settings } from "lucide-react";
import Link from "next/link";

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showUser?: boolean;
  actions?: React.ReactNode;
}

export default function Header({ 
  title = "NoSh", 
  subtitle, 
  showUser = true, 
  actions 
}: HeaderProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await getSupabaseClient().auth.getUser();
        setUser(user);
      } catch (error) {
        console.error("Error getting user:", error);
      } finally {
        setLoading(false);
      }
    };

    if (showUser) {
      getUser();
    } else {
      setLoading(false);
    }
  }, [showUser]);

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

        <div className="flex items-center space-x-2">
          {actions}
          
          {showUser && !loading && (
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/settings">
                  <Bell className="h-4 w-4" />
                  <span className="sr-only">Notifications</span>
                </Link>
              </Button>
              
              <Button variant="ghost" size="sm" asChild>
                <Link href="/settings">
                  <Settings className="h-4 w-4" />
                  <span className="sr-only">Settings</span>
                </Link>
              </Button>
              
              {user && (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/settings">
                    <div className="flex items-center space-x-2">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-3 w-3" />
                      </div>
                      <span className="hidden sm:inline text-sm">
                        {user.email?.split('@')[0] || 'User'}
                      </span>
                    </div>
                  </Link>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}