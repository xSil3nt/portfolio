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
