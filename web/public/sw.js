/* eslint-disable no-undef */
/* eslint-disable no-restricted-globals */
importScripts("https://storage.googleapis.com/workbox-cdn/releases/7.3.0/workbox-sw.js");

self.skipWaiting();
workbox.core.clientsClaim();

workbox.routing.registerRoute(
  ({ request }) => request.destination === "document" || request.destination === "",
  new workbox.strategies.NetworkFirst({ cacheName: "html-json" })
);

workbox.routing.registerRoute(
  ({ request }) => ["style", "script", "font", "image"].includes(request.destination),
  new workbox.strategies.StaleWhileRevalidate({ cacheName: "static-assets" })
);

workbox.routing.registerRoute(
  ({ url }) => url.searchParams.has("token") || url.pathname.includes("/storage/v1/object/sign/"),
  new workbox.strategies.NetworkFirst({ cacheName: "private-photos", networkTimeoutSeconds: 3 })
);


