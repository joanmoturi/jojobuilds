import type { NextConfig } from "next";

let backend = process.env.API_INTERNAL_URL || "http://127.0.0.1:8000";
if (process.env.NETLIFY === "true") {
  if (!process.env.API_INTERNAL_URL) {
    throw new Error("Netlify requires API_INTERNAL_URL for the deployed FastAPI service.");
  }
  const api = new URL(backend);
  const hostname = api.hostname.replace(/\.$/, "");
  if (
    api.protocol !== "https:" ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    /^127\./.test(hostname) ||
    hostname === "[::1]" ||
    hostname === "0.0.0.0" ||
    api.username ||
    api.password ||
    api.pathname !== "/" ||
    api.search ||
    api.hash
  ) {
    throw new Error("Netlify API_INTERNAL_URL must be a remote HTTPS origin without credentials.");
  }
  backend = api.origin;
}
const config: NextConfig = {
  output: "standalone",
  transpilePackages: ["@jojobuilds/api-client"],
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${backend}/api/v1/:path*` }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; script-src 'self' 'unsafe-inline' ${process.env.NODE_ENV === "development" ? "'unsafe-eval'" : ""}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`,
          },
        ],
      },
    ];
  },
};
export default config;
