import { expect, test } from "@playwright/test";

test("owner publishes channel choices and building override; tenant can open contact apps without sending", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByLabel("Email address").fill("owner@example.com");
  await page.getByLabel("Password", { exact: true }).fill("synthetic-e2e-password");
  await page.getByRole("button", { name: "Sign in to JOJOBUILDS" }).click();
  await expect(page.locator(".collection-card")).toBeVisible();
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Settings & access" }).click();
  const company = page.getByRole("region", { name: "Company contact details" });
  await expect(company.getByLabel("Company / landlord name")).toHaveValue(
    "JOJOBUILDS Demo Portfolio",
  );
  await company.getByLabel("Call phone number", { exact: true }).fill("+254700000101");
  await company.getByLabel("SMS phone number", { exact: true }).fill("+254700000102");
  await company.getByLabel("WhatsApp phone number", { exact: true }).fill("+254700000103");
  await company.getByRole("button", { name: "Save company contacts" }).click();
  await expect(company.getByRole("status")).toContainText("Company contact details saved");
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("button", { name: "Properties", exact: true })
    .click();
  await page.getByRole("button", { name: "Edit Kilimani Heights", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("WhatsApp phone number", { exact: true }).fill("+254700000104");
  await dialog.getByRole("button", { name: "Save & continue" }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.getByLabel("Email address").fill("tenant-demo@example.com");
  await page.getByLabel("Password", { exact: true }).fill("synthetic-e2e-password");
  await page.getByRole("button", { name: "Sign in to JOJOBUILDS" }).click();
  await expect(page.locator(".collection-card")).toBeVisible();
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("button", { name: "Messages", exact: true })
    .click();
  const directory = page.getByRole("region", { name: "Contact your landlord" });
  const building = directory
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Kilimani Heights", exact: true }) });
  await expect(building.getByRole("link", { name: /^Call / })).toHaveAttribute(
    "href",
    "tel:+254700000101",
  );
  await expect(building.getByRole("link", { name: /^Open SMS/ })).toHaveAttribute(
    "href",
    "sms:+254700000102",
  );
  const whatsapp = building.getByRole("link", { name: /^Open WhatsApp/ });
  await expect(whatsapp).toHaveAttribute("href", "https://wa.me/254700000104");
  await expect(whatsapp).toHaveAttribute("rel", "noopener noreferrer");
  await expect(whatsapp).toHaveAttribute("referrerpolicy", "no-referrer");
  await expect(directory).toContainText(
    "Nothing is sent or recorded in the JOJOBUILDS inbox automatically",
  );
  expect(
    await page.evaluate(() =>
      performance
        .getEntriesByType("resource")
        .some((entry) => new URL(entry.name).hostname === "wa.me"),
    ),
  ).toBe(false);
  // Restore fixture settings so unrelated scenarios retain their original scope.
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.getByLabel("Email address").fill("owner@example.com");
  await page.getByLabel("Password", { exact: true }).fill("synthetic-e2e-password");
  await page.getByRole("button", { name: "Sign in to JOJOBUILDS" }).click();
  await expect(page.locator(".collection-card")).toBeVisible();
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Settings & access" }).click();
  await company.getByLabel("Call phone number", { exact: true }).fill("");
  await company.getByLabel("SMS phone number", { exact: true }).fill("");
  await company.getByLabel("WhatsApp phone number", { exact: true }).fill("");
  await company.getByRole("button", { name: "Save company contacts" }).click();
  await expect(company.getByRole("status")).toContainText("Company contact details saved");
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("button", { name: "Properties", exact: true })
    .click();
  await page.getByRole("button", { name: "Edit Kilimani Heights", exact: true }).click();
  await dialog.getByLabel("WhatsApp phone number", { exact: true }).fill("");
  await dialog.getByRole("button", { name: "Save & continue" }).click();
  await expect(dialog).not.toBeVisible();
});
