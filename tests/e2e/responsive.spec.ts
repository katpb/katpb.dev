import { expect, test } from "@playwright/test";
const routes = ["/", "/writing/", "/projects/", "/about/"];
for (const route of routes) {
  test(`stylesheet failure preserves HTML navigation ${route}`, async ({
    page,
  }) => {
    let blocked = 0;
    await page.route("**/*", (request) => {
      if (request.request().resourceType() === "stylesheet") {
        blocked++;
        return request.abort();
      }
      return request.continue();
    });
    await page.goto(route);
    expect(blocked).toBeGreaterThan(0);
    const markBounds = await page.locator(".brand-mark").boundingBox();
    expect(markBounds?.width).toBe(64);
    expect(markBounds!.width / markBounds!.height).toBeCloseTo(745 / 420, 2);
    for (const selector of ["h1", "main", "footer"])
      await expect(page.locator(selector)).toBeVisible();
    expect((await page.locator("main").innerText()).length).toBeGreaterThan(60);
    const nav = page.getByRole("navigation", { name: "Primary", exact: true });
    await expect(nav.locator('[aria-current="page"]')).toContainText("Current");
    await expect(
      nav.locator('[aria-current="page"] .current-label'),
    ).toBeVisible();
    for (let i = 0; i < routes.length; i++) {
      await page.goto(route);
      await nav.getByRole("link").nth(i).click();
      await expect(page).toHaveURL(new RegExp(`${routes[i]}$`));
      await expect(page.locator("h1")).toBeVisible();
      await expect(nav.locator('[aria-current="page"]')).toHaveAttribute(
        "href",
        routes[i],
      );
      await expect(nav.locator('[aria-current="page"]')).toContainText(
        "Current",
      );
    }
  });
  test(`responsive reflow and fit ${route}`, async ({ page }) => {
    await page.goto(route);
    const rail = page.locator(".rail-inner");
    for (const width of [320, 390, 768, 1023, 1024, 1025, 1280, 1440]) {
      await page.setViewportSize({ width, height: 800 });
      await expect(rail).toHaveCSS(
        "position",
        width >= 1024 ? "sticky" : "static",
      );
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth,
        ),
      ).toBe(false);
      for (const link of await page
        .getByRole("navigation", { name: "Primary", exact: true })
        .getByRole("link")
        .all())
        await expect(link).toBeVisible();
      await expect(
        page.getByRole("link", { name: "katpb.dev — Home", exact: true }),
      ).toHaveCount(1);
      await expect(page.locator(".desktop-introduction")).toBeVisible({
        visible: width >= 1024,
      });
      expect(
        (await page.locator(".brand-mark").boundingBox())!.width,
      ).toBeGreaterThanOrEqual(48);
    }
    await page.evaluate(() => window.scrollTo(0, 400));
    expect((await rail.boundingBox())!.y).toBeGreaterThanOrEqual(0);
    await page.setViewportSize({ width: 1280, height: 200 });
    await expect(rail).toHaveCSS("position", "static");
    await page.evaluate(() => window.scrollTo(0, 400));
    expect((await rail.boundingBox())!.y).toBeLessThan(0);
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(rail).toHaveCSS("position", "sticky");
    await page.locator(".descriptor").evaluate((e) => {
      e.textContent = "A long technical identity ".repeat(60);
    });
    await expect(rail).toHaveCSS("position", "static");
    expect(await rail.evaluate((e) => getComputedStyle(e).overflowY)).toBe(
      "visible",
    );
    await page.locator("h1").evaluate((e) => {
      e.textContent = "VeryLongUnbrokenTechnicalToken".repeat(8);
    });
    await page.setViewportSize({ width: 320, height: 800 });
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      ),
    ).toBe(false);
    await expect(page.locator("footer")).toBeVisible();
  });
  test(`reduced motion and forced colors ${route}`, async ({
    page,
    browserName,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(route);
    await expect(page.locator(".rail-inner")).toHaveCSS(
      "animation-name",
      "none",
    );
    const active = page
      .getByRole("navigation", { name: "Primary", exact: true })
      .locator('[aria-current="page"]');
    await expect(active).toHaveCSS("text-decoration-line", "underline");
    await page.keyboard.press(browserName === "webkit" ? "Alt+Tab" : "Tab");
    await expect(page.locator(".skip-link")).toBeFocused();
    expect(
      await page
        .locator(".skip-link")
        .evaluate((e) => getComputedStyle(e).outlineStyle),
    ).not.toBe("none");
    if (browserName === "chromium") {
      await page.emulateMedia({ forcedColors: "active" });
      await expect(active).toHaveCSS("text-decoration-line", "underline");
    }
  });
  test(`enhancement initialization failure keeps flow ${route}`, async ({
    page,
  }) => {
    await page.route("**/*", async (request) => {
      const response = await request.fetch();
      await request.fulfill({
        response,
        headers: {
          ...response.headers(),
          "content-security-policy": "script-src 'none'",
        },
      });
    });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(route);
    await expect(page.getByLabel("Theme", { exact: true })).toBeHidden();
    await expect(page.locator(".rail-inner")).toHaveCSS("position", "static");
    await expect(
      page
        .getByRole("navigation", { name: "Primary", exact: true })
        .getByRole("link"),
    ).toHaveCount(4);
  });
}

for (const route of routes) {
  test(`rail measurement unavailable leaves theme usable ${route}`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.ResizeObserver = class {
        constructor() {
          throw new Error("measurement unavailable");
        }
      } as unknown as typeof ResizeObserver;
    });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(route);
    await expect(page.locator(".rail-inner")).toHaveCSS("position", "static");
    const theme = page.getByLabel("Theme", { exact: true });
    await theme.selectOption("dark");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator("main h1")).toBeVisible();
  });
}
