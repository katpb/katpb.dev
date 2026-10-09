import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { hostedMode } from "../../scripts/hosting/hosted-mode.mjs";
import { digest } from "../../scripts/hosting/release-records.mjs";

const hosted = hostedMode();
if (!hosted)
  throw new Error(
    "Select hosted tests explicitly with R4_HOSTED_URL and R4_HOSTED_MANIFEST.",
  );
const origin = new URL(hosted.url).origin;
const routes = hosted.manifest.packageManifest
  .filter((e: { path: string }) => e.path.endsWith("index.html"))
  .map((e: { path: string }) => "/" + e.path.slice(0, -"index.html".length));
for (const javaScriptEnabled of [true, false]) {
  test.describe(`hosted JS=${javaScriptEnabled}`, () => {
    test.use({ javaScriptEnabled });
    for (const route of routes)
      for (const colorScheme of ["light", "dark"] as const) {
        test(`${colorScheme} foundation ${route}`, async ({
          page,
          context,
        }) => {
          await page.emulateMedia({ colorScheme });
          const errors: string[] = [];
          const unexpected: string[] = [];
          const failures: string[] = [];
          page.on("pageerror", (e) => errors.push(e.message));
          page.on("requestfailed", (r) =>
            failures.push(new URL(r.url()).pathname),
          );
          await context.route("**/*", async (r) => {
            const u = new URL(r.request().url());
            if (u.origin !== origin || u.protocol !== "https:") {
              unexpected.push(u.href);
              await r.abort();
              return;
            }
            const p = u.pathname.endsWith("/")
              ? u.pathname.slice(1) + "index.html"
              : u.pathname.slice(1);
            if (
              !hosted.manifest.packageManifest.some(
                (e: { path: string }) => e.path === p,
              )
            ) {
              unexpected.push(u.pathname);
              await r.abort();
              return;
            }
            await r.fallback();
          });
          const response = await page.goto(route);
          expect(response?.status()).toBe(200);
          expect(response?.headers()["content-type"]).toContain("text/html");
          const entry = hosted.manifest.packageManifest.find(
            (e: { path: string }) => e.path === route.slice(1) + "index.html",
          );
          expect(digest(await response!.body())).toBe(entry!.sha256);
          await expect(page.locator("html")).toHaveAttribute("lang", "en");
          await expect(page.locator("main")).toBeVisible();
          await expect(page.locator("h1")).toBeVisible();
          expect(
            (await page.locator("main").innerText()).length,
          ).toBeGreaterThan(30);
          await expect(page).toHaveTitle(/katpb\.dev/);
          expect(
            await page.evaluate(
              () =>
                document.documentElement.scrollWidth >
                document.documentElement.clientWidth,
            ),
          ).toBe(false);
          if (javaScriptEnabled) {
            const axe = await new AxeBuilder({ page })
              .withTags([
                "wcag2a",
                "wcag2aa",
                "wcag21a",
                "wcag21aa",
                "wcag22a",
                "wcag22aa",
              ])
              .analyze();
            expect(axe.violations).toEqual([]);
          }
          expect(unexpected).toEqual([]);
          expect(errors).toEqual([]);
          expect(failures).toEqual([]);
          expect(await context.cookies()).toEqual([]);
        });
      }
  });
}
