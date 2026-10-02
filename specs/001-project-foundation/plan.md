# Implementation Plan: R1 Project Foundation

**Branch**: `001-project-foundation` | **Date**: 2026-10-02 | **Spec**:
[spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-project-foundation/spec.md` plus the approved
technical direction: Astro, Markdown/MDX, GitHub, macOS local development, minimal dependencies,
and future compatibility with Cloudflare Workers Static Assets without R1 deployment work.

## Summary

Create a single, static-output Astro 7 project at the repository root. The foundation provides one
minimal semantic page, built-in Markdown plus the official MDX integration, deterministic npm
setup and builds, a strict local port contract, offline-capable post-install workflows, automated
format/type/browser/accessibility checks, and documented manual accessibility and Core Web Vitals
acceptance procedures.

The build remains deployment-neutral: Astro emits static files to `dist/`, which a later roadmap
item can publish as Cloudflare Workers Static Assets. R1 adds no Cloudflare adapter, Wrangler
configuration, GitHub Actions, publishing workflow, UI system, or production deployment.

## Technical Context

**Language/Version**: Astro component templates, HTML5, CSS, strict TypeScript, Markdown, and MDX
on Node.js 24.21.0 LTS with npm 11.x

**Primary Dependencies**: Astro 7.x and `@astrojs/mdx`; development-only
`@astrojs/check`, TypeScript, Prettier, `prettier-plugin-astro`, `@playwright/test`, and
`@axe-core/playwright`

**Storage**: N/A; no database, persistent application data, content collection, or runtime state

**Testing**: Astro diagnostics, Playwright against the production build in pinned Chromium and
WebKit, axe accessibility scans, and dependency-free Node scripts/tests for workflow behavior and
build reproducibility

**Target Platform**: Local development and acceptance on macOS on Apple Silicon with Git,
Node.js 24.21.0 LTS, npm 11.x, and current Chrome/Safari. Acceptance records the exact tested
macOS version without pinning support to that release; output is portable static HTML/CSS/assets
in `dist/`.

**Project Type**: Single static website project

**Performance Goals**: Five-run mobile lab p75 of LCP <=2.5 seconds, local INP <=200 milliseconds,
and CLS <=0.1 for the foundation page

**Constraints**: WCAG 2.2 AA; readable without client JavaScript; no personal data, cookies,
credentials, remote runtime dependencies, or undeclared services; development, validation, and
build work offline after initial dependency/browser acquisition; repeated builds contain the same
generated paths and substantive file content, with only explicitly identified volatile filesystem
metadata excluded; port conflicts fail with an alternate-port instruction

**Scale/Scope**: One local foundation page, one Astro project, one supported macOS environment,
and no publishing, final UI, application backend, deployment, analytics, forms, search, or user
accounts

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design._

### Pre-Research Gate

| Principle or constraint                       | Result | Plan evidence                                                                                                                                                      |
| --------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I. User Value and Content Integrity           | PASS   | R1 serves the documented contributor and maintainer outcomes; the page contains only the approved foundation status and no placeholder future features.            |
| II. Accessibility and Progressive Enhancement | PASS   | Semantic static HTML is readable without JavaScript; automated axe plus keyboard, VoiceOver, zoom, and responsive manual checks cover WCAG 2.2 AA expectations.    |
| III. Performance Is a Feature                 | PASS   | Static output, local assets, no client framework, and a repeatable five-run mobile measurement protocol enforce the approved LCP, INP, and CLS limits.             |
| IV. Privacy and Security by Default           | PASS   | No personal data, forms, cookies, analytics, remote embeds, secrets, or runtime services are introduced. Local servers bind to loopback by default.                |
| V. Simplicity and Verifiable Quality          | PASS   | One standard Astro project and the smallest justified tool set provide formatting, diagnostics, browser smoke tests, accessibility scans, and reproducible builds. |
| Stable standards and build-produced content   | PASS   | Astro statically emits semantic HTML/CSS; no avoidable client-side JavaScript is planned.                                                                          |
| Responsive layout and discovery metadata      | PASS   | The minimal page includes language, title, and description metadata and is checked at 320 CSS pixels and desktop widths without horizontal overflow.               |
| Versioned external dependencies               | PASS   | All dependencies are declared and locked; dependency purpose and rejected alternatives are recorded in [research.md](./research.md).                               |
| Environment separation and safe errors        | PASS   | R1 needs no secrets or environment values; startup failure messages expose no internal details and provide recovery instructions.                                  |
| Delivery workflow                             | PASS   | The feature has acceptance scenarios, local automated checks, recorded manual UI verification, and no production release in scope.                                 |

No constitutional exception is required.

## Project Structure

### Documentation (this feature)

```text
specs/001-project-foundation/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── build-artifact.md
│   ├── developer-commands.md
│   └── foundation-page.md
├── checklists/
│   └── requirements.md
└── tasks.md                 # Generated by $speckit-tasks
```

### Source Code (repository root)

```text
.
├── .gitattributes           # Repository-wide LF text normalization
├── .gitignore               # Dependencies, build/cache/test output, secrets, OS/editor files
├── .npmrc                   # Shared npm behavior; no forced offline mode
├── .nvmrc                   # Node.js 24.21.0
├── CONTRIBUTING.md          # Placement, naming, validation, and documentation conventions
├── README.md                # Prerequisites, setup, commands, troubleshooting, directory guide
├── astro.config.mjs         # Static output, MDX integration, loopback server, strict ports
├── package.json             # Private package, runtime constraints, local workflow scripts
├── package-lock.json        # Exact dependency graph
├── playwright.config.ts     # Built-site server and Chromium/WebKit projects
├── prettier.config.mjs      # Astro-aware formatting
├── tsconfig.json            # Astro strict TypeScript baseline
├── scripts/
│   ├── check-reproducible-build.mjs
│   └── dev.mjs
├── src/
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── pages/
│   │   └── index.astro
│   └── styles/
│       └── global.css
└── tests/
    ├── e2e/
    │   └── foundation.spec.ts
    └── integration/
        └── dev-port-conflict.test.mjs
```

`public/` is the documented location for future unprocessed public assets and `src/assets/` for
future pipeline-processed assets. Neither directory receives a placeholder file in R1; each is
created only when a real asset exists. Publishing content locations and schemas are intentionally
left to R3.

**Structure Decision**: A single root Astro project is the simplest structure that satisfies R1.
`src/pages/` owns routes, `src/layouts/` owns shared document structure and metadata,
`src/styles/` owns baseline CSS, `scripts/` owns dependency-free workflow enforcement, and
`tests/` owns behavior outside production source. Generated directories are never source.

## Tooling and Package Management

### Runtime and package metadata

- Pin Node.js `24.21.0` in `.nvmrc`.
- Use npm 11.x, declare compatible Node/npm ranges with failing `devEngines` checks, and mark the
  package `private: true`.
- Commit `package-lock.json`. Use `npm ci` for setup; use `npm install <package>` only for an
  intentional dependency change and commit both manifests.
- Disable Astro telemetry for project-owned commands. Do not configure npm globally or force npm
  offline, because initial setup legitimately obtains dependencies.

### Dependency boundary

- Runtime/build dependencies: `astro` and `@astrojs/mdx`.
- Development dependencies: `@astrojs/check`, `typescript`, `prettier`,
  `prettier-plugin-astro`, `@playwright/test`, and `@axe-core/playwright`.
- Do not add a UI framework, CSS framework/preprocessor, general unit-test runner, generic linter,
  content system, analytics SDK, Cloudflare adapter, Wrangler, or deployment package.

Every new dependency after R1 must document the unmet need, license/security review, and why the
existing platform or tool set is insufficient.

## Astro Configuration

- Set `output: 'static'` and retain `outDir: './dist'` as an explicit architectural guardrail.
- Register only the official MDX integration. Retain Astro's default Markdown processor.
- Use strict TypeScript settings and no experimental Astro features.
- Bind development and preview to loopback by default.
- Keep port 4321 as the documented development address. Enable Vite `server.strictPort` and
  `preview.strictPort` so an occupied port never silently changes the URL.
- Use `scripts/dev.mjs` as the `npm run dev` entry point. It validates the requested/default
  port before delegating to the local Astro CLI and prints
  `npm run dev -- --port <free-port>` before exiting nonzero on conflict.
- Keep all page assets local and emit no client-side script for the R1 page unless an accessibility
  requirement demonstrably needs it.

## Local Setup and Development Workflow

1. On macOS on Apple Silicon, install the Node version from `.nvmrc` and confirm the documented
   npm major. Record the exact macOS version during acceptance.
2. Run `npm ci` from a clean checkout.
3. Run `npm run test:install` once while online to obtain the Playwright-pinned Chromium and
   WebKit binaries.
4. Run `npm run dev`; open `http://127.0.0.1:4321/`.
5. Edit `src/pages/index.astro`, `src/layouts/BaseLayout.astro`, or
   `src/styles/global.css`; Astro hot reload shows source changes without setup or a build.
6. Stop the foreground server with `Ctrl-C`.

If port 4321 is occupied, startup exits with the alternate-port command. If an install is
interrupted, rerun `npm ci`. If development, validation, or build is interrupted, rerun the same
command; project commands must not require manual cache or output deletion.

## Commands and Validation Pipeline

The implementation exposes these package scripts:

| Command                         | Contract                                                                                                          |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `npm ci`                        | Clean, lockfile-enforced dependency setup; may use network.                                                       |
| `npm run test:install`          | Initial Playwright Chromium/WebKit acquisition; may use network.                                                  |
| `npm run dev [-- --port N]`     | Start the loopback development server with strict port handling and hot reload.                                   |
| `npm run build`                 | Force a full static build into a freshly replaced `dist/`; source remains unchanged.                              |
| `npm run preview [-- --port N]` | Serve the current `dist/` locally for acceptance testing only.                                                    |
| `npm run format`                | Apply Prettier formatting; intentionally mutating.                                                                |
| `npm run format:check`          | Check formatting without modifying files.                                                                         |
| `npm run check`                 | Run Astro/TypeScript diagnostics and fail on warnings.                                                            |
| `npm run test:e2e`              | Exercise the built page in pinned Chromium and WebKit, including axe.                                             |
| `npm run test:workflow`         | Verify strict port failure and recovery messaging with Node's test runner.                                        |
| `npm run test:reproducible`     | Same generated files and substantive content; only explicitly identified volatile filesystem metadata may differ. |
| `npm run verify`                | Run format check, diagnostics, one build, E2E tests, workflow tests, and reproducibility validation.              |

`npm run verify` is the single non-mutating repository-health entry point. Its first build is the
baseline consumed by browser tests and reproducibility validation; the reproducibility step runs
the second build, so verification proves two-build equivalence without a redundant third build.
All invoked tools resolve from `node_modules` and all inputs are local, so `dev`, `build`, and
`verify` work without network access after setup.

## Build and Reproducibility Approach

- `npm run build` performs a full static build and replaces stale output rather than relying on
  incremental state.
- `scripts/check-reproducible-build.mjs` records the current `dist/` as sorted normalized relative
  paths with one SHA-256 hash of each file's bytes, runs the same build command once more, and
  compares the second manifest. Matching paths and hashes operationalize the approved requirement
  for the same generated files and substantive content. Only explicitly identified volatile
  filesystem metadata—timestamps, ownership, and permissions—is excluded from the comparison.
- The script snapshots tracked-file state before and after the build sequence and fails if the
  build changes tracked files. Existing unrelated working-tree changes are compared before/after,
  not treated as build output.
- The final artifact must contain a directly servable root HTML page and only local assets. No
  Worker entry point, server bundle, runtime secret, or external asset fetch is permitted.

## Testing Approach

### Automated browser coverage

Playwright starts `astro preview` on fixed loopback port 4322 with reuse disabled, ensuring tests
exercise the current production build rather than a stray server. Chromium and WebKit projects use
representative mobile and desktop viewports.

The foundation test verifies:

- HTTP success, document title, one primary heading, the exact operational status, and a
  keyboard-operable in-page skip link;
- semantic landmarks, document language, description metadata, and local-only resources;
- readable core content with JavaScript disabled;
- no unexpected console errors or cross-origin requests;
- no horizontal overflow or lost content at 320 CSS pixels and the desktop viewport;
- the available keyboard journey and visible focus state;
- zero axe violations for applicable WCAG 2.0/2.1/2.2 A and AA rule tags.

### Workflow and artifact coverage

- A Node integration test occupies port 4321, starts the development command, and verifies a
  nonzero exit plus the exact alternate-port guidance.
- The reproducibility script covers output recovery, stable file identity/content, and a clean
  tracked-source state.
- A negative verification check is documented: introduce a known formatting or content assertion
  failure, confirm `npm run verify` exits nonzero and names the failed stage, then revert it.

Vitest is not introduced because R1 has no domain logic to unit test. Add a unit runner only when a
later feature creates independently testable logic.

### Final acceptance ordering

Complete all implementation, cross-cutting checks, defect remediation, and final automated and
contract verification before recording final acceptance evidence. Then run and record the timed
clean-checkout path for SC-001, followed by the manual accessibility and performance protocols.
If an acceptance result requires an implementation or documentation change, return to remediation,
repeat final verification, and rerun every affected final acceptance protocol; manual evidence may
not predate the version it approves.

The timed clean-checkout record includes Apple Silicon hardware, the exact tested macOS version,
Git/Node/npm versions, start and end times, elapsed duration, and the 10-minute pass/fail result.

## Accessibility Verification

Automated axe and browser assertions are necessary but not sufficient. Before R1 acceptance,
record a manual check on current macOS Chrome and Safari for:

- correct page title, language, heading/landmark structure, and reading order;
- keyboard-only traversal, visible and unobscured focus, and no keyboard trap;
- VoiceOver announcement and reading order;
- 200% text zoom without loss of content;
- 320 CSS-pixel reflow and a representative desktop width without horizontal page scrolling;
- text/focus contrast and no meaning communicated by color alone;
- complete readability when optional JavaScript is disabled.

The record includes browser/OS versions, viewports, reviewer, date, and results. Any exception
would require a constitution exception with an owner and removal date; none is planned.

## Performance Verification

Use the production preview and Chrome Stable DevTools Live Metrics rather than claiming that a
navigation-only Lighthouse audit measures INP.

1. Build once and preview on loopback port 4322.
2. Open Chrome Stable Incognito with a fixed 360 x 800 mobile viewport, Fast 4G network
   throttling, and 4x CPU slowdown for every run.
3. Clear site data, cold reload, wait for load completion, and activate the page's skip link once
   by pointer and once by keyboard so the run contains qualifying interactions.
4. Record local LCP, local INP, and CLS.
5. Repeat five times on the same machine and Chrome version. Sort each metric and use the fourth
   value as nearest-rank p75.
6. Pass only when p75 LCP <=2500 ms, local INP <=200 ms, and CLS <=0.1.

Store the acceptance record with the review, including hardware, exact tested macOS and Chrome
versions, viewport, throttling preset, five raw runs, and calculated p75. This is local diagnostic
evidence, not field INP. When representative production field data exists in a later roadmap item,
use the true 75th-percentile field metrics required by the constitution.

## Repository Conventions

- GitHub remains the source repository and `main` the integration branch; R1 adds no CI workflow
  or release automation.
- Normalize text to LF with `.gitattributes`.
- Ignore `node_modules/`, `dist/`, `.astro/`, Playwright reports/results, coverage, logs,
  environment files, editor state, and OS metadata. Never ignore dependency manifests.
- Use PascalCase for reusable Astro components/layouts, lowercase kebab-case for route segments,
  and descriptive kebab-case for scripts and tests.
- Put routes only in `src/pages/`; shared document structure in `src/layouts/`; processed source
  styles/assets under `src/`; unprocessed public files in `public/`; workflow enforcement in
  `scripts/`; and executable behavior checks in `tests/`.
- Keep generated output and caches out of version control. Do not commit secrets or machine-local
  configuration.
- Update README/CONTRIBUTING whenever a command, prerequisite, top-level path, naming rule, or
  recovery procedure changes.
- Dependency changes must update and review both `package.json` and `package-lock.json`.
- Pull-request review must reference the applicable spec scenarios, automated result, manual
  accessibility record for UI changes, and performance record when page-loading behavior changes.

## Explicitly Deferred

- Visual design system, component library, branding, final styles, and interaction design (R2)
- Content collections, article schemas, editorial rules, feeds, and publishing workflow (R3)
- Cloudflare adapter/configuration, Wrangler, Workers bindings, domains, CI/CD, previews,
  deployment, rollback, and production monitoring (R4)
- Analytics, forms, authentication, search, databases, APIs, and any unapproved roadmap feature

## Post-Design Constitution Re-check

Phase 1 introduces no persistent data, external runtime service, client framework, production
infrastructure, or unexplained dependency. The contracts preserve semantic static output,
loopback-only local services, offline post-install workflows, deterministic builds, WCAG 2.2 AA
verification, and quantitative performance acceptance. All pre-research gates remain **PASS** and
no complexity exception is required.
