# Contributing to katpb.dev

R1 is a deliberately small Astro foundation. Keep changes static, local-first, and easy to
review. Before starting, read the [repository map](./README.md#repository-map), the current
[R1 specification](./specs/001-project-foundation/spec.md), and the applicable contract under
[`specs/001-project-foundation/contracts/`](./specs/001-project-foundation/contracts/).

## Place and name changes predictably

| Change                      | Location and convention                                                                  |
| --------------------------- | ---------------------------------------------------------------------------------------- |
| Route                       | `src/pages/`; use lowercase kebab-case route names. The root route is `index.astro`.     |
| Layout or component         | `src/layouts/` or a future `src/components/`; use PascalCase `.astro` names.             |
| Baseline style              | `src/styles/`; use descriptive lowercase kebab-case names.                               |
| Processed asset             | A future `src/assets/`; source-controlled and transformed by Astro.                      |
| Unprocessed public asset    | A future `public/`; source-controlled and copied unchanged.                              |
| Workflow script             | `scripts/`; use descriptive kebab-case names and avoid extra dependencies.               |
| Browser or integration test | `tests/`; use descriptive kebab-case names ending in `.spec.*` or `.test.*`.             |
| Feature documentation       | `specs/<feature>/`; keep specifications, plans, contracts, tasks, and evidence together. |
| Project configuration       | Repository root; change the smallest relevant standard configuration file.               |
| Generated output            | `dist/`, `.astro/`, Playwright output, or coverage directories; never commit it.         |

Do not create empty directories or placeholder files for future work. Add a new area only when a
real in-scope change owns content there.

## Dependencies and the lockfile

Keep dependencies minimal. Before adding one, document why the platform, Astro, or an existing
package cannot meet the need, then review its current version, license, install scripts,
transitive impact, and known security advisories. A dependency change must update and review both
`package.json` and `package-lock.json`; never edit the lockfile by hand. Use `npm ci` to validate
the exact dependency graph.

## Validate changes

Use Node.js 24.21.0 and npm 11.x. After initial `npm ci` and `npm run test:install`, run:

```sh
npm run verify
```

This is the required, non-mutating repository-health check. It covers formatting, Astro and
TypeScript diagnostics, the static build, pinned Chromium/WebKit tests, accessibility checks,
workflow recovery, and a second-build reproducibility comparison. Use `npm run format` only when
you intend to update formatting.

Update documentation whenever a command, location, naming rule, prerequisite, failure mode, or
contract changes. Behavior changes need automated evidence at the closest appropriate layer.
Accessibility or performance changes also need the manual evidence required by the current
[quickstart](./specs/001-project-foundation/quickstart.md). Do not weaken a check to make a change
pass.

## GitHub pull requests

Keep each pull request focused and explain the user-visible or contributor-visible outcome. In
the description:

- link the governing specification or issue;
- list the validation commands run and their results;
- include required manual accessibility or performance evidence;
- call out dependency and lockfile changes explicitly; and
- confirm that generated output and unrelated working-tree changes are not included.

Reviewers should be able to trace a change from requirement to implementation and evidence. Do
not merge with a failing `npm run verify` result.

## R1 scope boundary

R1 does not include final UI design, a design system, publishing or editorial workflow, content
collections, article schemas, RSS, Cloudflare/Wrangler configuration, production deployment,
GitHub Actions, analytics, accounts, forms, search, databases, APIs, or placeholders for those
features. Those belong to separately approved R2, R3, or R4 work.
