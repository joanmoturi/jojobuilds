import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page, email = "owner@example.com") {
  await page.goto("/");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("synthetic-e2e-password");
  await page.getByRole("button", { name: "Sign in to JOJOBUILDS" }).click();
  if (email === "manager-demo@example.com")
    await expect(
      page.getByRole("heading", { name: "Tenant balances.", exact: true }),
    ).toBeVisible();
  else await expect(page.locator(".collection-card")).toBeVisible();
}
async function navigate(page: Page, name: string) {
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name, exact: true })
    .click();
}

test("invitation fields and submitted payload follow the selected role", async ({ page }) => {
  await signIn(page);
  await page.getByRole("button", { name: "Settings & access", exact: true }).click();
  await page.getByRole("button", { name: "Send invitation", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("combobox", { name: "Existing tenant", exact: true }),
  ).toBeVisible();
  await expect(dialog.getByRole("combobox", { name: /Property assignment/ })).toHaveCount(0);
  await dialog
    .getByRole("combobox", { name: "Existing tenant", exact: true })
    .selectOption({ label: "Blair Example · tenant2@example.com" });
  await dialog.getByRole("combobox", { name: "Role", exact: true }).selectOption("manager");
  await expect(dialog.getByRole("combobox", { name: "Existing tenant", exact: true })).toHaveCount(
    0,
  );
  await dialog
    .getByRole("combobox", { name: /Property assignment/ })
    .selectOption({ label: "Westlands Ridge" });
  await dialog.getByRole("combobox", { name: "Role", exact: true }).selectOption("tenant");
  await expect(dialog.getByRole("combobox", { name: /Property assignment/ })).toHaveCount(0);
  await expect(dialog.getByRole("combobox", { name: "Existing tenant", exact: true })).toHaveValue(
    "",
  );
  await dialog
    .getByRole("combobox", { name: "Existing tenant", exact: true })
    .selectOption({ label: "Blair Example · tenant2@example.com" });
  await dialog.getByLabel("Recipient email").fill("tenant2@example.com");
  const tenantRequest = page.waitForRequest(
    (request) => request.method() === "POST" && request.url().endsWith("/api/v1/invitations"),
  );
  await dialog.getByRole("button", { name: "Save & continue" }).click();
  expect((await tenantRequest).postDataJSON()).toEqual({
    email: "tenant2@example.com",
    role: "tenant",
    tenant_id: expect.any(String),
    property_ids: [],
  });
  await expect(dialog).not.toBeVisible();

  await page.getByRole("button", { name: "Send invitation", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByRole("combobox", { name: "Existing tenant", exact: true })
    .selectOption({ label: "Blair Example · tenant2@example.com" });
  await dialog.getByRole("combobox", { name: "Role", exact: true }).selectOption("caretaker");
  await expect(dialog.getByRole("combobox", { name: "Existing tenant", exact: true })).toHaveCount(
    0,
  );
  await dialog.getByLabel("Recipient email").fill("synthetic-caretaker@example.com");
  await dialog
    .getByRole("combobox", { name: /Property assignment/ })
    .selectOption({ label: "Kilimani Heights" });
  const staffRequest = page.waitForRequest(
    (request) => request.method() === "POST" && request.url().endsWith("/api/v1/invitations"),
  );
  await dialog.getByRole("button", { name: "Save & continue" }).click();
  expect((await staffRequest).postDataJSON()).toEqual({
    email: "synthetic-caretaker@example.com",
    role: "caretaker",
    tenant_id: null,
    property_ids: [expect.any(String)],
  });
  await expect(dialog).not.toBeVisible();
});

test("staff preview uses an assigned-property manager account, not owner impersonation", async ({
  page,
}) => {
  await signIn(page, "manager-demo@example.com");
  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  for (const name of ["Payments", "Overview", "Recurring bills"])
    await expect(navigation.getByRole("button", { name, exact: true })).toHaveCount(0);
  await expect(navigation.getByRole("button", { name: "Messages", exact: true })).toBeVisible();
  await expect(navigation.getByRole("button", { name: "Owner finances", exact: true })).toHaveCount(
    0,
  );
  await navigate(page, "Properties");
  await expect(page.getByRole("heading", { name: "Kilimani Heights", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Westlands Ridge", exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Riverside Green Court", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Settings & access", exact: true }).click();
  await expect(page.getByRole("button", { name: "Send invitation", exact: true })).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath("staff-access.png"), fullPage: true });
});

test("provider bills, owner-private spending and recurring tenant charges persist", async ({
  page,
}) => {
  await signIn(page);
  await navigate(page, "Service providers");
  await page.getByRole("button", { name: "Add service provider", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Provider / company name").fill("Synthetic Browser Plumber");
  await dialog.getByLabel("Trade (plumber").fill("Plumbing");
  await dialog.getByLabel("Contact person").fill("Example Contact");
  await dialog.getByLabel("Phone number").fill("+254000000000");
  await dialog.getByRole("button", { name: "Save record" }).click();
  const provider = page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: "Synthetic Browser Plumber" }) });
  await expect(provider).toContainText("Example Contact");
  await provider.getByRole("button", { name: "Add provider bill" }).click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByRole("combobox", { name: "Property", exact: true })
    .selectOption({ label: "Kilimani Heights" });
  await dialog.getByLabel("Description", { exact: true }).fill("Synthetic tap repair invoice");
  await dialog.getByLabel("Amount owed / planned").fill("2500");
  await dialog.getByLabel("Invoice / obligation reference").fill("SYNTHETIC-WEB-001");
  await dialog.getByRole("button", { name: "Save record" }).click();
  const bill = page.locator("article").filter({
    has: page.getByRole("heading", { name: "Synthetic tap repair invoice", exact: true }),
  });
  await expect(bill).toContainText(/Ksh\s2,500\.00/);
  await bill.getByRole("button", { name: "Record outgoing payment" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Amount actually paid").fill("1000");
  await dialog.getByLabel("Transaction reference").fill("SYNTHETIC-OUTGOING-001");
  await dialog.getByRole("button", { name: "Save record" }).click();
  await expect(bill).toContainText(/Ksh\s1,500\.00/);
  await expect(provider).toContainText(/Ksh\s1,500\.00/);
  await bill.getByText("Payment history (1)", { exact: true }).click();
  await expect(bill).toContainText("SYNTHETIC-OUTGOING-001");
  await page.screenshot({
    path: test.info().outputPath("service-provider-payments.png"),
    fullPage: true,
  });

  await navigate(page, "Owner finances");
  await page.getByRole("button", { name: "Add obligation / owner use" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Description", { exact: true }).fill("Synthetic private owner groceries");
  await dialog.getByLabel("Amount owed / planned").fill("3500");
  await dialog.getByRole("button", { name: "Save record" }).click();
  const personal = page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: "Synthetic private owner groceries" }) });
  await personal.getByRole("button", { name: "Record outgoing payment" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Save record" }).click();
  await expect(personal.getByText("Paid", { exact: true })).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath("private-owner-finances.png"),
    fullPage: true,
  });

  await navigate(page, "Recurring bills");
  await page.getByRole("button", { name: "Set recurring charge" }).click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByRole("combobox", { name: "Tenancy", exact: true })
    .selectOption({ label: "Alex Demo · JOJO-11" });
  await dialog.getByLabel("Description", { exact: true }).fill("Synthetic monthly garbage");
  await dialog.getByLabel("Monthly amount").fill("500");
  await dialog.getByRole("button", { name: "Save record" }).click();
  await expect(page.getByRole("heading", { name: "Synthetic monthly garbage" })).toBeVisible();
  await page.getByRole("button", { name: "Generate rent & bills" }).click();
  await expect(page.getByRole("status")).toContainText("new charges generated");
  await navigate(page, "Tenants");
  const tenant = page.locator("tbody tr").filter({ hasText: "Alex Demo" });
  await expect(tenant).toContainText("3 units");
  await expect(tenant).toContainText("JOJO-DEMO-STALL");
  await expect(tenant).toContainText("JOJO-DEMO-BAR");
  await expect(tenant).toContainText(/Ksh\s140,000\.00/);
});

test("genuine tenant portal shows only its own account and tenant-linked maintenance", async ({
  page,
}) => {
  await signIn(page, "tenant-demo@example.com");
  await expect(page.getByRole("heading", { name: "Welcome home, Alex." })).toBeVisible();
  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  await expect(navigation.getByRole("button", { name: "Owner finances", exact: true })).toHaveCount(
    0,
  );
  await expect(
    navigation.getByRole("button", { name: "Service providers", exact: true }),
  ).toHaveCount(0);
  const session = await (await page.request.get("/api/v1/auth/session")).json();
  const headers = { "X-Organization": session.organizations[0].id };
  const leases = await (await page.request.get("/api/v1/tenancies", { headers })).json();
  expect(leases).toHaveLength(3);
  const charges = await (await page.request.get("/api/v1/charges", { headers })).json();
  expect(charges.length).toBeGreaterThan(0);
  expect(
    charges.every((charge: { tenancy_id: string }) =>
      leases.some((lease: { id: string }) => lease.id === charge.tenancy_id),
    ),
  ).toBe(true);
  expect((await page.request.get("/api/v1/providers", { headers })).status()).toBe(403);
  expect((await page.request.get("/api/v1/payables", { headers })).status()).toBe(403);
  expect(
    (await page.request.get("/api/v1/owner-finances?period=2026-10", { headers })).status(),
  ).toBe(403);
  await page.screenshot({ path: test.info().outputPath("tenant-home.png"), fullPage: true });
  await expect(navigation.getByRole("button", { name: "Properties", exact: true })).toHaveCount(0);
  await navigate(page, "My rentals");
  await expect(page.getByRole("heading", { name: "My rentals.", exact: true })).toBeVisible();
  const cards = page.locator(".rental-card");
  await expect(cards).toHaveCount(3);
  const apartment = cards.filter({ hasText: "Kilimani Heights" });
  const stall = cards.filter({ hasText: "Utawala Stalls" });
  const bar = cards.filter({ hasText: "Bypass Bar" });
  await expect(apartment.getByRole("heading", { name: "1-bedroom apartment" })).toBeVisible();
  await expect(stall.getByRole("heading", { name: "Rental stall" })).toBeVisible();
  await expect(bar.getByRole("heading", { name: "Bar premises" })).toBeVisible();
  await expect(page.getByText(/occupied|Residential portfolio|View units/)).toHaveCount(0);
  await page.getByRole("textbox", { name: "Search my rentals" }).fill("stall");
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText("Utawala Stalls");
  await page.getByRole("textbox", { name: "Search my rentals" }).fill("");
  await page.getByRole("combobox", { name: "Rental status", exact: true }).selectOption("Ended");
  await expect(page.getByRole("heading", { name: "No matching rentals" })).toBeVisible();
  await page.getByRole("combobox", { name: "Rental status", exact: true }).selectOption("all");
  await page.screenshot({ path: test.info().outputPath("tenant-rentals.png"), fullPage: true });
  await stall.getByRole("button", { name: "View rent & bills", exact: true }).click();
  const rentalAccount = page.getByRole("combobox", { name: "Rental account", exact: true });
  await expect(rentalAccount.locator("option:checked")).toContainText("Utawala Stalls");
  const invoices = page.locator("section.surface").filter({
    has: page.getByRole("heading", { name: /^Charges · / }),
  });
  await expect(invoices).toContainText("Utawala Stalls");
  await expect(invoices).not.toContainText("Bypass Bar");
  await expect(invoices).not.toContainText("Kilimani Heights");
  await rentalAccount.selectOption("");
  await expect(invoices).toContainText("Kilimani Heights");
  await expect(invoices).toContainText("Bypass Bar");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(async () =>
      page.locator(".sidebar").evaluate((element) => element.getBoundingClientRect().right),
    )
    .toBeLessThanOrEqual(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const mobileNavigation = page.getByRole("navigation", { name: "Mobile navigation" });
  await expect(
    mobileNavigation.getByRole("button", { name: "Properties", exact: true }),
  ).toHaveCount(0);
  await mobileNavigation.getByRole("button", { name: "My rentals", exact: true }).click();
  await expect(cards).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: test.info().outputPath("tenant-rentals-phone.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await navigate(page, "Maintenance");
  await page.getByRole("button", { name: "New request", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("combobox", { name: "Property", exact: true })
    .selectOption({ label: "Kilimani Heights" });
  await dialog
    .getByRole("combobox", { name: "Your tenancy", exact: true })
    .selectOption({ label: "Alex Demo · Kilimani Heights · Unit A01" });
  await dialog.getByLabel("Short title").fill("Synthetic tenant tap problem");
  await dialog
    .getByLabel("Describe the problem")
    .fill("Synthetic tenant reports a dripping kitchen tap.");
  await dialog.getByRole("button", { name: "Save & continue" }).click();
  const request = page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: "Synthetic tenant tap problem" }) });
  await expect(request).toContainText("Alex Demo · Unit A01");
  await expect(request).not.toContainText("Recorded cost");
  await page.screenshot({ path: test.info().outputPath("tenant-maintenance.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(async () =>
      page.locator(".sidebar").evaluate((element) => element.getBoundingClientRect().right),
    )
    .toBeLessThanOrEqual(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("tenant-phone.png"), fullPage: true });
});
