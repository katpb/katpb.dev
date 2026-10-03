# Contributing to katpb.dev

R2 extends the static Astro foundation with four primary UI pages. Keep changes static, local-first, and easy to
review. Before starting, read the [repository map](./README.md#repository-map), the current
[R2 specification](./specs/002-initial-ui/spec.md), and the applicable contract under
[`specs/002-initial-ui/contracts/`](./specs/002-initial-ui/contracts/).

## Place and name changes predictably

| Change                      | Location and convention                                                                  |
| --------------------------- | ---------------------------------------------------------------------------------------- |
| Route                       | `src/pages/`; use lowercase kebab-case route names. The root route is `index.astro`.     |
| Layout or component         | `src/layouts/` or `src/components/`; use PascalCase `.astro` names.                      |
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
[quickstart](./specs/002-initial-ui/quickstart.md). Do not weaken a check to make a change
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

## R2 content and evidence ownership

Use `src/data/site.ts` for finite navigation/metadata and illustrative narrative, `writing.ts` for
notebook samples, and `projects.ts` for work summaries. Keep unapproved claims labelled where they
appear. Add a profile/contact/project link only with verified destination and recorded approval
evidence. Omit absent optional images, actions, and profile groups. No article routes or collections.
Import the canonical SVG from `specs/002-initial-ui/design/source/brand-mark.svg`; preserve its
geometry/currentColor and exact theme colors. Do not create another copy or add an optimizer.

Preserve the four Playwright projects, strict diagnostics/ports, recovery checks and unchanged
SHA-256 reproducibility comparator. No new dependencies or upgrades belong to this R2 slice.
Keep historical R1 evidence untouched. Update current guidance here and in README.

Complete automated checks and diagnostic reviews, remediate defects, then freeze the source/build
before final native Chrome/Safari and VoiceOver, actual 200% zoom, styles-disabled and theme-flash
review. The quickstart requires five cold mobile performance visits per route with real local INP,
and at least five real first-time reviewers from two audience groups using its exact scoring rubric.
Record raw results and denominators in `specs/002-initial-ui/checklists/acceptance.md`.
Unavailable evidence stays pending. Any later implementation/content change, including after
acceptance, requires verification and affected manual/performance/reviewer evidence to be rerun.

## R2 scope boundary

No hosting/deployment, publishing/editorial workflow, content collections, article schemas, CMS,
analytics, external fonts, new dependencies, accounts, forms, search, databases, APIs, or
placeholders for future capabilities. Keep scope tied to the approved four-page UI.
