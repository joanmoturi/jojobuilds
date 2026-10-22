import { expect, test } from "@playwright/test";

test("landlord creates persisted records, reconciles a statement and completes maintenance", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Email address").fill("owner@example.com");
  await page.getByLabel("Password", { exact: true }).fill("synthetic-e2e-password");
  await page.getByRole("button", { name: "Sign in to JOJOBUILDS" }).click();
  await expect(page.getByRole("heading", { name: "Looking good, Demo." })).toBeVisible();
  await expect(page.locator(".demo-banner")).toContainText(
    "All names, payments and records are synthetic.",
  );
  await expect(page.locator(".collection-card")).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath("desktop-overview.png"),
    fullPage: true,
  });
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Properties", exact: true })
    .click();
  await page.getByRole("button", { name: "Add property", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Property name").fill("Synthetic E2E Property");
  await dialog.getByLabel("Address / location").fill("Nairobi test location");
  await dialog.getByRole("button", { name: "Save & continue" }).click();
  await expect(page.getByRole("heading", { name: "Synthetic E2E Property" })).toBeVisible();
  await page.getByRole("button", { name: "Add unit", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByRole("combobox", { name: "Property", exact: true })
    .selectOption({ label: "Synthetic E2E Property" });
  await dialog.getByRole("combobox", { name: "Unit use", exact: true }).selectOption("commercial");
  await dialog.getByLabel("Unit label", { exact: true }).fill("TEST-01");
  await dialog.getByLabel("Unit specification", { exact: true }).fill("Rental stall");
  await dialog.getByLabel("Default monthly rent").fill("10000");
  await dialog.getByRole("button", { name: "Save & continue" }).click();
  await expect(dialog).not.toBeVisible();

  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Tenants", exact: true })
    .click();
  await page.getByRole("button", { name: "Onboard tenant" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Full name").fill("Synthetic Browser Tenant");
  await dialog.getByLabel("Email address").fill("browser-tenant@example.com");
  await dialog.getByRole("button", { name: "Save & continue" }).click();
  await expect(page.getByText("Synthetic Browser Tenant", { exact: true })).toBeVisible();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Properties", exact: true })
    .click();
  const property = page.locator(".property-card").filter({
    has: page.getByRole("heading", { name: "Synthetic E2E Property", exact: true }),
  });
  await expect(property).toContainText("Commercial units");
  await property.getByRole("button", { name: "View units", exact: true }).click();
  const unit = property.locator(".unit-spec").filter({ hasText: "Unit TEST-01" });
  await expect(unit).toContainText("Rental stall");
  await expect(unit).toContainText("No active tenancy");
  await unit.getByRole("button", { name: "Edit unit", exact: true }).click();
  dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("combobox", { name: "Unit use", exact: true })).toHaveValue(
    "commercial",
  );
  await expect(dialog.getByLabel("Unit specification", { exact: true })).toHaveValue(
    "Rental stall",
  );
  await dialog.getByLabel("Default monthly rent").fill("12000");
  await dialog.getByRole("button", { name: "Save & continue" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(unit).toContainText(/Ksh\s12,000\.00/);
  await unit.getByRole("button", { name: "Assign tenant", exact: true }).click();
  dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("combobox", { name: "Vacant unit" }).locator("option:checked"),
  ).toHaveText("Synthetic E2E Property · Main TEST-01");
  await expect(dialog.getByLabel("Agreed monthly rent")).toHaveValue("12000.00");
  await dialog
    .getByRole("combobox", { name: "Tenant", exact: true })
    .selectOption({ label: "Synthetic Browser Tenant" });
  await dialog
    .getByRole("combobox", { name: "Vacant unit" })
    .selectOption({ label: "Synthetic E2E Property · Main TEST-01" });
  await dialog.getByLabel("Unique payment reference").fill("JOJO-E2E");
  await dialog.getByLabel("Agreed monthly rent").fill("10000");
  await dialog.getByLabel("Start date").fill("2026-01-01");
  await dialog.getByRole("button", { name: "Save & continue" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(unit).toContainText("Synthetic Browser Tenant");
  await expect(unit).toContainText(/Ksh\s10,000\.00/);

  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Payments", exact: true })
    .click();
  await page.getByRole("button", { name: "Generate rent" }).click();
  await expect(page.locator("tr").filter({ hasText: "Synthetic Browser Tenant" })).toBeVisible();
  await page.getByRole("button", { name: "Record payment", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByRole("combobox", { name: "Tenancy", exact: true })
    .selectOption({ label: "Synthetic Browser Tenant · JOJO-E2E" });
  await dialog.getByLabel("Amount received").fill("2500");
  await dialog.getByLabel("Transaction reference").fill("SYNTHETIC-PARTIAL");
  await dialog.getByRole("button", { name: "Save & continue" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page
      .locator("tr")
      .filter({ hasText: "Synthetic Browser Tenant" })
      .filter({ hasText: "Rent for" })
      .getByRole("cell", { name: /^Ksh\s7,500\.00$/ }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Import statement", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByRole("combobox", { name: "Property", exact: true })
    .selectOption({ label: "Synthetic E2E Property" });
  await dialog.getByLabel("Bank account nickname").fill("Synthetic test bank");
  await dialog.getByLabel("Statement file").setInputFiles({
    name: "synthetic.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "date,amount,description,reference\n2026-01-10,7500,Rent JOJO-E2E,BROWSER001\n",
    ),
  });
  await dialog.getByRole("button", { name: "Read column headers" }).click();
  await dialog.getByRole("button", { name: "Preview transactions" }).click();
  await expect(dialog.getByText("1 valid transactions.")).toBeVisible();
  await dialog.getByRole("button", { name: "Import for review" }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("button", { name: /Reconcile/ }).click();
  const card = page.locator(".reconcile-card").filter({ hasText: "BROWSER001" });
  await card.getByLabel("Review reason").fill("Checked synthetic bank statement and reference");
  await card.getByRole("button", { name: "Confirm & post" }).click();
  await expect(card).not.toBeVisible();
  await page.getByRole("button", { name: "Invoices", exact: true }).click();
  await expect(
    page.locator("tr").filter({ hasText: "Synthetic Browser Tenant" }).first(),
  ).toContainText("Settled");

  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Maintenance", exact: true })
    .click();
  await page.getByRole("button", { name: "New request" }).click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByRole("combobox", { name: "Property", exact: true })
    .selectOption({ label: "Synthetic E2E Property" });
  await dialog.getByLabel("Short title").fill("Synthetic E2E tap");
  await dialog.getByLabel("Describe the problem").fill("Synthetic browser maintenance request");
  await dialog.getByRole("button", { name: "Save & continue" }).click();
  const request = page.locator(".maintenance-card").filter({ hasText: "Synthetic E2E tap" });
  for (const status of ["acknowledged", "in_progress", "resolved"]) {
    await request.getByRole("button", { name: "Update request" }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByRole("combobox", { name: "Status", exact: true }).selectOption(status);
    await dialog
      .getByLabel("Tenant-visible progress note")
      .fill(`Synthetic status update: ${status}`);
    await dialog.getByRole("button", { name: "Save & continue" }).click();
    await expect(dialog).not.toBeVisible();
  }
  await expect(request).not.toBeVisible();
  await page.reload();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Properties", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Synthetic E2E Property" })).toBeVisible();
  await property.getByRole("button", { name: "View units", exact: true }).click();
  await unit.getByRole("button", { name: "Add bill", exact: true }).click();
  dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("combobox", { name: "Tenancy", exact: true }).locator("option:checked"),
  ).toHaveText("Synthetic Browser Tenant · JOJO-E2E");
  await dialog.getByRole("combobox", { name: "Charge type", exact: true }).selectOption("water");
  await dialog.getByLabel("Description", { exact: true }).fill("Synthetic stall water bill");
  await dialog.getByLabel(/^Amount \(/).fill("800");
  await dialog.getByRole("button", { name: "Save & continue" }).click();
  await expect(unit).toContainText("Synthetic stall water bill");
  await expect(unit).toContainText(/Ksh\s800\.00/);
  await unit.getByRole("button", { name: "Set recurring bill", exact: true }).click();
  dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("combobox", { name: "Tenancy", exact: true }).locator("option:checked"),
  ).toHaveText("Synthetic Browser Tenant · JOJO-E2E");
  await dialog.getByLabel("Description", { exact: true }).fill("Synthetic stall service charge");
  await dialog.getByRole("combobox", { name: "Charge type", exact: true }).selectOption("service");
  await dialog.getByLabel("Monthly amount").fill("500");
  await dialog.getByRole("button", { name: "Save record" }).click();
  await expect(unit).toContainText("Synthetic stall service charge");
  await page.screenshot({
    path: test.info().outputPath("commercial-unit-details.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Email address")).toBeVisible();
});

test("mobile web stays usable and shows JOJOBUILDS branding", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByLabel("Email address").fill("owner@example.com");
  await page.getByLabel("Password", { exact: true }).fill("synthetic-e2e-password");
  await page.getByRole("button", { name: "Sign in to JOJOBUILDS" }).click();
  await expect(page.getByRole("heading", { name: "Looking good, Demo." })).toBeVisible();
  await expect(page.locator(".collection-card")).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath("mobile-overview.png"),
    fullPage: true,
  });
  const layout = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
    overflowing: Array.from(document.querySelectorAll("*"))
      .filter((element) => element.getBoundingClientRect().right > window.innerWidth)
      .slice(0, 12)
      .map((element) => ({
        tag: element.tagName,
        className: element.getAttribute("class"),
        right: element.getBoundingClientRect().right,
        overflow: getComputedStyle(element).overflow,
      })),
  }));
  expect(layout.width, JSON.stringify(layout.overflowing)).toBeLessThanOrEqual(layout.viewport);
  const paymentTable = page.locator(".table-wrap").first();
  expect(await paymentTable.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(
    true,
  );
  await paymentTable.scrollIntoViewIfNeeded();
  await paymentTable.evaluate((element) => {
    element.scrollLeft = element.scrollWidth;
  });
  await expect(paymentTable.getByRole("button", { name: "Details" }).first()).toBeInViewport();
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("button", { name: "Properties", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Kilimani Heights", exact: true })).toBeVisible();
  const property = page.locator(".property-card").filter({
    has: page.getByRole("heading", { name: "Kilimani Heights", exact: true }),
  });
  await property.getByRole("button", { name: "View units", exact: true }).click();
  await expect(property.locator(".unit-spec").first()).toContainText("Agreed monthly rent");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: test.info().outputPath("mobile-properties.png"),
    fullPage: true,
  });
});
