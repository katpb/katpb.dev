# Tasks: R2 — Initial UI

**Input**: Approved artifacts in `specs/002-initial-ui/`: `spec.md`, `plan.md`,
`research.md`, `data-model.md`, `contracts/site-ui.md`, `contracts/theme.md`,
`contracts/validation.md`, `quickstart.md`, and `design/`.

**Prerequisites**: Completed R1 foundation; constitution 1.0.0; Node.js 24.21.0 and npm 11.x;
existing packages and pinned Chromium/WebKit. No new dependencies or toolchain upgrades.

**Tests**: Required by FR-029/036, the validation contract, and the constitution. Write the
contract tests before the behavior they verify; demonstrate meaningful failures for missing
behavior without weakening existing checks. Diagnostic results are separate from final evidence.

**Organization**: Shared prerequisites first, then US1 (P1), US5 (P1), US2 (P2), US3 (P2),
US4 (P3), and cross-cutting readiness/remediation/final acceptance. Story numbers retain the
specification's numbering even though US5 precedes the P2/P3 phases.

## Format and Scope

Every task is `- [ ] TNNN [P?] [USn?] Description with exact file paths`.
`[P]` means a task can run concurrently with the explicitly identified wave after its prerequisites
complete. Tasks touching the same file, build output, preview port, or acceptance record are
serialized. Story labels appear only in story phases. All boxes start unchecked.

Paths are repository-relative. Task instructions below are for subsequent implementation;
generating this document does not execute them.

Preserve `package.json`, `package-lock.json`, `scripts/dev.mjs`,
`scripts/check-reproducible-build.mjs`, strict diagnostics, telemetry-off commands, and the existing
four Playwright browser projects. No task adds hosting, deployment, content collections, article
publishing, CMS functionality, analytics, external fonts, new dependencies, or speculative routes.
**No implementation task modifies any file under `specs/001-project-foundation/`, including
historical R1 evidence.** Update current contributor guidance using the R2 contracts instead.

## Phase 1: Setup

**Purpose**: Establish the existing baseline and a truthful R2 evidence record, without
reinitializing the project.

- [ ] T001 Confirm supported versions/pinned packages against `.nvmrc`, `package.json`, `package-lock.json`, and `playwright.config.ts`; record the initial working-tree state and baseline `npm run verify` result in `specs/002-initial-ui/checklists/acceptance.md`, create pending sections for SC-001–SC-013 plus defect/evidence-revision tracking, and preserve existing changes and all historical R1 files.

**Checkpoint**: Baseline understood; R2 evidence has no prefilled acceptance passes. Installation,
if prerequisites are missing, uses existing setup commands only.

## Phase 2: Foundational Prerequisites

**Purpose**: Shared data, tokens, components, shell, metadata, and canonical brand work must
precede page assembly. CSS System appearance and ordinary-flow identity are the baseline;
manual themes and sticky fit remain isolated US5 enhancements.

**Wave A**: T002–T007 can run independently after T001. Their files are distinct.

- [ ] T002 [P] Add shared-shell contract tests in `tests/e2e/site.spec.ts` for the four canonical routes, unique title/description/canonical/Open Graph/Twitter metadata, English language, one header/main/H1/footer, ordered visible primary links/current state, named Home identity, skip-to-main focus, local-only requests, and no console/page errors; preserve the existing checks in `tests/e2e/foundation.spec.ts` until T016 migrates them, and confirm missing R2 behavior fails rather than skipping unassembled routes.
- [ ] T003 [P] Create finite page/navigation, narrative, and empty approved-profile records in `src/data/site.ts`; preserve the data-model field constraints verbatim: `id` — “Exactly `home`, `writing`, `projects`, or `about`; unique”; `href` — “Respectively `/`, `/writing/`, `/projects/`, `/about/`; built HTML”; `label` — “Respectively Home, Writing, Projects, About; fixed navigation order”; `title` — “Nonempty, descriptive, unique document title including site identity”; `description` — “Nonempty, page-specific discovery description; no unverified claims”; `heading` — “Nonempty main heading; rendered once as the page's h1”; `intro` — “Page-specific introduction; illustrative claims visibly labelled”; include engineering, collaboration/leadership, and personal narrative sections, label provisional identity/biography even in the rail, and enforce profile “visible `label`, verified `href`, and source comment or feature-document reference to approval/verification evidence” with “reviewed HTTP(S) destinations or explicitly approved `mailto:` contact destinations; no empty, `#`, or script URLs”; initialize profiles empty because approval evidence is absent.
- [ ] T004 [P] Create writing sample records and ordered Home subset IDs in `src/data/writing.ts`, honoring “Maintain >=4 entries across >=2 technical themes” and “Home selects >=3 existing IDs in display order”; quote and enforce `id` — “Unique stable local key; not an article slug or route”; `title` — “Meaningful title; long titles wrap”; `summary` — “Concise, specific technical summary; escaped plain text”; `theme` — “Nonempty technical context distinguishing entries”; supply coherent illustrative samples without article URLs, dates, reading times, credentials, or unverifiable publishing facts.
- [ ] T005 [P] Create >=3 text-first illustrative work records and >=3 existing Home subset IDs in `src/data/projects.ts`; quote and enforce `id` — “Unique local presentation key”; `title` — “Meaningful, wrapping title”; `context` — “Problem/context for illustrative work”; `contribution` — “Illustrative contribution, without claiming delivered work”; `value` — “Intended benefit/outcome structure; no invented metrics/achievements”; `labels` — “Optional short supporting labels; omit empty grouping”; `image` — “Optional approved local media: source, useful alt text, intrinsic dimensions”; `destination` — “Optional approved and verified URL plus descriptive action label”; leave images/destinations absent by default and create no detail routes.
- [ ] T006 [P] Establish shared light/dark semantic tokens and mobile-first layout/presentation primitives in `src/styles/global.css` using the plan's colors/spacing/system font/line lengths, exact brand colors `#5B1A78` and `#E6D9FF`, CSS OS following with manual-attribute precedence and native `color-scheme`, wrapping links/controls/long tokens, distinct focus/current markers, reduced-motion and forced-color behavior; target text contrast >=4.5:1 (large text >=3:1), relevant non-text boundaries >=3:1, and comfortable approximately 44px controls without external fonts or decorative animation.
- [ ] T007 [P] Create `src/components/BrandMark.astro` by directly importing unchanged `specs/002-initial-ui/design/source/brand-mark.svg`; preserve “`viewBox="244 173 745 420"`” and “`fill="currentColor"`”, complete path geometry, and “Width >=48 CSS pixels; height follows canonical proportions”; expose only decorative `aria-hidden="true"`/`focusable="false"` markup beside named identity, with identical dimensions across themes and no copied asset or SVG optimizer.

**Wave B**: After Wave A, T008–T011 can run independently; T008/T009 use T003,
T010 uses T004, and T011 uses T005. Shared CSS changes stay serialized.

- [ ] T008 [P] Create `src/components/ProfileLinks.astro` using approved records from `src/data/site.ts`; apply “Empty lists render no grouping,” render only reviewed named links, and perform no fetch/embed/prefetch/external availability probe; provide the same pattern for rail, Home introduction, and footer.
- [ ] T009 [P] Create `src/components/PageIntro.astro` with one semantic page H1, description/intro and relevant visible illustrative label, using shared tokens and escaped text; accept finite page content without adding a publishing/content schema.
- [ ] T010 [P] Create `src/components/WritingPreview.astro` for scannable title/summary/technical-theme context, proper list/heading semantics and restrained editorial separators; keep sample titles noninteractive, omit fabricated supporting metadata, and use the same pattern for Home and Writing.
- [ ] T011 [P] Create `src/components/ProjectSummary.astro` for context/contribution/value text and optional labels/media/actions; missing image omits the entire region, missing destination omits action and clickable styling, and absent labels omit their group; approved media, if any, has useful alt text/intrinsic dimensions, without invented project routes.
- [ ] T012 Build ordinary-flow responsive identity and primary navigation in `src/components/SiteHeader.astro` after T003/T006–T008: desktop rail with concise labelled introduction/available profiles, compact mobile mark/name/descriptor, Home identity named “katpb.dev — Home,” always-visible Home/Writing/Projects/About links, exactly one `aria-current="page"` plus non-color marker, and no duplicate active identity/focus stops; use the plan's grid placement with main outside header.
- [ ] T013 Build `src/components/SiteFooter.astro` after T008/T012 with consistent site identity, separately labelled continuing navigation, and available approved mobile profile links; do not repeat the full introduction or render empty groups.
- [ ] T014 Extend `src/layouts/BaseLayout.astro` after T009/T012/T013 to own document/head, first-focusable skip link, one focusable `main#main-content`, shell grid, and footer; derive each page's unique canonical/Open Graph website/site-name/Twitter summary title/description from `src/data/site.ts`, set only the canonical `site: "https://katpb.dev"` in `astro.config.mjs`, and migrate only existing layout-call props in `src/pages/index.astro` as needed for type correctness before T018; keep static/local output and add no hosting, social image, article metadata, or client router.
- [ ] T015 Run `npm run format:check`, `npm run check`, and `npm run build` against the shared prerequisites, verify the unchanged canonical SVG/package/lockfile and `scripts/check-reproducible-build.mjs`, and record foundation readiness in `specs/002-initial-ui/checklists/acceptance.md`; fix prerequisite defects before page assembly while retaining meaningful red T002 assertions for not-yet-assembled R2 routes.

**Checkpoint**: All shared presentation/data/metadata infrastructure exists before any full page
assembly. This is a foundation checkpoint, not a separate UI demo or final acceptance.

## Phase 3: US1 — Understand the Professional Identity (P1, First UI Increment)

**Goal**: A complete, readable Home experience with working paths to all primary destinations.

**Independent test**: At 320px and desktop, Home identifies the intended professional identity/focus,
contains introduction → >=3 writing previews → >=3 work previews → About preview, and its section
links reach real matching primary pages. Labels prevent illustrative copy becoming factual claims.
The first-time five-second comprehension threshold is collected only in final T048.

### Tests Before Page Assembly

- [ ] T016 [US1] Extend `tests/e2e/site.spec.ts` with Home hierarchy/counts, illustrative labels, homepage profile omission, section-link destinations, readable writing/work summaries, absent media/actions and Home no-JS cases; migrate all still-applicable `tests/e2e/foundation.spec.ts` semantic/skip/overflow/request/axe assertions into the R2 tests before retiring that obsolete test file, and demonstrate failure for missing Home content.

### Implementation and Independent Validation

- [ ] T017 [US1] Create bounded meaningful destination shells in `src/pages/writing.astro`, `src/pages/projects.astro`, and `src/pages/about.astro` using the complete shared layout/metadata, one PageIntro, and coherent labelled route-specific introductory text from `src/data/site.ts`; ensure direct requests and Home links work without “coming soon,” empty controls, invented article routes, or future-feature placeholders; full story content follows T029/T032/T035.
- [ ] T018 [US1] Assemble `src/pages/index.astro` after T017 using shared data/components for the prominent professional introduction, approved-profile pattern, >=3 WritingPreview entries, >=3 ProjectSummary entries, About preview, and working primary-section links; follow approved desktop/mobile hierarchy and label unverified copy where used without copying wireframe claims or sample counts.
- [ ] T019 [US1] Run production build, Home/shared-shell/no-JS tests on the existing Chromium/WebKit projects, and `npm run verify`; inspect Home at 320px and desktop and record its diagnostic independent-demo result in `specs/002-initial-ui/checklists/acceptance.md`, correcting Home defects before the next increment and treating linked subpage shells as valid introductions rather than completed US2/US3/US4.

**Checkpoint**: Home is the first independently demonstrable UI increment. No inactive theme control
is shown yet; CSS System appearance and normal-flow rail keep it usable. Remaining stories and
formal acceptance are still pending. Do not collect final reviewer evidence at this checkpoint.

## Phase 4: US5 — Navigate Reliably on Any Supported Viewport (P1)

**Goal**: Complete reliable shell interaction across four real routes, isolating manual-theme and
safe-sticky behavior from core content/navigation.

**Independent test**: From each primary route, navigate by keyboard, identify current/focus state,
skip to main, reach the footer, use theme modes with OS/storage changes, and reach the entire rail
in fitting/non-fitting windows. Disable JavaScript and retain readable routes/links. Full-content
coverage is rerun after US2/US3/US4; actual zoom/VoiceOver evidence waits for final acceptance.

### Tests Before Enhancements

- [ ] T020 [P] [US5] Add theme/brand contract tests in `tests/e2e/appearance.spec.ts` for every route: fresh light/dark OS, invalid/absent key, System→Light→Dark→System, live OS changes with/without override, reload/navigation/later retained context, faulted storage access/read/write/removal, labelled selected-mode keyboard operation, no-JS/uninitialized control omission, opposite-OS saved modes at first render and built-head initializer order, exact canonical path/viewBox/currentColor, >=48px width, equal theme dimensions/proportions, and resolved brand colors; use one combined init script per fault/seed scenario and confirm missing enhancement cases fail.
- [ ] T021 [P] [US5] Add shell/reflow/rail tests in `tests/e2e/responsive.spec.ts` for ordered visible navigation, distinct current/focus markers, logical skip/focus and no hidden identity stops, mobile introduction/footer placement, 320/390/intermediate/1280/1440px layouts and 1023/1024/1025px breakpoint boundaries, short/tall windows, long titles/unbroken tokens/text growth, resize/scroll fit transitions, single page scrolling, reduced motion/forced colors where supported, and no-JS flow; add an automated scenario that blocks or aborts stylesheet requests before direct navigation on every primary route, verifying readable document structure/content, reachability of all four primary navigation destinations, and current-destination identification through HTML text such as “Current” or “Current page” plus preserved `aria-current="page"`, without CSS or generated content; the active destination must not depend exclusively on CSS, color, background, borders, icons, pseudo-elements, or generated content; record results in `specs/002-initial-ui/checklists/acceptance.md` when created, confirm missing fit/fallback behavior fails, and never equate viewport/device scale/CSS zoom with actual 200% browser zoom.

### Enhancement A: Theme

- [ ] T022 [US5] Add exactly one tiny synchronous guarded `is:inline` initializer in the head of `src/layouts/BaseLayout.astro`, before theme-dependent styles/body paint; follow “Selected mode is `system`, `light`, or `dark`” and retain only readable valid `light`/`dark` in `katpb.theme`, with absent/invalid/unreadable state meaning System; use no fetch, async import, measurement, duplicate initializer, or theme animation.
- [ ] T023 [US5] Create `src/components/ThemeControl.astro` with visible Theme label and native System/Light/Dark select; bind its processed script, reflect initialized root mode, then reveal it; change root state immediately, guard acquiring/reading/writing/removing storage, remove override for System, and honor “A failed removal can leave an older saved override for a later document” without promising persistence on failure; hide unbound/no-JS control from focus/assistive exposure.
- [ ] T024 [US5] Integrate ThemeControl into `src/components/SiteHeader.astro` and reserve its startup space in `src/styles/global.css`; reflow identity/control/navigation rather than shrinking the mark or clipping content, preserve first-render layout, and verify explicit root overrides/native `color-scheme` win over live OS changes while System follows them.

### Enhancement B: Safe Rail Stickiness

- [ ] T025 [US5] Add isolated progressive fit behavior to `src/components/SiteHeader.astro`: “Fit is ephemeral DOM state, never persisted”; “Start in flow; at desktop widths enable sticky only when full rail height fits viewport height minus top/bottom clearances”; recheck initialization, viewport/breakpoint and ResizeObserver rail-size changes, restoring flow for non-fit/narrow/measurement failure, with no fixed-height clipping or independent rail scrollbar.
- [ ] T026 [US5] Complete responsive/interaction rules in `src/styles/global.css` after T024/T025: natural-height sticky candidate inside a spanning rail area, mobile normal flow, content-fit breakpoint and intrinsic grids, long-token wrapping, readable contrast on every used surface, distinct unobscured focus/current styles, and reduced-motion/forced-color fallbacks; keep all navigation visible and mark >=48px without overflow hiding.
- [ ] T027 [US5] Run built `tests/e2e/appearance.spec.ts`, `tests/e2e/responsive.spec.ts`, and shared shell tests on all four routes in existing Chromium/WebKit projects; verify both enhancement failures preserve core navigation, correct any interaction defects, and record diagnostic results in `specs/002-initial-ui/checklists/acceptance.md` without claiming final native browser/zoom/screen-reader acceptance.

**Checkpoint**: Theme and fit enhancements work independently of page-specific content. Subpage
content expansion must preserve this baseline and is covered again by T039–T045.

## Phase 5: US2 — Explore the Technical Notebook (P2)

**Goal**: A distinct editorial Writing experience within the professional site.

**Independent test**: Enter `/writing/` directly, scan >=4 title/summary/context entries across >1
theme, distinguish notebook hierarchy from work cards, recognize shared brand, and read/navigate
without JavaScript. No article actions, publishing dates, reading times, or publishing controls.

- [ ] T028 [US2] Add Writing-specific contract tests in `tests/e2e/site.spec.ts` for technical-notebook intro, >=4 entries across >=2 themes, meaningful title/summary/context, relevant illustrative labels, editorial pattern shared with Home, and no nonexistent article links/publishing controls; assert direct entry and no-JS content and confirm the current shell fails missing-entry assertions.
- [ ] T029 [P] [US2] Expand `src/pages/writing.astro` after T028 using all `src/data/writing.ts` entries and WritingPreview, with page title/notebook introduction, scannable editorial hierarchy/context/separators, visible sample labelling, and shared typography/shell; keep titles noninteractive and add no article route or collection.
- [ ] T030 [US2] Build and run Writing-targeted `tests/e2e/site.spec.ts` cases plus the shared appearance/responsive regression cases on existing browser projects; inspect Writing against Home in both appearances and record its independent diagnostic result in `specs/002-initial-ui/checklists/acceptance.md`, with full-content no-JS reading and no misleading destinations.

## Phase 6: US3 — Review Selected Work (P2)

**Goal**: Complete, credible, distinct text-first work summaries.

**Independent test**: Enter `/projects/` directly, scan >=3 context/contribution/value summaries,
distinguish them from writing, and read them without images/destinations or JavaScript. No missing
media frame, disabled action, clickable-looking destination-less card, or confidential claim.

- [ ] T031 [US3] Add Projects-specific cases in `tests/e2e/site.spec.ts` for title/introduction, >=3 context/contribution/value summaries and labels, text-first completeness, noninteractive destination-less cards, omitted empty labels/media/actions, direct entry and no-JS reading; cover absence and any actually approved optional fields without fabricating destinations or adding fixture routes, and confirm the current shell fails missing-summary assertions.
- [ ] T032 [P] [US3] Expand `src/pages/projects.astro` after T031 using `src/data/projects.ts` and ProjectSummary, with distinct work hierarchy, >=3 complete illustrative summaries, readable context/contribution/value, and no required images or external actions; omit absent optional fields and create no project-detail route.
- [ ] T033 [US3] Build and run Projects-specific `tests/e2e/site.spec.ts` cases and shared appearance/responsive regressions; inspect text-only work versus Writing in light/dark and narrow/desktop layouts, and record the independent diagnostic result in `specs/002-initial-ui/checklists/acceptance.md` without rewriting R1 evidence.

## Phase 7: US4 — Learn More About the Person (P3)

**Goal**: Coherent professional, collaborative, and personal narrative.

**Independent test**: Enter `/about/` directly, follow a complete labelled narrative in logical
heading/reading order, then return through shared navigation. It requires no portrait, final
biography, lorem ipsum, fabricated credentials, or JavaScript.

- [ ] T034 [US4] Add About-specific cases in `tests/e2e/site.spec.ts` for complete professional/leadership-or-collaboration/personal narrative, ordered headings, visible illustrative labels, no required portrait/unverified credentials, direct entry, return navigation and no-JS reading; confirm the intro-only shell fails full-narrative assertions.
- [ ] T035 [P] [US4] Expand `src/pages/about.astro` after T034 with the ordered narrative from `src/data/site.ts`, using PageIntro, coherent sections and shared prose tokens; visibly label provisional biographical/personal claims and keep the page complete without imagery.
- [ ] T036 [US4] Build and run About-specific `tests/e2e/site.spec.ts` cases and shared appearance/responsive regressions, inspect its narrative and navigation independently, and record the diagnostic outcome in `specs/002-initial-ui/checklists/acceptance.md`.

## Phase 8: Polish, Remediation, and Final Acceptance

**Purpose**: Finish current guidance and complete all cross-page checks, resolve defects, then
record final accessibility, performance, and reviewer evidence against unchanged source/build.

### Cross-Cutting Completion and Diagnostic Checks

- [ ] T037 [P] Update `README.md` for the four routes, data/component/source ownership, supported local commands, R2 contracts and quickstart, no-JS/theme behavior and current scope; preserve existing setup/offline/recovery/reproducibility guidance and avoid editing historical R1 files.
- [ ] T038 [P] Update `CONTRIBUTING.md` to reference current R2 ownership/contracts, sample/approved-link policy, canonical SVG, required browser/manual/performance/reviewer evidence and evidence invalidation after changes; preserve dependency policy, commands, strict checks and R1 history.
- [ ] T039 Complete `tests/e2e/site.spec.ts`, `tests/e2e/appearance.spec.ts`, and `tests/e2e/responsive.spec.ts` on the fully assembled four pages: all required counts/content, metadata/destinations, both appearances, no-JS in both OS modes, no console/page errors/cross-origin resources/cookies, zero applicable axe WCAG 2/2.1/2.2 A/AA violations with inconclusive findings reviewed, long-content and breakpoint/rail scenarios, and enhancement failures; retain `playwright.config.ts` projects/strict port behavior without weakening assertions.
- [ ] T040 Extend `tests/integration/build-recovery.test.mjs` to check all four expected route artifacts/local resources after stale-output replacement while preserving source-state assertions; retain `tests/integration/dev-port-conflict.test.mjs`, `scripts/dev.mjs`, `scripts/check-reproducible-build.mjs`, `package.json`, and `package-lock.json` guarantees, including sorted normalized paths/per-file SHA-256 and only previously identified volatile filesystem metadata exclusions; add no generated-byte allowlist or external URL probe.
- [ ] T041 Audit `src/data/site.ts`, `src/data/writing.ts`, `src/data/projects.ts`, `src/pages/index.astro`, `src/pages/writing.astro`, `src/pages/projects.astro`, `src/pages/about.astro`, and their shared components against FR-001–FR-042/SC-009/010; record sample truthfulness, every emitted destination, absent optional-media/actions, local-only rendering, theme-only storage, unchanged dependencies/brand/R1 history and prohibited-feature absence in `specs/002-initial-ui/checklists/acceptance.md`, logging all defects.
- [ ] T042 Run complete `npm run verify` and the quickstart offline development/build/verification procedures after stopping any manual preview on port 4322; record command results and source-state/artifact checks in `specs/002-initial-ui/checklists/acceptance.md`, preserving reproducibility, stale/interrupted recovery, strict ports and checkout-path robustness from `contracts/validation.md`; classify these as diagnostic gates before remediation/final evidence.
- [ ] T043 Perform diagnostic native Chrome/Safari/VoiceOver keyboard/reflow/actual-200%-zoom/contrast/brand/theme/rail checks and preliminary per-route mobile performance checks using `specs/002-initial-ui/quickstart.md`; record defects and provisional results in `specs/002-initial-ui/checklists/acceptance.md`, review the neutral first-time-reviewer procedure for readiness, and do not label diagnostic results as final acceptance.

### Remediation and Freeze Before Final Evidence

- [ ] T044 Resolve every diagnostic defect from T019/T027/T030/T033/T036/T039–T043 in the smallest relevant owned files under `src/components/`, `src/layouts/BaseLayout.astro`, `src/pages/`, `src/styles/global.css`, `src/data/`, `tests/e2e/`, `tests/integration/build-recovery.test.mjs`, `README.md`, or `CONTRIBUTING.md`; add proportionate regression coverage, record fixes or an explicit no-defects result in `specs/002-initial-ui/checklists/acceptance.md`, and never remediate by relaxing checks, adding forbidden scope/dependencies, or changing R1 evidence.
- [ ] T045 After T044, rerun full `npm run verify` and offline development/build/verification, confirm unchanged canonical SVG/dependencies/R1 history and exact generated-path/SHA-256 equality, then identify the final source revision plus working-tree diff and artifact hashes in `specs/002-initial-ui/checklists/acceptance.md`; stop test/manual server conflicts, build/start the final production preview per `quickstart.md`, and freeze implementation/content/guidance before T046–T048.

### Final Evidence on the Frozen Revision

- [ ] T046 After T045 passes, record final all-route native Chrome/Safari and Safari VoiceOver accessibility/visual results in `specs/002-initial-ui/checklists/acceptance.md`: keyboard/skip/focus/current state/semantics/reading order, both appearances, 320px/intermediate/desktop and actual 200% zoom, long text, rail fit/non-fit/single scroll, reduced motion/high contrast, no-JS, no duplicate mark announcement, canonical geometry/>=48px/equal theme dimensions/exact colors, and throttled opposite-OS saved-theme first-render/filmstrip evidence; include a final native Chrome/Safari check with styles disabled on every primary route, verifying readable document structure/content, reachability of all four primary navigation destinations, and current-destination identification through surviving HTML text such as “Current” or “Current page” plus preserved `aria-current="page"`, without exclusive dependence on CSS, color, background, borders, icons, pseudo-elements, or generated content; record these results when the checklist is created together with reviewer/date/environment/revision, and leave unavailable checks pending rather than inventing passes.
- [ ] T047 After T045–T046 pass on unchanged source/build, record final performance in `specs/002-initial-ui/checklists/acceptance.md`: five unchanged cold System-start runs independently for each of four routes (20 visits) using Chrome Stable Incognito, production preview, 360×800, Fast 4G and 4× CPU slowdown, recorded actual throttle/cache/observation/environment settings, identical keyboard/pointer skip and Light→Dark→System interactions plus footer scroll, real local INP (never TBT/raw individual Event Timing maximum), all raw LCP/INP/CLS and fourth-sorted-value p75 per route meeting <=2500ms/<=200ms/<=0.1; missing INP remains incomplete.
- [ ] T048 After T045–T047 pass on unchanged source/build, use >=5 real first-time reviewers from >=2 audience groups across mobile/desktop per `specs/002-initial-ui/quickstart.md`; record anonymized responses/denominators/viewports and final SC-001 (five-second identity/focus >=80%), SC-002 (destination discovery within one desktop/two mobile actions >=90%), and SC-003 (notebook/shared brand >=80%) in `specs/002-initial-ui/checklists/acceptance.md`; for SC-011 ask each reviewer to rate “The experience feels credible.”, “The experience feels thoughtful and intentionally designed.”, “The experience feels modern.”, and “The experience feels personal rather than generic.” on the five-point scale Strongly disagree, Disagree, Neither agree nor disagree, Agree, Strongly agree; Positive = Agree or Strongly agree, Neutral = Neither agree nor disagree, Negative = Disagree or Strongly disagree; a reviewer is combined-positive when at least three of the four answers are positive and none are negative; SC-011 passes when at least 80% of reviewers are combined-positive, rounding the required reviewer count upward, and additionally fewer than half of all reviewers give a negative response for each individual quality; retain anonymized raw answers for all four statements per reviewer, total/per-quality denominators, combined-positive classifications/count, rounded required count, per-quality negative counts and pass/fail calculations so results can be independently recalculated; round required counts upward for all reviewer criteria and use no fabricated participants, site analytics, or agent-opinion substitutes.

### Evidence Reconciliation and Completion

- [ ] T049 Compare final implementation/source/build identity with T045–T048 in `specs/002-initial-ui/checklists/acceptance.md`; for any implementation/content change or acceptance-discovered failure, mark affected evidence stale, return to T044 remediation and T045 automated/offline gates, rerun affected T046/T047/T048 checks on the new frozen revision, and document why unaffected evidence remains valid; this rerun rule also applies to later implementation changes after acceptance.
- [ ] T050 Reconcile every FR-001–FR-042 and SC-001–SC-013 with passing current evidence in `specs/002-initial-ui/checklists/acceptance.md`, confirm formatting/source/artifact/scope/R1-preservation checks and no unresolved blockers, and update only R2 status in `ROADMAP.md` when all criteria pass; retain explicit pending/failed statuses if native/manual/performance/reviewer evidence is unavailable, and perform no hosting/deployment or historical R1 evidence edits.

**Final checkpoint**: Completed code is not completed R2 acceptance until all applicable criteria
have current evidence. If final review discovers a defect, the remediation/verification/freeze/
affected-evidence loop runs again before any downstream final evidence task proceeds. Never accept
stale passes or force an unavailable review to pass.

## Dependencies and Execution Order

### Phase and Story Dependencies

```text
T001 Setup
  └─ Foundation Wave A: T002 || T003 || T004 || T005 || T006 || T007
       └─ Foundation Wave B: T008 || T009 || T010 || T011
            └─ T012 → T013 → T014 → T015
                 └─ US1: T016 → T017 → T018 → T019 (first Home demo)
                      └─ US5: (T020 || T021) → T022 → T023 → T024 → T025 → T026 → T027
                           ├─ US2: T028 → T029 → T030
                           ├─ US3: T031 → T032 → T033
                           └─ US4: T034 → T035 → T036
                                └─ All stories complete → T037–T043
                                     └─ T044 remediation → T045 verify/offline/freeze
                                          └─ T046 accessibility → T047 performance → T048 reviewers
                                               └─ T049 identity/rerun gate → T050 completion
```

- Default execution follows numbered phases, honoring P1 → P2 → P3. Shared prerequisites block
  page assembly; no secondary full page is demonstrated before Home's T019 checkpoint.
- US1 needs meaningful secondary destination shells for working links, not completed US2/US3/US4.
  Those are current in-scope page introductions, not placeholders or invented features.
- US5 follows Home and tests core shell behavior on all actual routes. It does not depend on full
  secondary content. T039–T045 repeat coverage after all page content is present.
- After T027, US2/US3/US4 depend on shared foundation/Home/US5 but not on one another's full page
  implementations. They remain independently testable by direct route.
- Within a story, contract tests precede implementation; data/components precede assembly;
  build/tests follow assembly. Shared `tests/e2e/site.spec.ts` edits T028/T031/T034 are serialized.
- T037–T043 require all stories. T037/T038 may run together; remaining shared test/build/audit and
  evidence-record work is serialized. No concurrent `dist/` builds or competing port-4322 servers.
- T044 resolves all discovered defects before T045. T046–T048 cannot start on failing automated/
  offline gates or unfinished remediation. T049 sends any subsequent change/failure back through
  the same loop before completion.

### Parallel Execution Examples

These describe optional implementation scheduling, not instructions to spawn agents now.

| Scope         | Safe parallel example after prerequisites                                                                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Foundation    | After T001, writing data T004 and project data T005 may run with token T006 and mark T007 work; after Wave A, T008–T011 use distinct component files.                                             |
| US1           | Serialize T016's shared test edit; after it, the three independent route-shell files within T017 can be written concurrently, then join before T018 Home assembly. Home validation remains first. |
| US5           | After T019, T020 appearance tests and T021 responsive tests use distinct files; join before T022. Theme integration and rail enhancement edits to SiteHeader are serialized.                      |
| US2           | After T027 and serialized T028/T031/T034 test preparation, T029 Writing assembly can run beside T032 Projects/T035 About assembly. Writing's T030 build/validation waits for conflicting work.    |
| US3           | After its T031 tests are prepared, T032 Projects assembly can run beside T029/T035; do not edit shared components/styles simultaneously. T033 validation is serialized.                           |
| US4           | After T034, T035 About assembly can run beside T029/T032 in its own route file; all builds and acceptance-record writes stay serialized.                                                          |
| Cross-cutting | T037 README and T038 CONTRIBUTING updates can run together after all stories; final evidence tasks share one record/build and are serialized.                                                     |

There are 17 task-level `[P]` markers. US1 has a finer-grained three-file opportunity inside T017,
but that task is not marked `[P]` against T018 because Home's working destinations depend on it.

## Traceability and Independent Acceptance

| Requirement/criterion group                                                                | Task ownership                                                                                                     |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| FR-001/006/007/008/016/017/040; SC-001/010                                                 | Shared labelled data T003–T005; Home T016–T019; content audit T041; final reviewers T048                           |
| FR-009/010/011/012; SC-003                                                                 | Writing pattern T010; US2 T028–T030; shared tokens T006; final reviewers T048                                      |
| FR-013/014/042                                                                             | Work data/pattern T005/T011; US3 T031–T033; optional-field/content checks T039/T041                                |
| FR-015/020                                                                                 | Narrative T003; US4 T034–T036; text-first visuals T006/T011; final reviewers T048                                  |
| FR-002/003/004/005/018/019/021/022/023/024/025/026/027/028/034/037/038; SC-004/005/006/007 | Shared shell/metadata/tokens T002/T006/T008–T015; US5 T020–T027; all-route coverage T039; final native review T046 |
| FR-039; SC-012                                                                             | CSS System baseline T006; theme tests/initializer/control/integration T020/T022–T024; T039/T046                    |
| FR-041; SC-013                                                                             | Canonical wrapper T007; appearance/reflow checks T020/T021/T026; final VoiceOver/geometry/color review T046        |
| FR-029/030/031; SC-006/008                                                                 | Axe/manual matrix T039/T043/T046; diagnostic/remediation T042–T045; per-route final metrics T047                   |
| FR-032/033/035/036; SC-009                                                                 | Local-only/shared tests T002/T039; preservation T040/T042/T045; content/privacy/scope audit T041/T050              |
| SC-002/011                                                                                 | Working routes and discoverable patterns T012/T017–T018/T029/T032/T035; final real reviewers T048                  |
| All FRs/SCs and evidence freshness                                                         | Remediation T044; final gates T045; invalidation/rerun T049; completion T050                                       |

Entities map as follows: Primary Page/Navigation Destination/Visual Pattern/Brand Mark are shared
foundation supporting every story; Writing Preview serves US1/US2; Project Summary serves US1/US3;
Profile Narrative serves US1/US4 with compact shared identity; Theme Preference/Rail Fit belong to
US5. The UI contract feeds shared/US1–US4 tests; theme contract feeds US5; validation contract and
quickstart feed every checkpoint and final T039–T050.

## Implementation Strategy

1. Establish the R1 baseline, then complete shared prerequisites. Keep no-JS/System/ordinary-flow
   behavior intact throughout and do not demonstrate an incomplete foundation as a finished UI.
2. Deliver US1 first: Home plus meaningful linked introductions. Validate that bounded increment.
   This is the suggested MVP, not a waiver of remaining R2 requirements.
3. Add US5's two isolated enhancements and prove their failure fallbacks. Expand Writing, Projects,
   and About separately, validating direct-route behavior after each increment.
4. Finish documentation and full all-page automation, audit content/privacy/scope, and run diagnostic
   native/performance checks. Resolve defects before declaring the source/build ready for evidence.
5. Pass final automated/offline/reproducibility gates, freeze source/build, then collect native
   accessibility, per-route performance, and real-reviewer evidence in that order.
6. Reconcile evidence identity; changes trigger remediation, verification, and affected evidence
   reruns. Mark R2 complete only with current passing evidence for every applicable criterion.

## Task Summary

| Area                                       | Count  |
| ------------------------------------------ | ------ |
| Setup                                      | 1      |
| Shared foundation                          | 14     |
| US1 — Professional identity/Home           | 4      |
| US5 — Navigation/themes/rail               | 8      |
| US2 — Writing                              | 3      |
| US3 — Projects                             | 3      |
| US4 — About                                | 3      |
| Cross-cutting/remediation/final acceptance | 14     |
| **Total**                                  | **50** |

All tasks use sequential IDs, exact paths, and required story labels. No implementation or final
acceptance work is performed by generating this list.
