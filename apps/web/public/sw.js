/* Only the public offline screen and versioned static assets may enter this cache. */
const CACHE = "jojobuilds-shell-v1";
const isAsset = (url) =>
  url.origin === self.location.origin && url.pathname.startsWith("/_next/static/");

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const response = await fetch("/offline", { cache: "reload", credentials: "omit" });
      if (!response.ok || !response.headers.get("content-type")?.includes("text/html"))
        throw new Error("Offline screen unavailable");
      const html = await response.clone().text();
      const cache = await caches.open(CACHE);
      await cache.put("/offline", response);
      const assets = [...html.matchAll(/(?:src|href)="([^"\s]+)"/g)]
        .map((match) => new URL(match[1].replaceAll("&amp;", "&"), self.location.origin))
        .filter(isAsset);
      await cache.addAll([...new Set(assets.map((url) => url.href))]);
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        if (name.startsWith("jojobuilds-shell-") && name !== CACHE) await caches.delete(name);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (isAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const saved = await cache.match(request);
        if (saved) return saved;
        const response = await fetch(request);
        if (response.ok && response.type === "basic") await cache.put(request, response.clone());
        return response;
      })(),
    );
  } else if (
    request.mode === "navigate" &&
    ["/", "/offline"].includes(url.pathname) &&
    !url.search
  ) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (response.ok) return response;
          throw new Error("App unavailable");
        } catch {
          return (await caches.match("/offline")) || Response.error();
        }
      })(),
    );
  }
});
