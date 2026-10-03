# katpb.dev

katpb.dev is a static Astro site with four primary pages: Home (`/`), Writing (`/writing/`),
Projects (`/projects/`), and About (`/about/`). R2 adds the shared identity, responsive layout,
illustrative content, and System/Light/Dark appearance to the existing reproducible R1 foundation.
Final acceptance status is recorded in [R2 evidence](./specs/002-initial-ui/checklists/acceptance.md).

## Supported local environment

- macOS on Apple Silicon; record the exact tested macOS version during acceptance
- Git
- Node.js 24.21.0 LTS, as pinned in `.nvmrc`
- npm 11.x
- Initial network access for packages and Playwright's pinned Chromium and WebKit browsers
- Current Chrome and Safari for final manual acceptance

Check the environment before setup:

```sh
sw_vers
uname -m
git --version
node --version
npm --version
git status --short
```

An incompatible Node or npm version fails with an engine error. Install the `.nvmrc` version and
retry rather than bypassing the check.

## Clean checkout to visible page

From the repository root:

```sh
npm ci
npm run test:install
npm run dev
```

Open <http://127.0.0.1:4321/> and follow Home, Writing, Projects, and About. The four routes also
support direct entry. Stop the foreground development server with `Ctrl-C`.

`npm run test:install` downloads the Playwright-pinned Chromium and WebKit browsers and therefore
requires network access during initial setup. Rerunning `npm ci` or `npm run test:install` after an
interruption is safe.

## Local development

Run `npm run dev`, then edit `src/pages/`, `src/components/`, `src/data/`, or
`src/styles/global.css`. Astro refreshes the local page without another setup or production build.
The server binds only to `127.0.0.1`.

If port 4321 is occupied, startup exits instead of silently choosing another address. Retry with a
known free port:

```sh
npm run dev -- --port <free-port>
```

For example, `npm run dev -- --port 4323` serves the site at `http://127.0.0.1:4323/`.

## Commands

| Command                         | Purpose                                                      |
| ------------------------------- | ------------------------------------------------------------ |
| `npm ci`                        | Install the exact dependency graph from `package-lock.json`. |
| `npm run test:install`          | Install pinned Chromium and WebKit test browsers.            |
| `npm run dev [-- --port N]`     | Start strict-port local development with hot reload.         |
| `npm run build`                 | Replace `dist/` with a complete static production build.     |
| `npm run preview [-- --port N]` | Preview the current `dist/` locally; this is not deployment. |
| `npm run format`                | Apply project formatting.                                    |
| `npm run format:check`          | Check formatting without changing files.                     |
| `npm run check`                 | Run Astro and TypeScript diagnostics; warnings fail.         |
| `npm run test:e2e`              | Test the built site in pinned Chromium and WebKit with axe.  |
| `npm run test:workflow`         | Test local command and recovery behavior.                    |
| `npm run test:reproducible`     | Compare two builds by normalized path and SHA-256 content.   |
| `npm run verify`                | Run the complete non-mutating repository-health pipeline.    |

All project scripts use local binaries. After `npm ci` and `npm run test:install`, development,
build, and verification require no network access.

## Production build and validation

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 4322
# Stop preview with Ctrl-C before verification needs port 4322.
npm run verify
```

The static artifact is written to `dist/`. Verification runs formatting, Astro/TypeScript
diagnostics, the production build, browser and accessibility tests, workflow tests, and two-build
reproducibility using normalized file paths and SHA-256 content hashes. Workflow tests also build;
the pipeline does not promise exactly two total builds. Timestamps,
ownership, and permissions are not compared. Tracked source must remain unchanged.

To prove failure reporting, introduce a temporary formatting error, run `npm run verify`, confirm
that the formatting stage and file are named, restore the file, and rerun verification.

## Recovery and troubleshooting

- **Interrupted or stale install:** rerun `npm ci`; it replaces partial `node_modules/` state.
- **Interrupted build or validation:** rerun the same command. Full builds replace stale `dist/`.
- **Wrong Node/npm version:** install Node 24.21.0 and npm 11.x, then retry.
- **Port already in use:** run `npm run dev -- --port <free-port>`.
- **Missing test browser:** while online, rerun `npm run test:install`.
- **Formatting failure:** run `npm run format`, review the changes, then rerun verification.
- **Astro/type failure:** follow the file and diagnostic printed by `npm run check`.
- **Browser test failure:** inspect the named project and `test-results/`; rerun after correction.
- **Reproducibility failure:** inspect the reported missing, extra, or changed `dist/` path.

Project-owned commands do not require manual cache deletion. Paths containing spaces are
supported; scripts resolve paths relative to the repository rather than a fixed parent directory.

## Repository map

| Path                                             | Ownership                                                                    |
| ------------------------------------------------ | ---------------------------------------------------------------------------- |
| `src/pages/`                                     | Four static primary routes; each owns page composition.                      |
| `src/layouts/`                                   | Shared semantic document structure and metadata.                             |
| `src/styles/`                                    | Shared semantic tokens, reflow, focus and appearance styles.                 |
| `src/components/`                                | Shared shell and presentation; isolated theme and rail enhancements.         |
| `src/data/`                                      | Finite page metadata, labelled narrative/writing/work and approved profiles. |
| `src/assets/`                                    | Future pipeline-processed assets; create only for a real asset.              |
| `public/`                                        | Future unprocessed public assets; create only for a real asset.              |
| `scripts/`                                       | Dependency-free workflow enforcement.                                        |
| `tests/`                                         | Browser and command-behavior checks.                                         |
| `specs/`                                         | Approved feature specifications, plans, contracts, tasks, and evidence.      |
| Root configuration                               | Astro, TypeScript, formatting, browser, npm, and Git policy.                 |
| `package-lock.json`                              | Exact dependency graph; always review with `package.json`.                   |
| `node_modules/`, `dist/`, `.astro/`, test output | Ignored dependency, generated, cache, and evidence output.                   |

Run `npm run verify` to judge repository health. See [CONTRIBUTING.md](./CONTRIBUTING.md),
the [R2 UI contract](./specs/002-initial-ui/contracts/site-ui.md),
[theme contract](./specs/002-initial-ui/contracts/theme.md),
[validation contract](./specs/002-initial-ui/contracts/validation.md), and
[quickstart](./specs/002-initial-ui/quickstart.md). Historical R1 specifications and evidence remain
unchanged under `specs/001-project-foundation/`.

## Content and progressive enhancement

Unapproved biography and sample work/writing are visibly illustrative. Writing titles have no
article destination. Work without approved media/actions has no empty media frame or inactive
link. Profile links remain absent until their destinations have documented approval and verification.
The canonical brand asset is imported directly from
`specs/002-initial-ui/design/source/brand-mark.svg`; do not copy or optimize its geometry.

Core content and navigation are static HTML. Without JavaScript, CSS follows the OS appearance,
the unbound theme selector stays hidden, and the identity rail remains in normal flow. With
JavaScript, System/Light/Dark selection works immediately; guarded local storage uses only
`katpb.theme`. Failed storage operations do not block reading or current-document choices.
Sticky desktop identity is enabled only when the entire rail fits the viewport with clearances.
Stylesheet failure preserves the current destination as HTML text and `aria-current="page"`.

## R2 scope boundary

R2 introduces no dependencies, external fonts, hosting/deployment, content collections, article
publishing, CMS, analytics, search, accounts, forms, or remote content services. Canonical public
URLs are metadata only. Existing Markdown/MDX tooling remains installed without introducing a
publishing workflow. Native browser/VoiceOver, actual zoom, performance, and real-reviewer evidence
are required in addition to automated verification before R2 is accepted.
