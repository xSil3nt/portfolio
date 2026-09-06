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
  for (const route of ["/", "/po-attainment/"]) {
    await page.goto(route);
    const canvas = page.locator(route === "/" ? "[data-engineering-sequence]" : "[data-po-canvas]");
    const section = route === "/" ? "[data-motion-story]" : "[data-po-hero]";
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
  }
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

test("outcome animation handles a first frame timestamp before construction", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 412, height: 915 });
  await page.addInitScript(() => {
    const requestFrame = window.requestAnimationFrame.bind(window);
    // Reproduce the early timestamp that used to give the animation a negative node index.
    window.requestAnimationFrame = (callback) => requestFrame(() => callback(0));
  });
  await page.goto("/po-attainment/");
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
  expect(errors).toEqual([]);
});

test("renders all portfolio projects", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Embedded systems, robotics, simulation, and software.",
  );
  await expect(page.getByRole("heading", { name: "Simulating coordinated field robots." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Satellite telemetry for remote field sensors." })).toBeAttached();
  await expect(page.getByRole("heading", { name: "More colours, same printer." })).toBeAttached();
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

  await expect(page.getByRole("heading", { level: 1 })).toContainText("PO1 to PO12. What I learned.");
  await expect(page.getByRole("heading", { name: "How I work as an engineer." })).toBeAttached();
  await expect(page.getByRole("heading", { name: "Current strengths and gaps." })).toBeAttached();
  await expect(page.getByRole("heading", { name: "The work behind each outcome." })).toBeAttached();
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
  await expect(page.locator('.nav a[href="/po-attainment/"]')).toHaveText("PO attainment");
  await expect(page.locator('.mobile-nav a[href="/po-attainment/"]')).toHaveText("PO attainment");

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
