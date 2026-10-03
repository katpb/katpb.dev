import { canonicalBrand, builtDocument } from "./artifacts.mjs";
import { expect, test, type Page } from "@playwright/test";
const routes = ["/", "/writing/", "/projects/", "/about/"];
const colors = { light: "rgb(91, 26, 120)", dark: "rgb(230, 217, 255)" };
async function appearance(page: Page, mode: "light" | "dark") {
  await expect(page.locator(".brand-mark")).toHaveCSS("color", colors[mode]);
  await expect(page.locator("html")).toHaveCSS("color-scheme", mode);
}
for (const route of routes) {
  test(`theme transitions and retention ${route}`, async ({
    page,
    context,
    browser,
    baseURL,
  }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(route);
    const select = page.getByLabel("Theme", { exact: true });
    await expect(select).toHaveValue("system");
    await appearance(page, "light");
    await page.emulateMedia({ colorScheme: "dark" });
    await appearance(page, "dark");
    for (const mode of ["light", "dark"] as const) {
      await select.selectOption(mode);
      await appearance(page, mode);
      await page.emulateMedia({
        colorScheme: mode === "light" ? "dark" : "light",
      });
      await appearance(page, mode);
      await page.reload();
      await expect(select).toHaveValue(mode);
      await appearance(page, mode);
      expect(
        await page.evaluate(() => localStorage.getItem("katpb.theme")),
      ).toBe(mode);
      await page
        .getByRole("navigation", { name: "Primary", exact: true })
        .getByRole("link")
        .nth(1)
        .click();
      await appearance(page, mode);
      const later = await browser.newContext({
        storageState: await context.storageState(),
        colorScheme: mode === "light" ? "dark" : "light",
      });
      try {
        const tab = await later.newPage();
        await tab.goto(`${baseURL}${route}`);
        await appearance(tab, mode);
        await expect(tab.getByLabel("Theme", { exact: true })).toHaveValue(
          mode,
        );
      } finally {
        await later.close();
      }
      await page.goto(route);
    }
    await select.selectOption("system");
    expect(
      await page.evaluate(() => localStorage.getItem("katpb.theme")),
    ).toBeNull();
    await expect(page.locator("html")).not.toHaveAttribute("data-theme");
    await page.emulateMedia({ colorScheme: "dark" });
    await appearance(page, "dark");
    await page.reload();
    await expect(select).toHaveValue("system");
    await select.focus();
    await expect(select).toBeFocused();
    await select.press("l");
    await select.press("Tab");
    await expect(select).toHaveValue("light");
  });
  for (const fault of [
    "invalid",
    "access",
    "read",
    "write",
    "remove",
  ] as const) {
    test(`storage ${fault} ${route}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: "light" });
      await page.addInitScript((fault) => {
        localStorage.setItem(
          "katpb.theme",
          fault === "invalid" ? "unrecognized" : "dark",
        );
        if (fault === "access")
          Object.defineProperty(window, "localStorage", {
            get() {
              throw new Error("unavailable");
            },
          });
        if (fault === "read")
          Storage.prototype.getItem = () => {
            throw new Error("read blocked");
          };
        if (fault === "write")
          Storage.prototype.setItem = () => {
            throw new Error("write blocked");
          };
        if (fault === "remove")
          Storage.prototype.removeItem = () => {
            throw new Error("remove blocked");
          };
      }, fault);
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(route);
      const select = page.getByLabel("Theme", { exact: true });
      await expect(select).toHaveValue(
        fault === "write" || fault === "remove" ? "dark" : "system",
      );
      await appearance(
        page,
        fault === "write" || fault === "remove" ? "dark" : "light",
      );
      await select.selectOption("light");
      await appearance(page, "light");
      await select.selectOption("dark");
      await appearance(page, "dark");
      await select.selectOption("system");
      await appearance(page, "light");
      await expect(page.locator("main h1")).toBeVisible();
      expect(errors).toEqual([]);
      if (fault === "remove") {
        expect(
          await page.evaluate(() => localStorage.getItem("katpb.theme")),
        ).toBe("dark");
        await page.reload();
        await appearance(page, "dark");
      }
    });
  }
  for (const mode of ["light", "dark"] as const) {
    test(`saved ${mode} before first rendered frame ${route}`, async ({
      page,
    }) => {
      await page.emulateMedia({
        colorScheme: mode === "dark" ? "light" : "dark",
      });
      await page.addInitScript((mode) => {
        localStorage.setItem("katpb.theme", mode);
        const capture = () => {
          const mark = document.querySelector(".brand-mark");
          if (!mark) {
            requestAnimationFrame(capture);
            return;
          }
          (window as unknown as { firstAppearance: unknown }).firstAppearance =
            {
              mode: document.documentElement.dataset.theme,
              color: getComputedStyle(mark).color,
            };
        };
        requestAnimationFrame(capture);
      }, mode);
      await page.goto(route);
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              (window as unknown as { firstAppearance: unknown })
                .firstAppearance,
          ),
        )
        .toEqual({ mode, color: colors[mode] });
      const html = builtDocument(route);
      const initializer = html.indexOf("localStorage.getItem");
      expect(initializer).toBeGreaterThan(0);
      expect(initializer).toBeLessThan(html.indexOf('rel="stylesheet"'));
      expect(initializer).toBeLessThan(html.indexOf("<body"));
      expect(html.match(/localStorage\.getItem/g)).toHaveLength(1);
    });
    test(`no script System ${mode} and hidden selector ${route}`, async ({
      browser,
      baseURL,
    }) => {
      const context = await browser.newContext({
        javaScriptEnabled: false,
        colorScheme: mode,
      });
      try {
        const page = await context.newPage();
        await page.goto(`${baseURL}${route}`);
        await appearance(page, mode);
        await expect(page.getByLabel("Theme", { exact: true })).toBeHidden();
        await expect(page.locator(".rail-inner")).toHaveCSS(
          "position",
          "static",
        );
      } finally {
        await context.close();
      }
    });
  }
  test(`canonical brand geometry ${route}`, async ({ page }) => {
    await page.goto(route);
    const mark = page.locator(".brand-mark");
    await expect(mark).toHaveAttribute("viewBox", "244 173 745 420");
    await expect(mark).toHaveAttribute("aria-hidden", "true");
    await expect(mark).toHaveAttribute("focusable", "false");
    const canonical = canonicalBrand;
    const paths = [...canonical.matchAll(/\bd="([^"]+)"/g)].map((m) => m[1]);
    expect(
      await mark
        .locator("path")
        .evaluateAll((paths) => paths.map((p) => p.getAttribute("d"))),
    ).toEqual(paths);
    await expect(mark.locator("path")).toHaveAttribute("fill", "currentColor");
    await page.getByLabel("Theme", { exact: true }).selectOption("light");
    const light = await mark.boundingBox();
    await appearance(page, "light");
    await page.getByLabel("Theme", { exact: true }).selectOption("dark");
    const dark = await mark.boundingBox();
    await appearance(page, "dark");
    expect(light?.width).toBeGreaterThanOrEqual(48);
    expect(light?.width).toBe(dark?.width);
    expect(light?.height).toBe(dark?.height);
    expect(light!.width / light!.height).toBeCloseTo(745 / 420, 2);
  });
}
