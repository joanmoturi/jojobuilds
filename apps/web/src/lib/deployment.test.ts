import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function loadConfig(netlify: string | undefined, backend?: string) {
  vi.stubEnv("NETLIFY", netlify);
  vi.stubEnv("API_INTERNAL_URL", backend);
  const { default: config } = await import("../../next.config");
  return config;
}

describe("deployment API routing", () => {
  it("preserves the loopback API for ordinary local builds", async () => {
    const config = await loadConfig(undefined);
    expect(await config.rewrites!()).toEqual([
      { source: "/api/v1/:path*", destination: "http://127.0.0.1:8000/api/v1/:path*" },
    ]);
  });

  it("preserves private Docker routing outside Netlify", async () => {
    const config = await loadConfig(undefined, "http://api:8000");
    expect(await config.rewrites!()).toEqual([
      { source: "/api/v1/:path*", destination: "http://api:8000/api/v1/:path*" },
    ]);
  });

  it("fails closed when a Netlify build has no deployed API", async () => {
    await expect(loadConfig("true")).rejects.toThrow("Netlify requires API_INTERNAL_URL");
  });

  it.each([
    "http://api.example.test",
    "https://localhost",
    "https://127.0.0.1",
    "https://[::1]",
    "https://user:password@api.example.test",
    "https://api.example.test/api/v1",
    "https://api.example.test?token=example",
    "https://api.example.test#fragment",
  ])("rejects an unsuitable Netlify API origin: %s", async (backend) => {
    await expect(loadConfig("true", backend)).rejects.toThrow(
      "Netlify API_INTERNAL_URL must be a remote HTTPS origin",
    );
  });

  it("routes same-origin API requests to the configured HTTPS service", async () => {
    const config = await loadConfig("true", "https://api.example.test/");
    expect(await config.rewrites!()).toEqual([
      { source: "/api/v1/:path*", destination: "https://api.example.test/api/v1/:path*" },
    ]);
  });
});
