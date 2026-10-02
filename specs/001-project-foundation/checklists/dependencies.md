# Dependency Review: R1 Project Foundation

**Reviewed**: 2026-10-02 14:13 IST  
**Lockfile**: `package-lock.json`, lockfile version 3  
**Security evidence**: `npm audit --json` completed against the npm advisory service with zero
known info, low, moderate, high, or critical vulnerabilities. The report covered 387 logical
production, development, and optional dependency entries.

## Direct dependencies

| Package                 | Version | Purpose                                                           | License    | Review result       |
| ----------------------- | ------: | ----------------------------------------------------------------- | ---------- | ------------------- |
| `astro`                 |   7.3.5 | Static site framework and local/build command surface.            | MIT        | Required; accepted. |
| `@astrojs/mdx`          |   8.0.2 | Official Markdown/MDX integration required by R1.                 | MIT        | Required; accepted. |
| `@astrojs/check`        |  0.9.10 | Astro and TypeScript diagnostics for `.astro` files.              | MIT        | Required; accepted. |
| `typescript`            |   6.0.3 | Strict type checking used by Astro diagnostics.                   | Apache-2.0 | Required; accepted. |
| `prettier`              |   3.9.9 | Deterministic source and documentation formatting.                | MIT        | Required; accepted. |
| `prettier-plugin-astro` |   1.1.0 | Astro-file formatting support for Prettier.                       | MIT        | Required; accepted. |
| `@playwright/test`      |  1.63.0 | Pinned Chromium/WebKit browser testing and local preview harness. | Apache-2.0 | Required; accepted. |
| `@axe-core/playwright`  |  4.13.0 | Automated WCAG A/AA checks inside the browser suite.              | MPL-2.0    | Required; accepted. |

All versions are exact in `package.json` and resolved exactly by `package-lock.json`. The install
script allowlist contains only the locked platform/build helpers `esbuild@0.28.2` and
`fsevents@2.3.3`; no other package install script is approved.

## Rejected additions

- No Cloudflare adapter, Wrangler, deployment package, or GitHub Actions helper: production
  deployment is outside R1.
- No UI framework, component library, icon package, CSS framework, or font package: the
  foundation page needs only Astro and local baseline CSS.
- No separate unit-test runner, linter, accessibility runner, or static server: Node's test
  runner, Astro diagnostics, Playwright, axe, and Astro preview cover the approved checks.
- No content, publishing, analytics, account, form, search, database, or API package: those are
  later-roadmap concerns.
- No convenience package for argument parsing, hashing, directory walking, port detection, or
  process control: Node.js standard-library APIs are sufficient.

## Outcome

The eight direct dependencies have an R1 requirement, compatible license, exact lockfile state,
and no known advisory at review time. No unnecessary dependency was added.
