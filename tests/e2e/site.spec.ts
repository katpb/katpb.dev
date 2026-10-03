import { saveAudit } from "./artifacts.mjs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const routes = ["/", "/writing/", "/projects/", "/about/"];
const labels = ["Home", "Writing", "Projects", "About"];
for (const route of routes) {
  test(`shared shell ${route}`, async ({ page, context, browserName }) => {
    const errors: string[] = [];
    const remote: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("request", (request) => {
      if (new URL(request.url()).origin !== "http://127.0.0.1:4322")
        remote.push(request.url());
    });
    expect((await page.goto(route))?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    for (const selector of ["header", "main", "h1", "footer"])
      await expect(page.locator(selector)).toHaveCount(1);
    await expect(page).toHaveTitle(/katpb\.dev/);
    const title = await page.title();
    const description = await page
      .locator('meta[name="description"]')
      .getAttribute("content");
    expect(description?.length).toBeGreaterThan(20);
    const canonical = `https://katpb.dev${route}`;
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      canonical,
    );
    for (const [key, value] of Object.entries({
      title,
      description: description!,
      type: "website",
      url: canonical,
      site_name: "katpb.dev",
    }))
      await expect(page.locator(`meta[property="og:${key}"]`)).toHaveAttribute(
        "content",
        value,
      );
    for (const [key, value] of Object.entries({
      title,
      description: description!,
      card: "summary",
    }))
      await expect(page.locator(`meta[name="twitter:${key}"]`)).toHaveAttribute(
        "content",
        value,
      );
    const nav = page.getByRole("navigation", { name: "Primary", exact: true });
    await expect(nav.getByRole("link")).toHaveCount(4);
    for (let i = 0; i < routes.length; i++) {
      const link = nav.getByRole("link").nth(i);
      await expect(link).toContainText(labels[i]);
      await expect(link).toHaveAttribute("href", routes[i]);
      await expect(link).toBeVisible();
    }
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(nav.locator('[aria-current="page"]')).toHaveAttribute(
      "href",
      route,
    );
    await expect(nav.locator('[aria-current="page"]')).toContainText("Current");
    await expect(
      page.getByRole("link", { name: "katpb.dev — Home", exact: true }),
    ).toBeVisible();
    // macOS WebKit uses Option-Tab to include links in keyboard traversal.
    await page.keyboard.press(browserName === "webkit" ? "Alt+Tab" : "Tab");
    const skip = page.getByRole("link", { name: "Skip to main content" });
    await expect(skip).toBeFocused();
    expect(
      await skip.evaluate((e) => getComputedStyle(e).outlineStyle),
    ).not.toBe("none");
    await skip.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      ),
    ).toBe(false);
    expect(await context.cookies()).toEqual([]);
    expect(
      await page.evaluate(() => ({
        local: Object.keys(localStorage),
        session: Object.keys(sessionStorage),
      })),
    ).toEqual({ local: [], session: [] });
    for (const list of await page
      .locator(".writing-list, .project-list, .project-labels, .profile-links")
      .all())
      await expect(list).toHaveAttribute("role", "list");
    expect(remote).toEqual([]);
    expect(errors).toEqual([]);
  });
  for (const colorScheme of ["light", "dark"] as const) {
    test(`accessible ${colorScheme} ${route}`, async ({ page }, testInfo) => {
      await page.emulateMedia({ colorScheme });
      await page.goto(route);
      const result = await new AxeBuilder({ page })
        .withTags([
          "wcag2a",
          "wcag2aa",
          "wcag21a",
          "wcag21aa",
          "wcag22a",
          "wcag22aa",
        ])
        .analyze();
      saveAudit(testInfo.outputPath("axe-incomplete.json"), result.incomplete);
      await testInfo.attach("axe-incomplete", {
        body: JSON.stringify(result.incomplete, null, 2),
        contentType: "application/json",
      });
      expect(result.violations).toEqual([]);
    });
    test(`no JavaScript ${colorScheme} ${route}`, async ({
      browser,
      baseURL,
    }) => {
      const context = await browser.newContext({
        javaScriptEnabled: false,
        colorScheme,
        viewport: { width: 320, height: 800 },
      });
      try {
        const page = await context.newPage();
        expect((await page.goto(`${baseURL}${route}`))?.status()).toBe(200);
        await expect(page.locator("h1")).toBeVisible();
        await expect(
          page
            .getByRole("navigation", { name: "Primary", exact: true })
            .getByRole("link"),
        ).toHaveCount(4);
        expect(await page.locator("main").innerText()).toMatch(/\S.{30}/);
        if (route === "/" || route === "/writing/")
          await expect(page.locator(".writing-entry")).toHaveCount(
            route === "/" ? 3 : 4,
          );
        if (route === "/" || route === "/projects/")
          await expect(page.locator(".project-summary")).toHaveCount(3);
        if (route === "/about/")
          await expect(page.locator(".prose section")).toHaveCount(3);
        expect(
          await page.evaluate(
            () =>
              document.documentElement.scrollWidth >
              document.documentElement.clientWidth,
          ),
        ).toBe(false);
      } finally {
        await context.close();
      }
    });
  }
}
test("metadata is unique across routes", async ({ page }) => {
  const titles = [],
    descriptions = [];
  for (const route of routes) {
    await page.goto(route);
    titles.push(await page.title());
    descriptions.push(
      await page.locator('meta[name="description"]').getAttribute("content"),
    );
  }
  expect(new Set(titles).size).toBe(4);
  expect(new Set(descriptions).size).toBe(4);
});

test("Home is the first complete content increment", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("main h2")).toHaveText([
    "Featured writing",
    "Selected work",
    "A little about me",
  ]);
  await expect(page.locator(".writing-entry")).toHaveCount(3);
  await expect(page.locator(".project-summary")).toHaveCount(3);
  await expect(page.locator("main .sample-label")).toHaveCount(4);
  await expect(page.locator(".profile-links")).toHaveCount(0);
  await expect(
    page.locator(".project-summary img, .project-summary a, .writing-entry a"),
  ).toHaveCount(0);
  for (const [name, href] of [
    ["All writing", "/writing/"],
    ["All projects", "/projects/"],
    ["More about me", "/about/"],
  ]) {
    const link = page.getByRole("link", { name, exact: true });
    await expect(link).toHaveAttribute("href", href);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await page.goto("/");
  }
});

for (const javaScriptEnabled of [true, false]) {
  test.describe(`Writing content JS=${javaScriptEnabled}`, () => {
    test.use({ javaScriptEnabled });
    test("complete notebook independently", async ({ page }) => {
      await page.goto("/writing/");
      await expect(page.locator("h1")).toHaveText("A technical notebook.");
      await expect(page.locator(".writing-entry")).toHaveCount(4);
      expect(
        new Set(await page.locator(".entry-theme").allTextContents()).size,
      ).toBeGreaterThanOrEqual(2);
      await expect(page.locator("main .sample-label")).toContainText([
        "Illustrative introduction",
        "Illustrative notebook entries",
      ]);
      for (const entry of await page.locator(".writing-entry").all()) {
        expect((await entry.locator("h3").innerText()).length).toBeGreaterThan(
          10,
        );
        expect(
          (await entry.locator("p").last().innerText()).length,
        ).toBeGreaterThan(40);
      }
      await expect(
        page.locator(".writing-entry a, main time, main button, main input"),
      ).toHaveCount(0);
      await page
        .getByRole("link", { name: "katpb.dev — Home", exact: true })
        .click();
      await expect(page.locator(".writing-entry")).toHaveCount(3);
    });
  });
}

for (const javaScriptEnabled of [true, false]) {
  test.describe(`Projects content JS=${javaScriptEnabled}`, () => {
    test.use({ javaScriptEnabled });
    test("complete work independently", async ({ page }) => {
      await page.goto("/projects/");
      await expect(page.locator("h1")).toHaveText("Work, with context.");
      await expect(page.locator(".project-summary")).toHaveCount(3);
      for (const project of await page.locator(".project-summary").all()) {
        await expect(project.locator("dt")).toHaveText([
          "Context",
          "Approach",
          "Intended value",
        ]);
        for (const description of await project.locator("dd").all())
          expect((await description.innerText()).length).toBeGreaterThan(40);
        expect(await project.evaluate((e) => getComputedStyle(e).cursor)).toBe(
          "auto",
        );
      }
      await expect(
        page.locator(
          ".project-summary a, .project-summary button, .project-summary img",
        ),
      ).toHaveCount(0);
      await expect(
        page.locator(".project-summary").last().locator(".project-labels"),
      ).toHaveCount(0);
      await expect(page.locator("main")).toContainText(
        "Illustrative work sketches",
      );
    });
  });
}

for (const javaScriptEnabled of [true, false]) {
  test.describe(`About content JS=${javaScriptEnabled}`, () => {
    test.use({ javaScriptEnabled });
    test("complete narrative independently", async ({ page }) => {
      await page.goto("/about/");
      await expect(page.locator("h1")).toHaveText("A little more perspective.");
      await expect(page.locator("main h2")).toHaveText([
        "Engineering with a wider view",
        "Making room for shared understanding",
        "Curiosity beyond the immediate problem",
      ]);
      await expect(page.locator(".prose section")).toHaveCount(3);
      for (const section of await page.locator(".prose section").all()) {
        await expect(section.locator("p")).toHaveCount(2);
        expect((await section.innerText()).length).toBeGreaterThan(200);
      }
      await expect(page.locator("main .sample-label")).toContainText(
        "Illustrative profile",
      );
      await expect(page.locator("main img")).toHaveCount(0);
      await page
        .getByRole("navigation", { name: "Primary", exact: true })
        .getByRole("link")
        .first()
        .click();
      await expect(page).toHaveURL(/\/$/);
      await expect(page.locator("main h1")).toContainText("Building software");
    });
  });
}
