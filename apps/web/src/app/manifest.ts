import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JOJOBUILDS Landlord and Tenancy",
    short_name: "JOJOBUILDS",
    description: "Phone-friendly rental workspace with optional read-only offline summaries.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f6f1",
    theme_color: "#132535",
    lang: "en",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
