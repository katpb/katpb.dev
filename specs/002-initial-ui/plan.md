# Implementation Plan: R2 — Initial UI

**Branch**: `002-initial-ui` | **Date**: 2026-10-02 | **Spec**: [spec.md](./spec.md)

**Input**: The specification, resolved clarifications, and approved
[design direction](./design/design-direction.md), wireframes, and canonical SVG.

## Summary

Replace the R1 foundation screen with Home, Writing, Projects, and About. Extend the existing
static Astro application with responsive shared identity, navigation and footer, reusable
presentation components, typed local illustrative content, shared theme tokens, and small
progressive enhancements for theme selection and safe desktop-rail stickiness. Core reading and
navigation are build-produced HTML. The constitution governs engineering policy; within the
feature artifacts, the clarified specification governs product outcomes, design-direction.md
governs visual direction, wireframes govern approximate hierarchy/layout, and the canonical SVG
governs geometry. External references are inspiration only, not templates to copy.

Home includes an introduction, >=3 writing previews, >=3 work previews, and an About preview.
Writing has >=4 editorial entries spanning multiple themes; Projects has >=3 text-first summaries;
About supplies a complete illustrative narrative. Label unverified claims where they appear.
Do not assume wireframe names, claims, or links are approved facts. Empty approved-profile lists
produce no grouping or control.

The canonical SVG remains the sole brand geometry source. Default appearance follows the OS;
System, Light, and Dark are available with JavaScript. Preserve offline operation, existing checks,
and the same generated files/substantive content, with identified volatile filesystem metadata
permitted to differ. Publishing, deployment, backend services, analytics,
decorative animation, and speculative features remain outside scope.

## Technical Context

**Language/Version**: Astro templates, TypeScript 6.0.3, HTML/CSS/browser JavaScript;
Node.js 24.21.0 LTS and npm 11.x (package manager pinned to 11.21.0).

**Primary Dependencies**: Existing Astro 7.3.5 and `@astrojs/mdx` 8.0.2; existing Astro check,
Prettier, Playwright 1.63.0, and axe tooling. No dependency additions or upgrades.

**Storage**: Source-controlled static data; optional local `katpb.theme` string storing only
`light` or `dark`. System removes the override. No database, cookies, or transmitted state.

**Testing**: Existing Chromium/WebKit mobile/desktop Playwright projects, axe WCAG A/AA checks,
Node workflow tests, static artifact checks and SHA-256 equality; native Chrome/Safari, VoiceOver,
keyboard, actual 200% zoom, responsive, performance, and first-time-reviewer acceptance.

**Target Platform**: Static public web; supported local macOS Apple Silicon environment;
current native Chrome/Safari for acceptance and pinned Chromium/WebKit for automation.

**Project Type**: Static content website with optional client-side enhancements.

**Performance Goals**: Each route independently achieves p75 LCP <=2500 ms, local INP <=200 ms,
CLS <=0.1 across five unchanged mobile lab runs: production preview, Chrome Stable Incognito,
360×800 CSS pixels, Fast 4G, 4× CPU slowdown.

**Constraints**: WCAG 2.2 AA; 320 CSS-pixel reflow and 200% zoom; one document scroll area;
always-visible wrapping navigation; no external render/content dependency or data collection;
no inactive controls; mark >=48 CSS pixels wide; guarded theme storage operations.

**Scale/Scope**: Four finite routes; >=4 writing and >=3 project samples with Home subsets;
one bounded profile narrative and local theme preference. No collections, article schema, CMS,
frontend router, or general component framework.

## Constitution Check

Gates assess design compliance with constitution 1.0.0. PASS does not claim completed implementation
acceptance; [quickstart.md](./quickstart.md) defines required future evidence.

| Gate                                          | Before research                               | After design                                                                   | Required evidence                                                                          |
| --------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| I. User value and content integrity           | PASS: defined journeys and bounded samples    | PASS: labelled data, verified-only links, no article destinations              | Content/link audit; counts/routes; reviewer SC-001/002/003/011                             |
| II. Accessibility and progressive enhancement | PASS: WCAG AA and no-JS requirements          | PASS: semantic shell, wrapping links, native select, safe fit enhancement      | Axe on every route in both appearances; keyboard, VoiceOver, zoom, contrast, reflow, no-JS |
| III. Performance is a feature                 | PASS: all routes retain thresholds            | PASS: static HTML, system fonts, canonical SVG, small scripts, local resources | Five cold runs per route; actual interaction INP; p75; first-render theme capture          |
| IV. Privacy and security by default           | PASS: no collection or remote services        | PASS: local theme only; escaped text and reviewed URLs                         | Network/storage/cookie audit; no analytics, embeds, secrets, or visitor input              |
| V. Simplicity and verifiable quality          | PASS: reuse R1 tooling                        | PASS: finite data and Astro components; no new dependencies/services           | Complete verification, offline operation, workflow checks, SHA-256 equality                |
| Engineering and delivery constraints          | PASS: static/local-first, metadata and review | PASS: unique metadata; reviewable shell/page/evidence increments               | Updated contributor docs and R2 contract; final evidence tied to revision                  |

**Exceptions**: None. Missing manual, performance, or reviewer evidence means acceptance is
incomplete; no waiver, amendment, or performance regression approval is part of this plan.

## Project Structure

### Documentation (this feature)

```text
specs/002-initial-ui/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── site-ui.md
│   ├── theme.md
│   └── validation.md
├── checklists/
│   └── requirements.md
└── design/
    ├── design-direction.md
    └── source/                 # Canonical mark and wireframes
```

`tasks.md` is the subsequent task-generation artifact, not a planning output. Implementation adds
`checklists/acceptance.md` with actual evidence; do not fabricate completed checks or reviewers.

### Source Code (intended additions and edits)

```text
src/
├── components/
│   ├── BrandMark.astro
│   ├── SiteHeader.astro        # Rail/compact identity and primary navigation
│   ├── SiteFooter.astro
│   ├── ProfileLinks.astro      # Renders nothing for an empty approved list
│   ├── ThemeControl.astro
│   ├── PageIntro.astro
│   ├── WritingPreview.astro
│   └── ProjectSummary.astro
├── data/
│   ├── site.ts                # Finite metadata, navigation, narrative, approved profiles
│   ├── writing.ts             # Representative writing previews
│   └── projects.ts            # Representative work summaries
├── layouts/
│   └── BaseLayout.astro       # Document, metadata, early theme initialization, shell
├── pages/
│   ├── index.astro
│   ├── writing.astro
│   ├── projects.astro
│   └── about.astro
└── styles/
    └── global.css
tests/
├── e2e/
│   ├── site.spec.ts           # Supersedes foundation-page content assertions
│   ├── appearance.spec.ts
│   └── responsive.spec.ts
└── integration/
    ├── build-recovery.test.mjs
    └── dev-port-conflict.test.mjs
scripts/
├── dev.mjs
└── check-reproducible-build.mjs
```

**Structure Decision**: Extend the existing single Astro application. Components follow repeated
patterns or isolated enhancements; page-specific sections remain in page files.
`BrandMark.astro` directly imports the canonical SVG from the feature's design/source directory.
Theme behavior stays in its component and rail fit in the header; no client state service.
Retain scripts, dependencies, and browser projects except focused R2 assertion changes. Output
adds `dist/writing/index.html`, `dist/projects/index.html`, and `dist/about/index.html`.

## Page, shell, and metadata boundaries

| Route        | Page composition                                                                                                                 |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `/`          | Professional introduction/H1, ≥3 writing previews, ≥3 work previews, About preview; section links reach available primary pages. |
| `/writing/`  | Notebook introduction/H1 and ≥4 editorial title/summary/context entries across multiple themes; no detail routes.                |
| `/projects/` | Introduction/H1 and ≥3 text-first context/contribution/value summaries; approved media/actions only.                             |
| `/about/`    | Introduction/H1 and structured professional, leadership/collaborative, and personal narrative.                                   |

`BaseLayout` owns document/head metadata, early theme initializer, first-focusable skip link,
shell grid, one `main#main-content` with `tabindex=-1`, and shared footer. Pages own their one H1
and sections. `SiteHeader` may emit the desktop identity rail and global header as sibling
elements; main must not be nested inside a header landmark. Desktop grid places the rail before
navigation/main in document order, spanning beside header/main/footer. A full-height outer rail
area contains its natural-height sticky candidate. Compact mobile identity replaces the rail;
any alternate markup is hidden from display, assistive technology, and focus, not duplicated as
active links. ProfileLinks renders nothing without approved destinations. Mobile Home intro and
all-page footer receive available approved profiles; non-Home pages do not repeat the full intro.

Navigation uses the finite ordered page map, ordinary anchors, and consistent trailing-slash URLs.
Exactly one primary link has `aria-current="page"` plus a persistent underline; focus has a
separate outline. Derive current state from page identity, not substring/scroll matching. Footer
navigation is separately labelled. Named Home identity is “katpb.dev — Home.”

Every page supplies unique title/description, absolute canonical URL, Open Graph title/description,
website type, URL and site name, plus summary Twitter card/title/description. Astro's `site` URL
is `https://katpb.dev` solely for canonical metadata, not hosting configuration. Keep resources
local and output static; no invented social image, dates, credentials, or article metadata.

## Responsive strategy and visual tokens

Start mobile-first at a content-fit `64rem` rail breakpoint. Check 320px, 390px, intermediate
widths, 1023/1024/1025px at default sizing, and 1280/1440px desktop; repeat boundary checks if
content requires adjustment. Use a ~16–18rem rail, `minmax(0, 1fr)` main, overall max width near
80rem, and prose line length near 65 characters. Identity/theme rows and all four navigation
links wrap; the mark never shrinks below 48px. Featured writing may use three columns when main
width permits; work may use two columns while retaining the required third item. Otherwise stack.
Use intrinsic grids, `min-width:0`, long-token wrapping, and comfortable ~44px control targets;
no clipped content or horizontal navigation scroller.

Semantic CSS custom properties carry shared visual roles. Non-brand baseline values may be
refined for contrast and approved visual review; fixed brand values cannot change.

| Token role                            | Light baseline                                         | Dark / shared baseline                                                              |
| ------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Canvas / ink / muted ink              | `#FFFFFF` / `#1B1720` / `#59515F`                      | `#15121A` / `#F4EFF7` / `#C6BDCD`                                                   |
| Rail / card surface                   | `#F7F5F9` / `#FAF8FC`                                  | `#1B1621` / `#211A28`                                                               |
| Decorative separator / control border | `#DDD5E3` / `#8B7A96`                                  | `#4E4259` / `#92829F`; subtle separators never convey state alone.                  |
| Brand-mark / link / focus             | `#5B1A78`                                              | `#E6D9FF`; canonical mark inherits `--brand-mark-color`.                            |
| Typography                            | Local system sans; base 1rem, line-height ~1.6         | Same family/metrics in both themes; metadata ≥0.875rem, bounded fluid rem headings. |
| Spacing                               | 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4rem                    | Shared scale; fluid ~1–3rem gutters and generous section spacing.                   |
| Borders / surfaces                    | 1px separators, modest ~0.5rem card radius             | Restrained surfaces, no meaning-dependent shadows.                                  |
| Focus / active                        | ≥2px outline plus offset; links/current nav underlined | Focus differs from active underline; forced colors retains visible boundaries.      |

Check text contrast ≥4.5:1 (large text ≥3:1), relevant control/state boundaries ≥3:1, and focus on
every used surface. Writing distinction comes from scannable editorial hierarchy, technical
context, and separators; featured writing echoes it. No documentation sidebar, different brand,
or color-only distinction. Projects/About remain professional-brand pages. No decorative
animation or smooth-scroll dependence; reduced motion removes nonessential feedback transitions.

Rail measurement compares its complete natural height with viewport minus top/bottom clearances;
recheck on initialization, viewport/breakpoint changes, and observed rail-size changes. Only fitting
rails become sticky. Otherwise, or without JavaScript, use readable ordinary flow; never fixed
height, clipping, or independent rail scrolling.

Theme details follow `specs/002-initial-ui/contracts/theme.md`: root manual `data-theme` only for
Light/Dark, no override for System, CSS system following, and matching native `color-scheme`.
Attach the labelled select handler and reflect initialized mode before exposing it; reserve its
startup space. No-JS/failure hides the inactive selector. Guard reads, writes, and removals; retain
working current-document choices when storage fails without promising impossible persistence.

BrandMark imports the single canonical SVG without optimization/copy/redraw. Verify viewBox/path,
currentColor, proportions, ≥48px width, equal theme dimensions, exact theme paint, and decorative
nonfocusable treatment beside the visible named identity.

## Implementation Approach

1. Establish finite data/tokens, import the unchanged mark, and extend the layout with metadata,
   skip link, identity, navigation, and footer. CSS follows System without JavaScript; explicit
   root `data-theme` overrides system CSS.
2. Add one synchronous guarded `is:inline` initializer in the layout head. Bind the labelled
   select and reflect mode before revealing it; reserve space to prevent reveal shift.
   Guard reads/writes/removal; apply choices in the current document even if saving fails.
3. Use compact identity and document flow as baseline. Start desktop columns at `64rem`, verify
   wrapping/zoom, and measure full rail fit before enabling sticky. Recheck viewport, breakpoint,
   and observed rail-size changes; non-fit or measurement failure restores flow.
4. Assemble four pages using shared samples: editorial writing hierarchy/context/separators,
   distinct text-first work summaries, and coherent About narrative. Omit absent media/actions.
5. Replace obsolete R1 page assertions with R2 contracts, preserve workflow/artifact checks,
   and update README/CONTRIBUTING source/routes/validation guidance. Preserve historical R1
   specification/evidence rather than rewriting it as R2 results.
6. Remediate defects, run verification and offline checks, then record final manual, performance,
   and reviewer evidence for the same revision. Later changes require affected evidence reruns.

The data model (`specs/002-initial-ui/data-model.md`), UI contract
(`specs/002-initial-ui/contracts/site-ui.md`), theme contract
(`specs/002-initial-ui/contracts/theme.md`), validation contract
(`specs/002-initial-ui/contracts/validation.md`), and quickstart
(`specs/002-initial-ui/quickstart.md`) make design and acceptance reviewable.
`specs/002-initial-ui/research.md` records decisions/alternatives.

Preserve the existing sorted-path/SHA-256 comparator, not another implementation of it. Identified
volatile filesystem timestamps, ownership, and permissions may differ; no generated-content
allowlist is added. Browser preference, randomness, build time, and remote content must not change
the artifact. Workflow tests also build, so `verify` does not promise exactly two total build runs.
Keep GitHub as source repository, existing lockfile/toolchain, ignored generated output, telemetry-off
commands, strict diagnostics, and local port behavior. No changes to R1 historical evidence.

## Complexity Tracking

No gate violations or additional complexity exceptions require justification.
