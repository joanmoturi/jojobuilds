import { expect, test } from "@playwright/test";

test("policies remain public, no unsolicited offline storage, phone sign-in is keyboard accessible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Sign in to JOJOBUILDS" })).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("jojobuilds-offline-summary-v1")),
  ).toBeNull();
  expect(
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length),
  ).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  const contrast = await page
    .locator(".login-form > p, .form-privacy, .login-form .button.primary, .policy-links a")
    .evaluateAll((elements) => {
      const luminance = (color: string) => {
        const channels = color
          .match(/[\d.]+/g)!
          .slice(0, 3)
          .map(Number)
          .map((value) => {
            const channel = value / 255;
            return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
          });
        return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
      };
      return elements.map((element) => {
        let background = "rgb(255, 255, 255)";
        for (let ancestor: Element | null = element; ancestor; ancestor = ancestor.parentElement) {
          const color = getComputedStyle(ancestor).backgroundColor;
          if (color.startsWith("rgb(") || (color.startsWith("rgba(") && color.endsWith(", 1)"))) {
            background = color;
            break;
          }
        }
        const text = luminance(getComputedStyle(element).color);
        const surface = luminance(background);
        return (Math.max(text, surface) + 0.05) / (Math.min(text, surface) + 0.05);
      });
    });
  expect(contrast.length).toBeGreaterThan(0);
  expect(contrast.every((ratio) => ratio >= 4.5)).toBe(true);
  await page.getByLabel("Email address").fill("owner@example.com");
  await page.getByLabel("Email address").press("Tab");
  await expect(page.getByLabel("Password", { exact: true })).toBeFocused();
  const manifest = await (await page.request.get("/manifest.webmanifest")).json();
  expect(manifest.display).toBe("standalone");
  for (const [slug, heading] of [
    ["privacy", "Privacy policy"],
    ["terms", "Terms and conditions"],
    ["cookies", "Cookie and device-storage policy"],
    ["refunds", "Refund policy"],
  ]) {
    await page.goto(`/legal/${slug}`);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await expect(
      page.getByText("Public contact details are incomplete.", { exact: false }),
    ).toBeVisible();
  }
  const scripts = await page
    .locator("script[src]")
    .evaluateAll((elements) => elements.map((element) => (element as HTMLScriptElement).src));
  expect(scripts.every((src) => new URL(src).origin === new URL(page.url()).origin)).toBe(true);
  expect(await page.locator("iframe, img:not([alt])").count()).toBe(0);
});

test("saved summaries need opt-in, exclude personal data, and clear on logout", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByLabel("Email address").fill("owner@example.com");
  await page.getByLabel("Password", { exact: true }).fill("synthetic-e2e-password");
  await page.getByRole("button", { name: "Sign in to JOJOBUILDS" }).click();
  await expect(page.locator(".collection-card")).toBeVisible();
  await expect(page.getByRole("button", { name: "Record payment", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.getByRole("link", { name: "JOJOBUILDS home" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused();
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Settings & access" }).click();
  await expect(page.getByRole("heading", { name: "Offline summary and backup" })).toBeVisible();
  await page.getByRole("button", { name: "Save summary", exact: true }).click();
  expect(
    await page.evaluate(() => localStorage.getItem("jojobuilds-offline-summary-v1")),
  ).toBeNull();
  await page.getByLabel("Save totals on this device.", { exact: false }).check();
  await page.getByRole("button", { name: "Save summary", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Selected totals saved");
  const saved = await page.evaluate(() => localStorage.getItem("jojobuilds-offline-summary-v1"));
  expect(saved).toBeTruthy();
  expect(saved).not.toMatch(/email|csrf|session|tenant_name|password/);
  await page.goto("/offline");
  await expect(page.getByRole("region", { name: "Saved totals" })).toBeVisible();
  await page.getByRole("button", { name: "Open online workspace" }).click();
  await expect(page.locator(".collection-card")).toBeVisible();
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign in to JOJOBUILDS" })).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("jojobuilds-offline-summary-v1")),
  ).toBeNull();
});

test("production PWA reloads offline, never caches API data and removes app storage on withdrawal", async ({
  page,
  context,
}) => {
  test.skip(
    process.env.PWA_TEST_PRODUCTION !== "1",
    "Service workers are deliberately disabled for development builds.",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByLabel("Email address").fill("owner@example.com");
  await page.getByLabel("Password", { exact: true }).fill("synthetic-e2e-password");
  await page.getByRole("button", { name: "Sign in to JOJOBUILDS" }).click();
  await expect(page.locator(".collection-card")).toBeVisible();
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Settings & access" }).click();
  await page.getByLabel("Save totals on this device.", { exact: false }).check();
  await page.getByRole("button", { name: "Save summary", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Selected totals saved");
  await page.getByText("Install app / offline access", { exact: true }).click();
  await page.getByRole("button", { name: "Enable offline app access", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Offline app access enabled" }),
  ).toBeVisible({ timeout: 35_000 });
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);
  const cached = await page.evaluate(async () => {
    const cache = await caches.open("jojobuilds-shell-v1");
    return (await cache.keys()).map((request) => new URL(request.url).pathname);
  });
  expect(cached).toContain("/offline");
  expect(cached.every((path) => path === "/offline" || path.startsWith("/_next/static/"))).toBe(
    true,
  );
  await context.setOffline(true);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Read-only offline summary" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Saved totals" })).toBeVisible();
  expect(
    await page.evaluate(async () => {
      try {
        await fetch("/api/v1/auth/session");
        return true;
      } catch {
        return false;
      }
    }),
  ).toBe(false);
  await page.reload();
  await expect(page.getByRole("region", { name: "Saved totals" })).toBeVisible();
  await page.getByText("Install app / offline access", { exact: true }).click();
  await page.getByRole("button", { name: "Disable offline app access and clear summary" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Offline app cache and saved summary removed" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("jojobuilds-offline-summary-v1")),
  ).toBeNull();
  expect(
    await page.evaluate(
      async () =>
        (await caches.keys()).filter((name) => name.startsWith("jojobuilds-shell-")).length,
    ),
  ).toBe(0);
  await context.setOffline(false);
});
