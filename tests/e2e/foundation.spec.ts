import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("renders the foundation page contract", async ({ page }) => {
  const consoleErrors: string[] = [];
  const crossOriginRequests: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("request", (request) => {
    const requestURL = new URL(request.url());
    if (requestURL.origin !== "http://127.0.0.1:4322") {
      crossOriginRequests.push(request.url());
    }
  });

  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/katpb\.dev/i);
  await expect(page.locator("html")).toHaveAttribute(
    "lang",
    /^[a-z]{2,3}(?:-[A-Za-z0-9]+)*$/,
  );
  await expect(page.locator("header")).toHaveCount(1);
  await expect(page.locator("main")).toHaveCount(1);

  const description = page.locator('meta[name="description"]');
  await expect(description).toHaveAttribute("content", /\S+/);
  await expect(page.getByText("katpb.dev", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(
    page.getByText(/project foundation is operational/i),
  ).toBeVisible();

  const skipLink = page.getByRole("link", { name: /skip to main content/i });
  await expect(skipLink).toHaveAttribute("href", "#main-content");
  await skipLink.focus();
  await expect(skipLink).toBeFocused();
  expect(
    await skipLink.evaluate(
      (element) => getComputedStyle(element).outlineStyle,
    ),
  ).not.toBe("none");
  await skipLink.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();

  const hasHorizontalOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
  expect(crossOriginRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);

  const accessibility = await new AxeBuilder({ page })
    .withTags([
      "wcag2a",
      "wcag2aa",
      "wcag21a",
      "wcag21aa",
      "wcag22a",
      "wcag22aa",
    ])
    .analyze();
  expect(accessibility.violations).toEqual([]);
});

test("keeps core content readable without JavaScript", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 320, height: 800 },
  });
  const page = await context.newPage();

  try {
    const response = await page.goto(`${baseURL}/`);
    expect(response?.status()).toBe(200);
    await expect(page.getByText("katpb.dev", { exact: true })).toBeVisible();
    await expect(
      page.getByText(/project foundation is operational/i),
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

    const hasHorizontalOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
  } finally {
    await context.close();
  }
});
