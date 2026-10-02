# katpb.dev

This repository contains the R1 project foundation for katpb.dev: a minimal, static Astro site
with Markdown and MDX support, local development commands, and a repeatable validation pipeline.
Publishing, production deployment, and later website features are intentionally out of scope.

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

Open <http://127.0.0.1:4321/>. The page identifies `katpb.dev` and reports that the project
foundation is operational. With the documented prerequisites, this path should take no more than
10 minutes. Stop the foreground development server with `Ctrl-C`.

`npm run test:install` downloads the Playwright-pinned Chromium and WebKit browsers and therefore
requires network access during initial setup. Rerunning `npm ci` or `npm run test:install` after an
interruption is safe.

## Local development

Run `npm run dev`, then edit `src/pages/index.astro`, `src/layouts/BaseLayout.astro`, or
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
npm run preview
npm run verify
```

The static artifact is written to `dist/`. Verification runs formatting, Astro/TypeScript
diagnostics, one baseline build, browser and accessibility tests, workflow tests, and a second
build whose normalized file paths and SHA-256 hashes must match the baseline. Timestamps,
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

| Path                                             | Ownership                                                               |
| ------------------------------------------------ | ----------------------------------------------------------------------- |
| `src/pages/`                                     | Astro routes; R1 owns only the root page.                               |
| `src/layouts/`                                   | Shared semantic document structure and metadata.                        |
| `src/styles/`                                    | Baseline local styles.                                                  |
| `src/assets/`                                    | Future pipeline-processed assets; create only for a real asset.         |
| `public/`                                        | Future unprocessed public assets; create only for a real asset.         |
| `scripts/`                                       | Dependency-free workflow enforcement.                                   |
| `tests/`                                         | Browser and command-behavior checks.                                    |
| `specs/`                                         | Approved feature specifications, plans, contracts, tasks, and evidence. |
| Root configuration                               | Astro, TypeScript, formatting, browser, npm, and Git policy.            |
| `package-lock.json`                              | Exact dependency graph; always review with `package.json`.              |
| `node_modules/`, `dist/`, `.astro/`, test output | Ignored dependency, generated, cache, and evidence output.              |

Run `npm run verify` to judge repository health. See [CONTRIBUTING.md](./CONTRIBUTING.md) for
naming, placement, documentation, and review rules. The stable command, artifact, and page rules
are recorded in the [developer-command contract](./specs/001-project-foundation/contracts/developer-commands.md),
[build-artifact contract](./specs/001-project-foundation/contracts/build-artifact.md), and
[foundation-page contract](./specs/001-project-foundation/contracts/foundation-page.md).

## R1 scope boundary

R1 includes no final visual design, publishing workflow, content model, Cloudflare adapter,
Wrangler configuration, deployment command, CI workflow, analytics, account, form, search,
database, API, or placeholder for those later capabilities.
