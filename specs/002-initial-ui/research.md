# Research: R2 — Initial UI

**Branch**: `002-initial-ui` | **Date**: 2026-10-02

This resolves planning uncertainties against `specs/002-initial-ui/spec.md`, the approved design
artifacts, the installed R1 foundation, and primary technical documentation. No product
clarifications remain open. These decisions require no new dependencies.

## 1. Static Astro architecture and representative content

**Decision**: Extend Astro 7.3.5 with four `.astro` pages, the existing shared layout, small Astro
components, CSS, and plain typed static data. Keep full-document navigation. Retain Markdown/MDX
support without using content collections or creating article routes.

**Rationale**: R1 already supplies static output, TypeScript diagnostics, formatting, and browser
tests. Build-produced markup satisfies no-JavaScript reading and navigation. Four finite routes
do not need a router, frontend framework, publishing model, or generalized content infrastructure.
Astro's [page-based routing](https://docs.astro.build/en/guides/routing/) supports this directly.

**Alternatives considered**: Client routing/view transitions add lifecycle and motion complexity;
collections and article Markdown files imply R3 publishing requirements; a component/CSS framework
adds dependencies without a requirement it uniquely satisfies. None is selected.

## 2. Canonical SVG import

**Decision**: `BrandMark.astro` imports
`specs/002-initial-ui/design/source/brand-mark.svg` directly as an Astro SVG component. Do not copy,
redraw, optimize, or maintain another SVG. Preserve its `viewBox`, path geometry, and `currentColor`.

**Rationale**: Native [Astro SVG components](https://docs.astro.build/en/guides/images/#svg-components)
inline the asset so page color tokens apply. Inspection of installed Astro 7.3.5 SVG handling and
the existing configuration confirms no configured SVG optimizer. A wrapper supplies proportional
sizing, minimum width 48 CSS pixels, and decorative accessibility treatment; it must not replace
source geometry.

**Alternatives considered**: An external `<img>` does not inherit the page's `currentColor` into
its SVG document. Copying into `public/` or duplicating paths creates another source of truth.
Raw HTML injection is unnecessary when a native component import exists.

## 3. Theme before paint, persistence, and progressive enhancement

**Decision**: One small synchronous `is:inline` initializer in the shared layout's head, before
theme-dependent styling and body rendering, reads `katpb.theme`. Only `light` and `dark` are stored
manual overrides. Selecting System removes the key and the root `data-theme` attribute. Invalid,
absent, or unreadable storage also means System. CSS defaults and `prefers-color-scheme` determine
System appearance and follow subsequent OS changes; explicit root attributes override that CSS.

**Rationale**: [Astro's inline directive](https://docs.astro.build/en/reference/directives-reference/#isinline)
keeps the initializer unbundled and synchronous; placing it only in the layout avoids duplicate
execution. CSS [system appearance](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-color-scheme)
also works without JavaScript. Set `color-scheme` consistently for native controls. Every
[localStorage access](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) is guarded
because access itself can fail. A failed write/removal does not undo a working choice in the
current document; later documents can restore a previously retained value if removal failed, or
default to System if no valid value can be read. Do not promise persistence when retention fails.

One visibly labelled native select exposes System, Light, Dark. A processed Astro component script
attaches behavior, reflects the initialized mode, then reveals the control. Reserve its layout
space to avoid a reveal shift; never show an inactive selector when initialization fails. With
JavaScript disabled the manual control is absent and appearance follows the OS. Use no theme
transition animation. [Astro component scripts](https://docs.astro.build/en/guides/client-side-scripts/)
provide bundled, deduplicated TypeScript without a framework.

**Alternatives considered**: Initializing only in a deferred module risks a wrong-theme frame;
storing the resolved light/dark appearance loses System behavior; cookies/server rendering are
unnecessary; an icon-only cycle obscures the selected mode; duplicating explicit System state in
storage is unnecessary when an absent override already means System.

## 4. Responsive identity and rail fit

**Decision**: Begin with a single-column layout. At an initial content-driven `64rem` breakpoint,
use a desktop identity column and flexible main column. The same header identity restructures
from compact mark/name/descriptor to the desktop rail; no duplicated active identity links are
needed. Always-visible navigation wraps rather than becoming a menu.

Rail stickiness is a small progressive enhancement: ordinary flow is the baseline; measure the
complete rail against viewport height minus its top/bottom clearances, and enable CSS sticky
positioning only when it fits. Recheck at initialization, breakpoint/viewport changes, and rail
size changes with `ResizeObserver`. If measurement fails, retain normal flow. Never give the rail
an independent scrollbar, fixed height, or clipped content.

**Rationale**: Width alone cannot decide whether real content fits a short window or enlarged
text. A fit measurement covers wrapping and font-size changes without arbitrary height cutoffs.
CSS handles layout; JavaScript only decides whether safe stickiness is available. Core content
remains reachable without the enhancement. The approved artifacts determine hierarchy, not exact
pixel measurements. No-JavaScript acceptance concerns readable, reachable content and navigation,
not an optional sticky enhancement.

**Alternatives considered**: Always-fixed/sticky rails can obscure over-height content; an
independently scrolling rail violates FR-037; a hardcoded height media query cannot reliably
account for text growth. A general resize library is unnecessary.

## 5. Visual language, metadata, and absent assets

**Decision**: Use locally available system sans-serif typography and shared custom properties for
light/dark color, scale, spacing, borders, surfaces, and focus. Make Writing editorial through
entry hierarchy, technical-theme context, and restrained separators, not through a docs sidebar
or unrelated font family. Use text-first project cards and an About narrative. Missing images
produce no image region; missing destinations produce no action.

Define a finite page metadata map and canonical URLs under `https://katpb.dev`. Supply title,
description, canonical, Open Graph website metadata, and a text-based summary Twitter card.
Do not invent a social image or add a metadata plugin. The canonical public identity is metadata,
not hosting configuration; local resources still use local paths.

**Rationale**: This implements the professional/editorial distinction while avoiding external
fonts, arbitrary imagery, unverifiable facts, and live-service dependencies. Unique metadata is
required by FR-021 and the constitution. Approved profile URLs may be rendered as outbound links
but must never be fetched to render or build the page.

**Alternatives considered**: Web fonts, icon libraries, stock project images, share-image generation,
and fabricated profile destinations add cost or imply facts that the approved slice does not need.

## 6. Automated and manual acceptance boundaries

**Decision**: Extend the existing pinned Chromium/WebKit projects and axe checks to all four routes,
both appearances, no JavaScript, theme transitions/failures, brand geometry, responsive identity,
and fit/non-fit rail behavior. Keep developer-workflow and artifact tests. Use native Chrome,
Safari, and VoiceOver for final manual review, including actual 200% browser zoom.

**Rationale**: [Playwright accessibility guidance](https://playwright.dev/docs/accessibility-testing)
does not treat automated scans as complete accessibility acceptance. Browser test setup can seed
or fault storage before page scripts using
[one combined init script per scenario](https://playwright.dev/docs/api/class-browsercontext#browser-context-add-init-script).
Use actual browser zoom for [resize-text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html)
and [reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) review: device pixel density and a
smaller viewport are not evidence of actual 200% zoom. R1's deferred VoiceOver review is not an R2
waiver. Qualitative success criteria require real first-time reviewers, not screenshot assertions.

**Alternatives considered**: New test libraries, a screenshot-golden system, or extra browser
downloads are unnecessary. Automated WebKit does not replace native Safari/VoiceOver review.

## 7. Four-page performance and final evidence ordering

**Decision**: Preserve R1's documented mobile lab conditions: production preview, Chrome Stable
Incognito, 360×800 CSS pixels, Fast 4G, and 4× CPU slowdown. Record exact throttle settings and
environment. Capture five unchanged cold runs independently per route using Chrome Performance
Live Metrics, including real keyboard/pointer/theme interactions. Calculate nearest-rank p75 as
the fourth sorted value for each metric, separately for each route.

**Rationale**: [Chrome's Performance panel](https://developer.chrome.com/docs/devtools/performance/overview)
provides local vitals without adding runtime telemetry or dependencies. R1's acceptance record
used a raw Event Timing maximum as an INP approximation; do not carry that approximation forward
or rewrite its historical record. [INP](https://web.dev/articles/inp) accounts for grouped
interactions across a visit. Missing interaction measurements are incomplete, not zero, and
navigation-only Lighthouse TBT is not INP. Initial-theme correctness also requires a cold-load
filmstrip/first-render check, not only a screenshot taken after navigation has settled.

Finish implementation and remediation, run complete verification and offline checks, then record
final manual accessibility, performance, and reviewer evidence for that revision. Later changes
require affected evidence to be rerun. Preserve R1's SHA-256 comparison, with only its already
identified volatile filesystem metadata excluded; introduce no generated-content allowlist.

**Alternatives considered**: One homepage measurement misses three required pages; field analytics
are outside scope; a runtime vitals package is unnecessary; recording final evidence before
implementation-changing fixes makes it stale.
