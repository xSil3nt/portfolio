import { expect, test } from "@playwright/test";

test("renders the complete engineering narrative", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Embedded systems, robotics, simulation, and software.",
  );
  await expect(page.getByRole("heading", { name: "Simulating coordinated field robots." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Satellite telemetry for remote field sensors." })).toBeAttached();
  await expect(page.getByRole("heading", { name: "More colors, same printer." })).toBeAttached();
  await expect(
    page.getByRole("heading", { name: "Telemetry and control for an autonomous payload drone." }),
  ).toBeAttached();
  await expect(page.getByRole("link", { name: "GitHub ↗" })).toHaveAttribute(
    "href",
    "https://github.com/xSil3nt",
  );
});

test("publishes a working PDF resume link", async ({ page, request }) => {
  await page.goto("/");
  const resume = page.locator('a[href="/Shazin-Resume.pdf"]').first();
  await expect(resume).toHaveAttribute("href", "/Shazin-Resume.pdf");
  const response = await request.get("/Shazin-Resume.pdf");
  expect(response.ok()).toBeTruthy();
  expect(response.headers()["content-type"]).toContain("application/pdf");
});

test("does not create horizontal overflow", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const dimensions = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
});

test("mobile menu opens, closes, and exposes navigation", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Mobile-only behaviour");
  await page.goto("/");
  const menuButton = page.locator(".menu-toggle");
  await menuButton.click();
  await expect(menuButton).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");
});

test("reduced motion keeps all project beats readable", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "reduced-motion", "Reduced-motion project only");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const reduced = await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  expect(reduced).toBeTruthy();

  const beats = page.locator("[data-beat]");
  await expect(beats).toHaveCount(12);
  for (const beat of await beats.all()) {
    await expect(beat).toHaveCSS("opacity", "1");
  }
  await expect(page.locator("[data-world]")).toBeHidden();
});

test("publishes a complete PO attainment record", async ({ page }) => {
  await page.goto("/po-attainment/");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("PO1—PO12. Fully attained.");
  await expect(page.getByRole("heading", { name: "How I work as an engineer." })).toBeAttached();
  await expect(page.getByRole("heading", { name: "Current strengths and gaps." })).toBeAttached();
  await expect(page.getByRole("heading", { name: "PO1–PO12 Attainment" })).toBeAttached();
  await expect(page.getByRole("heading", { name: "What I need to improve next." })).toBeAttached();
  await expect(page.locator(".header-status, .po-hero__chrome")).toHaveCount(0);
  await expect(page.getByText("The supplied record lists 1.00 for every outcome.", { exact: false })).toHaveCount(0);
  await expect(page.getByText("The record shows 1.00 for PO1 through PO12.", { exact: false })).toHaveCount(0);

  const outcomes = page.locator(".po-card");
  await expect(outcomes).toHaveCount(12);
  await expect(page.locator(".po-card__top strong")).toHaveCount(12);
  for (const score of await page.locator(".po-card__top strong").all()) {
    await expect(score).toHaveText("1.00");
  }

  for (const dimension of ["Strengths", "Weaknesses", "Opportunities", "Threats"]) {
    await expect(page.getByText(new RegExp(dimension), { exact: false }).first()).toBeAttached();
  }
});

test("links the portfolio shell and evidence to the PO page", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('.nav a[href="/po-attainment/"]')).toHaveText("PO Attainment");
  await expect(page.locator('.mobile-nav a[href="/po-attainment/"]')).toHaveText("PO Attainment");

  for (const id of ["fleet-simulator", "field-monitoring", "orcaslicer", "payload-drone", "archive"]) {
    await expect(page.locator(`#${id}`)).toBeAttached();
  }
});

test("does not expose private attainment source data", async ({ page }) => {
  await page.goto("/po-attainment/");
  const content = (await page.locator("body").innerText()).toUpperCase();
  expect(content).not.toContain("TP069257");
  expect(content).not.toContain("AHMED SHAZIN");
  expect(content).not.toContain("ABBAS ALIHUSSEIN");
});

test("PO attainment page does not create horizontal overflow", async ({ page }) => {
  await page.goto("/po-attainment/");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const dimensions = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
});

test("PO attainment mobile menu remains accessible", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Mobile-only behaviour");
  await page.goto("/po-attainment/");
  const menuButton = page.locator(".menu-toggle");
  await menuButton.click();
  await expect(menuButton).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");
});

test("PO attainment remains readable with reduced motion and print", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "reduced-motion", "Reduced-motion project only");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/po-attainment/");
  await expect(page.locator("[data-po-canvas]")).toBeHidden();
  await expect(page.locator(".po-card")).toHaveCount(12);
  for (const item of await page.locator(".po-reveal").all()) {
    await expect(item).toHaveCSS("opacity", "1");
  }

  await page.emulateMedia({ media: "print", reducedMotion: "reduce" });
  await expect(page.locator(".site-header")).toBeHidden();
  await expect(page.locator(".po-card")).toHaveCount(12);
});
