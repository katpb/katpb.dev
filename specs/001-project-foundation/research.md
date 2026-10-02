# Phase 0 Research: R1 Project Foundation

## Decision 1: Runtime and framework baseline

**Decision**: Use Astro 7.x on Node.js 24.21.0 LTS for the supported macOS on Apple Silicon
development and acceptance environment. Record the exact tested macOS version during acceptance
without making that release the support boundary. Pin Node in `.nvmrc`, declare compatible Node
and npm ranges in `package.json`, and lock the exact Astro release selected during implementation
in `package-lock.json`.

**Rationale**: Astro 7 is the current stable line and requires Node.js 22.12.0 or newer. Node 24 is
an LTS release with a longer support runway than Node 22, while Node 26 is still a Current release.

**Alternatives considered**:

- Node 22 LTS: compatible, but offers a shorter remaining support window.
- Node 26 Current: rejected because the project should start on an LTS runtime.
- A non-Astro framework: rejected because the technical direction explicitly selects Astro.

**Sources**:

- [Astro installation prerequisites](https://docs.astro.build/en/install-and-setup/)
- [Node.js release status](https://nodejs.org/en/about/previous-releases)

## Decision 2: Package management and deterministic setup

**Decision**: Use the npm 11 line bundled with Node 24. Commit `package.json` and
`package-lock.json`; document `npm ci` as the clean-checkout setup command. Mark the package
private and use npm `devEngines`/`engines` checks to fail clearly on incompatible Node or npm
versions.

**Rationale**: npm is already supplied by the selected runtime, so it adds no package-manager
bootstrap. `npm ci` requires a matching lockfile, replaces stale `node_modules`, and does not
rewrite dependency manifests, making clean and interrupted setup reruns deterministic.

**Alternatives considered**:

- pnpm or Yarn: both are capable, but add a second tool without an R1 benefit.
- `npm install` as the setup command: reserved for intentional dependency changes because it may
  update the lockfile.

**Sources**:

- [npm clean install](https://docs.npmjs.com/cli/v11/commands/npm-ci/)
- [npm package.json engines and devEngines](https://docs.npmjs.com/cli/configuring-npm/package-json/)

## Decision 3: Static Astro output and future Cloudflare compatibility

**Decision**: Keep Astro in explicit static-output mode and retain the conventional `dist/`
output directory. Add no Cloudflare adapter, Wrangler dependency, Worker entry point, or deployment
configuration in R1.

**Rationale**: Astro pre-renders static pages by default. Cloudflare Workers Static Assets can
later publish the resulting `dist/` directory directly, so deployment neutrality now preserves the
desired R4 path without coupling R1 to it.

**Alternatives considered**:

- `@astrojs/cloudflare` with server output: rejected because there are no server-rendered routes
  and it would introduce production-runtime concerns.
- A Wrangler file without deployment scripts: rejected because it is unused configuration owned
  by the deployment roadmap item.

**Sources**:

- [Astro configuration reference](https://docs.astro.build/en/reference/configuration-reference/)
- [Cloudflare's Astro framework guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/astro/)

## Decision 4: Markdown and MDX capability

**Decision**: Use Astro's built-in Markdown support and add only the official `@astrojs/mdx`
integration for MDX. Do not add content collections, authoring schemas, remark/rehype plugins, or
sample articles in R1.

**Rationale**: This provides the requested file-format capability with one official integration
while leaving publishing workflow and content modeling to R3.

**Alternatives considered**:

- Markdown only: rejected because MDX support is an explicit technical direction.
- Content collections now: rejected because defining article schemas would pre-empt the publishing
  roadmap item.
- Additional Markdown processors: rejected because no R1 requirement needs them.

**Sources**:

- [Astro Markdown guide](https://docs.astro.build/en/guides/markdown-content/)
- [Astro MDX integration](https://docs.astro.build/en/guides/integrations-guide/mdx/)

## Decision 5: Standard project structure

**Decision**: Use the standard single-project Astro layout at repository root. Create only folders
that R1 uses: `src/pages/`, `src/layouts/`, `src/styles/`, `scripts/`, and `tests/`. Reserve
`public/`, `src/assets/`, and future content locations through documented conventions rather than
adding empty or placeholder files.

**Rationale**: Astro requires `src/pages/` and documents the other source folders as conventions.
Avoiding speculative directories and abstractions satisfies the constitution's simplicity rule.

**Alternatives considered**:

- A monorepo or nested application: rejected because the specification defines one website.
- A feature-layer architecture: rejected because a single foundation page has no domain modules.

**Source**: [Astro project structure](https://docs.astro.build/en/basics/project-structure/)

## Decision 6: Formatting and static validation

**Decision**: Use Prettier plus `prettier-plugin-astro` for formatting, and `astro check` with
warnings treated as failures for Astro/TypeScript diagnostics. Use Astro's strict TypeScript
configuration. Do not add ESLint or another general-purpose linter in R1.

**Rationale**: The selected tools cover the actual R1 file types and catch template/type errors.
An additional linter would add policy and maintenance cost without meaningful application logic to
inspect yet.

**Alternatives considered**:

- ESLint or Biome: deferred until the codebase contains logic that Astro and TypeScript checks do
  not adequately cover.
- Formatting without a check mode: rejected because verification must be non-mutating.

**Sources**:

- [Astro `check` command](https://docs.astro.build/en/reference/cli-reference/#astro-check)
- [Astro editor and Prettier setup](https://docs.astro.build/en/editor-setup/#prettier)

## Decision 7: Automated testing

**Decision**: Use `@playwright/test` against the built site, with pinned Chromium and WebKit
browsers installed during initial setup. Add `@axe-core/playwright` for automated WCAG checks. Use
Node built-ins for the deterministic-build and command-behavior scripts; do not add a separate unit
test runner.

**Rationale**: The feature's behavior is a rendered page plus developer workflows. Browser tests
directly verify the page, progressive enhancement, responsive behavior, and accessibility, while a
small Node script can compare build artifacts without another framework.

**Alternatives considered**:

- Vitest: rejected because R1 has no independent domain logic or unit seam.
- Cypress: capable, but Playwright provides the needed browser projects and Astro documents the
  production-build test pattern.
- All three Playwright engines: Firefox is deferred to keep setup smaller; Chromium and WebKit
  represent Chrome and Safari on the supported macOS environment.

**Sources**:

- [Astro testing guide](https://docs.astro.build/en/guides/testing/)
- [Playwright browser projects](https://playwright.dev/docs/browsers)

## Decision 8: Accessibility verification

**Decision**: Run axe WCAG A/AA checks in both automated browser projects and fail on any returned
violation. Also record a manual macOS Chrome and Safari review covering semantics, VoiceOver
reading order, keyboard-only use and visible focus, 200% text zoom, and 320 CSS-pixel reflow.

**Rationale**: Automated accessibility checks find common violations but cannot establish full
WCAG 2.2 AA conformance. The combined automated and recorded manual review meets the constitution
without treating a tool score as complete coverage.

**Alternatives considered**:

- Axe alone: rejected because automated tools cannot detect every WCAG failure.
- Manual review alone: rejected because common regressions should be reproducible in verification.

**Sources**:

- [Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)

## Decision 9: Performance verification

**Decision**: Use a documented, repeatable Chrome Stable DevTools protocol on the locally previewed
production build. Run five cold mobile-emulated measurements, exercise every available pointer and
keyboard interaction, record local LCP, INP, and CLS, and use the nearest-rank 75th percentile for
the acceptance thresholds. Record Chrome version, machine, viewport, CPU/network throttling, and
results with the review.

**Rationale**: Standard Lighthouse navigation runs cannot measure INP because they perform no user
interaction. Chrome DevTools Live Metrics can report local INP after scripted human interactions;
the recorded protocol satisfies the approved metric while avoiding a misleading automated claim
and another large dependency. When field data exists later, it supersedes this lab evidence for
the constitution's 75th-percentile assessment.

**Alternatives considered**:

- Lighthouse CI as an all-three-metric gate: rejected because navigation-mode Lighthouse reports
  TBT as a lab proxy and does not prove the INP threshold.
- Qualitative performance review: rejected because SC-007 defines numeric acceptance thresholds.

**Sources**:

- [Chrome DevTools performance overview](https://developer.chrome.com/docs/devtools/performance/overview)
- [Measuring Web Vitals in the lab](https://web.dev/articles/vitals-measurement-getting-started)

## Decision 10: Offline, recovery, and port behavior

**Decision**: All normal commands use local package binaries and local assets; disable Astro
telemetry and avoid remote imports. Use full Astro builds that replace stale `dist/` output, and a
deterministic comparison script that hashes sorted relative paths plus file bytes. Configure Vite
strict-port behavior and put a dependency-free development launcher in `scripts/` so an occupied
port exits nonzero with the documented alternate-port command.

**Rationale**: These choices implement the clarified offline, safe-rerun, deterministic-output,
and actionable-port requirements without a persistent service or network dependency.

**Alternatives considered**:

- Astro's default next-free-port behavior: rejected because the approved specification requires a
  failure with recovery guidance.
- Remote fonts, scripts, or test services: rejected because validation and builds must work offline.
- Manual cleanup commands: rejected because the same setup/build/verification command must recover
  after interruption or stale output.

**Sources**:

- [Vite strict-port configuration](https://vite.dev/config/server-options#server-strictport)
- [Astro telemetry controls](https://astro.build/telemetry/)

## Decision 11: GitHub repository conventions

**Decision**: Retain GitHub as the source remote and `main` as the integration branch. Add shared
ignore rules, LF text normalization, a root README for setup/commands/troubleshooting, and a
CONTRIBUTING guide for placement, naming, validation, and documentation rules. Do not add GitHub
Actions, release configuration, or deployment automation.

**Rationale**: The documentation makes repository ownership predictable and reviewable while
remaining within R1's local-workflow boundary.

**Alternatives considered**:

- CI configuration now: rejected because continuous-integration service setup is explicitly out of
  scope.
- Tool-specific contributor rules without a central guide: rejected because contributors need one
  discoverable source of repository conventions.

**Sources**:

- [GitHub README guidance](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes)
- [GitHub line-ending configuration](https://docs.github.com/en/get-started/getting-started-with-git/configuring-git-to-handle-line-endings)
