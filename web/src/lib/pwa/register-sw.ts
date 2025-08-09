import { Workbox } from "workbox-window";

export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  // Register only in production to avoid dev hydration/cache issues
  if (process.env.NODE_ENV !== "production") return;
  if ("serviceWorker" in navigator) {
    try {
      const wb = new Workbox("/sw.js");
      wb.register();
    } catch {
      // ignore SW errors in dev
    }
  }
}


