import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page, email: string) {
  await page.goto("/");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("synthetic-e2e-password");
  await page.getByRole("button", { name: "Sign in to JOJOBUILDS" }).click();
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
}

test("provider invitation, one account across landlords and assignment progress", async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  await page.goto("/?invite=synthetic-e2e-provider-invitation-1");
  await page.getByLabel("Your name", { exact: true }).fill("Synthetic browser provider");
  await page
    .getByLabel("New password (at least 12 characters)", { exact: true })
    .fill("synthetic-e2e-password");
  await page.getByRole("button", { name: "Set up secure access", exact: true }).click();
  await expect(page.getByText("Account updated. Sign in to continue.")).toBeVisible();
  await page.getByLabel("Email address").fill("provider-login@example.com");
  await page.getByLabel("Password", { exact: true }).fill("synthetic-e2e-password");
  await page.getByRole("button", { name: "Sign in to JOJOBUILDS" }).click();
  await expect(page.getByRole("heading", { name: "My service work", exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Synthetic assigned repair 1", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Synthetic assigned repair 2", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toHaveCount(0);
  const first = page.locator("article").filter({
    has: page.getByRole("heading", { name: "Synthetic assigned repair 1", exact: true }),
  });
  await first
    .getByLabel("Response note (private to management)")
    .fill("Synthetic private scheduling response");
  await first.getByRole("button", { name: "Save job update", exact: true }).click();
  await expect(first.getByRole("combobox", { name: "Progress", exact: true })).toBeVisible();
  await first.getByRole("combobox", { name: "Progress", exact: true }).selectOption("in_progress");
  await first.getByLabel("Progress note (visible to tenant)").fill("Synthetic repair is under way");
  await first.getByRole("button", { name: "Save job update", exact: true }).click();
  await first.getByText("Job history", { exact: true }).click();
  await expect(first.locator(".request-history")).toContainText("Synthetic repair is under way");

  await first.getByText("Quotations and invoices", { exact: true }).click();
  await first.getByLabel("Item 1 description").fill("Synthetic tap repair labour");
  await first.getByLabel("Item 1 quantity").fill("2");
  await first.getByLabel("Item 1 unit price").fill("125.50");
  await first.getByRole("button", { name: "Submit quotation", exact: true }).click();
  await expect(first.getByText("Quotation submitted for owner approval.")).toBeVisible();

  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  await signIn(ownerPage, "owner@example.com");
  await ownerPage
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Maintenance", exact: true })
    .click();
  const ownerJob = ownerPage.locator("article").filter({
    has: ownerPage.getByRole("heading", { name: "Synthetic assigned repair 1", exact: true }),
  });
  await ownerJob.getByText("Quotations and invoices", { exact: true }).click();
  await expect(ownerJob.getByText("Total:", { exact: false })).toContainText("251.00");
  await ownerJob.getByLabel("Review note", { exact: true }).fill("Synthetic quotation approved");
  await ownerJob.getByRole("button", { name: "Save document review", exact: true }).click();
  await expect(ownerJob.getByText("approved", { exact: true })).toBeVisible();

  await page.reload();
  await first.getByText("Quotations and invoices", { exact: true }).click();
  await first.getByLabel("Invoice reference", { exact: true }).fill("SYNTHETIC-BROWSER-INV");
  const ownerSession = await (await ownerPage.request.get("/api/v1/auth/session")).json();
  const orgId = ownerSession.organizations[0].id;
  const billsBefore = await (
    await ownerPage.request.get("/api/v1/payables", {
      headers: { "X-Organization": orgId },
    })
  ).json();
  const bill = billsBefore.find(
    (entry: { description: string }) => entry.description === "Synthetic assigned repair 1",
  );
  expect(bill).toBeTruthy();
  await first.getByLabel("Invoice issue date", { exact: true }).fill(bill.issued_on);
  await first.getByRole("button", { name: "Submit invoice", exact: true }).click();
  await expect(first.getByText("Invoice submitted for owner approval.")).toBeVisible();
  await ownerPage.reload();
  await ownerPage
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Maintenance", exact: true })
    .click();
  await ownerJob.getByText("Quotations and invoices", { exact: true }).click();
  await ownerJob.getByLabel("Review note", { exact: true }).fill("Synthetic invoice approved");
  await ownerJob.getByRole("button", { name: "Save document review", exact: true }).click();
  await expect(ownerJob.getByText("approved", { exact: true })).toHaveCount(2);
  const billsAfter = await (
    await ownerPage.request.get("/api/v1/payables", {
      headers: { "X-Organization": orgId },
    })
  ).json();
  expect(billsAfter).toHaveLength(billsBefore.length);
  const payment = await ownerPage.request.post(`/api/v1/payables/${bill.id}/payments`, {
    headers: { "X-Organization": orgId, "X-CSRF-Token": ownerSession.csrf },
    data: {
      amount: 25100,
      paid_on: bill.issued_on,
      method: "bank",
      idempotency_key: "synthetic-browser-service-payment",
    },
  });
  expect(payment.ok()).toBeTruthy();
  await page.reload();
  await page.getByRole("button", { name: "Services paid", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Synthetic assigned repair 1", exact: true }),
  ).toBeVisible();
  await page.getByText("Payment history", { exact: true }).click();
  await expect(page.getByText("No payments recorded yet.")).toHaveCount(0);
  await page.getByRole("button", { name: "Messages", exact: true }).click();
  const recipient = page.getByRole("combobox", { name: "Recipient and property", exact: true });
  const ownerOption = recipient.locator("option").filter({ hasText: "(owner)" });
  await recipient.selectOption((await ownerOption.getAttribute("value")) ?? "");
  await page
    .getByLabel("Conversation message", { exact: true })
    .fill("Synthetic private provider question");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.getByRole("log")).toContainText("Synthetic private provider question");
  await ownerPage
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Messages", exact: true })
    .click();
  await ownerPage.getByRole("button", { name: /Synthetic private provider question/ }).click();
  await ownerPage.getByLabel("Conversation message", { exact: true }).fill("Synthetic owner reply");
  await ownerPage.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(ownerPage.getByRole("log")).toContainText("Synthetic owner reply");
  await ownerContext.close();
  await page.getByRole("button", { name: "Jobs", exact: true }).click();
  await page.goto("/?invite=synthetic-e2e-provider-invitation-2");
  await expect(page.getByRole("heading", { name: "Accept your invitation" })).toBeVisible();
  await page.getByRole("button", { name: "Accept invitation", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Synthetic assigned repair 2", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Synthetic assigned repair 1", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Landlord", exact: true })
    .selectOption({ label: "Second synthetic landlord / Other synthetic owner (synthetic demo)" });
  await expect(
    page.getByRole("heading", { name: "Synthetic assigned repair 1", exact: true }),
  ).toHaveCount(0);
  const second = page.locator("article").filter({
    has: page.getByRole("heading", { name: "Synthetic assigned repair 2", exact: true }),
  });
  await second.getByRole("combobox", { name: "Action", exact: true }).selectOption("decline");
  await second
    .getByLabel("Response note (private to management)")
    .fill("Synthetic schedule conflict");
  await second.getByRole("button", { name: "Save job update", exact: true }).click();
  await expect(second.getByText("declined", { exact: true })).toBeVisible();
  await expect(second.getByRole("button", { name: "Save job update", exact: true })).toHaveCount(0);
});

test("manager and tenant conversations allow owner oversight without financial tools", async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  await page.goto("/");
  await page.getByLabel("Email address").fill("manager-demo@example.com");
  await page.getByLabel("Password", { exact: true }).fill("synthetic-e2e-password");
  await page.getByRole("button", { name: "Sign in to JOJOBUILDS" }).click();
  await expect(page.getByRole("heading", { name: "Tenant balances.", exact: true })).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  await nav.getByRole("button", { name: "Messages", exact: true }).click();
  await page.getByText("Tenant notices and email history", { exact: true }).click();
  await page
    .getByRole("combobox", { name: "Rental", exact: true })
    .selectOption({ label: "Alex Demo / Kilimani Heights / A01" });
  await page.getByLabel("Subject", { exact: true }).fill("Synthetic browser reminder");
  await page
    .getByLabel("Message", { exact: true })
    .fill("Please review the balance for this rental.");
  await page.getByRole("button", { name: "Send tenant message", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("In-app: available");
  await expect(
    page.getByRole("heading", { name: "Synthetic browser reminder", exact: true }),
  ).toBeVisible();
  await expect(nav.getByRole("button", { name: "Payments", exact: true })).toHaveCount(0);
  const recipient = page.getByRole("combobox", { name: "Recipient and property", exact: true });
  const tenantOption = recipient.locator("option").filter({ hasText: /\(tenant\).*Unit A01/ });
  await recipient.selectOption((await tenantOption.getAttribute("value")) ?? "");
  await page
    .getByLabel("Conversation message", { exact: true })
    .fill("Synthetic manager conversation");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.getByRole("log")).toContainText("Synthetic manager conversation");
  const tenantContext = await browser.newContext();
  const tenantPage = await tenantContext.newPage();
  await signIn(tenantPage, "tenant-demo@example.com");
  await tenantPage
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Messages", exact: true })
    .click();
  await tenantPage.getByRole("button", { name: /Synthetic manager conversation/ }).click();
  await tenantPage
    .getByLabel("Conversation message", { exact: true })
    .fill("Synthetic tenant conversation reply");
  await tenantPage.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(tenantPage.getByRole("log")).toContainText("Synthetic tenant conversation reply");
  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  await signIn(ownerPage, "owner@example.com");
  await ownerPage
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Messages", exact: true })
    .click();
  await ownerPage.getByRole("button", { name: /Synthetic tenant conversation reply/ }).click();
  await expect(ownerPage.getByText("Owner oversight - read-only", { exact: true })).toBeVisible();
  await expect(ownerPage.getByRole("log")).toContainText("Synthetic manager conversation");
  await expect(ownerPage.getByRole("button", { name: "Send message", exact: true })).toHaveCount(0);
  await tenantContext.close();
  await ownerContext.close();
});
