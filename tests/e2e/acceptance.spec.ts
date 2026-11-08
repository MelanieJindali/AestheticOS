import { expect, test, type Page } from "@playwright/test";

// Runs against the app in DEMO_MODE (see playwright.config.ts).

async function freshAccount(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Start fresh (onboarding)" }).click();
  await page.waitForURL("**/onboarding");
}

async function demoAccount(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore the demo studio" }).click();
  await page.waitForURL("**/home");
}

test("sign-up → brand kit → 7 posts staged & scheduled in under 15 minutes", async ({ page }) => {
  const started = Date.now();
  await freshAccount(page);
  await page.getByLabel("What's your business called?").fill("Glow Theory");
  await page.getByRole("button", { name: "Esthetician / skin" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Where is your business based?").selectOption("UK");
  await page.getByLabel("Booking link (optional)").fill("https://glowtheory.example.com/book");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "calm" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: /Earthy Organic/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Build my brand + first week" }).click();
  await page.waitForURL("**/board?welcome=1");

  // 7 posts staged in Needs review → approve & schedule all in one tap.
  await page.getByRole("button", { name: /Approve & schedule all \(7\)/ }).first().click();
  await expect(page.getByText(/7 scheduled/)).toBeVisible();

  // Brand kit exists.
  await page.goto("/brand");
  await expect(page.getByRole("heading", { name: "Colour palette" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Logo concepts" })).toBeVisible();
  expect(Date.now() - started).toBeLessThan(15 * 60_000);

  // Downloads work.
  const pdf = await page.request.get("/api/brand/guide");
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  const svg = await page.request.get("/api/brand/logo?kind=wordmark&theme=light");
  expect(await svg.text()).toContain("<svg");
});

test("changing a brand colour re-themes every template and draft preview", async ({ page }) => {
  await demoAccount(page);
  await page.goto("/brand");
  await page.getByLabel("Primary", { exact: true }).fill("#123456");
  await page.getByRole("button", { name: "Save palette" }).click();
  await expect(page.getByText(/Palette saved/)).toBeVisible();

  const hasColour = (p: Page) => p.evaluate(() => [...document.querySelectorAll("[role=img] *")].some((e) => getComputedStyle(e).backgroundColor === "rgb(18, 52, 86)" || getComputedStyle(e).color === "rgb(18, 52, 86)"));
  await page.goto("/templates");
  await expect.poll(() => hasColour(page)).toBe(true);
  await page.goto("/board");
  const href = await page.locator("article a").first().getAttribute("href");
  await page.goto(href!);
  await expect.poll(() => hasColour(page)).toBe(true);
});

test("before/after posts cannot be scheduled without a consent record", async ({ page }) => {
  await demoAccount(page);
  await page.goto("/posts/new?templateType=before-after");
  await page.getByRole("button", { name: "Generate post" }).click();
  await page.waitForURL(/\/posts\/[0-9a-f-]{36}$/);
  const postUrl = page.url();
  await page.getByRole("button", { name: "Approve & schedule" }).click();
  await expect(page.getByRole("status").filter({ hasText: "can't be scheduled without client consent" })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Draft", { exact: true })).toBeVisible(); // still not scheduled

  // Collect consent on-device, then scheduling works.
  await page.getByRole("link", { name: "Get a signature now" }).click();
  await page.getByLabel(/Client alias/).fill("AB");
  await page.getByLabel("I have read this and I agree.").check();
  const pad = page.getByRole("img", { name: /Signature area/ });
  const box = (await pad.boundingBox())!;
  await page.mouse.move(box.x + 20, box.y + 40);
  await page.mouse.down();
  await page.mouse.move(box.x + 120, box.y + 80, { steps: 8 });
  await page.mouse.move(box.x + 220, box.y + 30, { steps: 8 });
  await page.mouse.up();
  await page.getByRole("button", { name: "Sign & save" }).click();
  await page.waitForURL(postUrl);
  await page.getByRole("button", { name: "Approve & schedule" }).click();
  await expect(page.getByText(/Scheduled\./)).toBeVisible();
});

test("full export and permanent delete, including token revocation", async ({ page }) => {
  await demoAccount(page);
  await page.goto("/settings");
  await page.getByRole("button", { name: "Connect Instagram" }).click();
  await expect(page.getByText(/Instagram connected/)).toBeVisible();

  const res = await page.request.get("/api/export");
  const data = await res.json();
  expect(data.format).toBe("aesthetic-os-export");
  expect(data.tables.posts.length).toBeGreaterThan(20);
  expect(data.tables.connected_accounts.length).toBe(1);
  expect(JSON.stringify(data)).not.toMatch(/demo_[A-Za-z0-9_-]{20,}|v1\.[^"]+\.[^"]+\.[^"]+/); // no tokens, plain or encrypted

  await page.getByLabel("Type DELETE to confirm").fill("DELETE");
  await page.getByRole("button", { name: "Delete forever" }).click();
  await page.waitForURL("**/?deleted=1");
  await expect(page.getByText(/permanently deleted/)).toBeVisible();
  const after = await page.request.get("/api/export");
  expect(after.status()).toBe(401);
});

test("security headers and auth guards", async ({ page, request }) => {
  const r = await request.get("/");
  expect(r.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(r.headers()["x-content-type-options"]).toBe("nosniff");
  expect((await request.get("/api/export")).status()).toBe(401);
  expect((await request.post("/api/upload", { headers: { origin: "https://evil.example" } })).status()).toBe(403);
  await page.goto("/home");
  await expect(page).toHaveURL(/sign-in|\/$/);
});
