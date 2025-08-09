"use client";
import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/pwa/register-sw";
import { ToastProvider } from "@/components/ui/toast";
import { getSupabaseClient } from "@/lib/supabaseClient";

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    registerServiceWorker();
    // Ensure Supabase picks up magic link session from URL hash
    try {
      const client = getSupabaseClient();
      client.auth.getSession();
    } catch {}
  }, []);
  return <ToastProvider>{children}</ToastProvider>;
}


