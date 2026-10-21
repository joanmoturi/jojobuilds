import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "JOJOBUILDS",
  slug: "jojobuilds",
  plugins: [
    "expo-router",
    "expo-secure-store",
    [
      "expo-build-properties",
      { android: { usesCleartextTraffic: process.env.JOJOBUILDS_ALLOW_HTTP === "1" } },
    ],
  ],
});
