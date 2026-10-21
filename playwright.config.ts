import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: { baseURL: "http://127.0.0.1:3011", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "powershell -NoProfile -File scripts\\e2e-api.ps1",
      url: "http://127.0.0.1:8011/ready",
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: "npm run dev --workspace=@jojobuilds/web -- --port 3011",
      url: "http://127.0.0.1:3011",
      env: { API_INTERNAL_URL: "http://127.0.0.1:8011", NEXT_TELEMETRY_DISABLED: "1" },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
