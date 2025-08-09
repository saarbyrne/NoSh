import { Workbox } from "workbox-window";

export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if ("serviceWorker" in navigator) {
    const wb = new Workbox("/sw.js");
    wb.addEventListener("activated", () => {
      // no-op
    });
    wb.register();
  }
}


