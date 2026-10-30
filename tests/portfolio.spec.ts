import { expect, test } from "@playwright/test";

test("scrolling each project keeps its active description readable", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Desktop scroll scenes only");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  for (const project of await page.locator("[data-project]").all()) {
    for (const [index, progress] of [0.1, 0.5, 0.9].entries()) {
      await project.evaluate((element, amount) => {
        const bounds = element.getBoundingClientRect();
        window.scrollTo(0, bounds.top + window.scrollY + (bounds.height - innerHeight) * amount);
      }, progress);
      const beat = project.locator("[data-beat]").nth(index);
      await expect(beat).toHaveCSS("opacity", "1");
      await expect(beat).toBeVisible();
    }
  }
  expect(errors).toEqual([]);
});

test("canvas rendering pauses off screen and resumes on return", async ({ page }) => {
  await page.addInitScript(() => {
    const clear = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      this.canvas.dataset.draws = String(Number(this.canvas.dataset.draws ?? 0) + 1);
      return clear.apply(this, args);
    };
  });
  await page.goto("/");
  const canvas = page.locator("[data-engineering-sequence]");
  const section = "[data-motion-story]";
  const show = () => page.locator(section).evaluate((element) => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY));
  await show();
  await expect.poll(async () => Number(await canvas.getAttribute("data-draws"))).toBeGreaterThan(1);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  // Allow the intersection observer to stop the loop before measuring it.
  await page.waitForTimeout(250);
  const paused = Number(await canvas.getAttribute("data-draws"));
  await page.waitForTimeout(250);
  expect(Number(await canvas.getAttribute("data-draws"))).toBe(paused);
  await show();
  await expect.poll(async () => Number(await canvas.getAttribute("data-draws"))).toBeGreaterThan(paused);
});

test("motion respects pointer capabilities and reduced motion", async ({ page, isMobile }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator(".reading-progress")).toHaveCount(1);
  await expect(page.locator(".entrance-curtain")).toHaveCount(0);
  await expect(page.locator(".motion-cursor")).toHaveCount(isMobile ? 0 : 1);
  await expect(page.locator(".experiment-track ul[aria-hidden='true']")).toHaveCount(1);
  await expect(page.getByRole("list", { name: "Additional experiments" }).getByRole("listitem")).toHaveCount(4);
  if (!isMobile) {
    await page.locator(".round-link").hover();
    await expect(page.locator(".motion-cursor")).toHaveClass(/is-active/);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await expect(page.locator(".motion-cursor, .reading-progress, .entrance-curtain, .experiment-track")).toHaveCount(0);
  await expect(page.locator(".hero__foot")).toHaveCSS("opacity", "1");
  expect(errors).toEqual([]);
});

test("renders all portfolio projects", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Embedded systems, robotics, simulation, and software.",
  );
  await expect(page.getByRole("heading", { name: "Robot fleet simulator." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Satellite-connected field sensors." })).toBeAttached();
  await expect(page.getByRole("heading", { name: "Colour mixing for OrcaSlicer." })).toBeAttached();
  await expect(
    page.getByRole("heading", { name: "Drone telemetry and control." }),
  ).toBeAttached();
  await expect(page.getByRole("heading", { name: "Hingaa", exact: true })).toBeAttached();
  await expect(page.locator("#hingaa a")).toHaveAttribute("href", "https://github.com/xSil3nt/hingaa");
  await expect(page.getByRole("link", { name: "GitHub ↗", exact: true })).toHaveAttribute(
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
