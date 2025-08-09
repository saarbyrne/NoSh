"use client";
import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/pwa/register-sw";
import { ToastProvider } from "@/components/ui/toast";

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    registerServiceWorker();
  }, []);
  return <ToastProvider>{children}</ToastProvider>;
}


