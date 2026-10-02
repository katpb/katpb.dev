# Quickstart and Validation Guide: R2 — Initial UI

**Branch**: `002-initial-ui` | **Date**: 2026-10-02

This defines acceptance once R2 is implemented. The repository currently contains the R1 screen;
this document records expected behavior, not completed UI or test results. See the
UI contract (`specs/002-initial-ui/contracts/site-ui.md`), theme contract
(`specs/002-initial-ui/contracts/theme.md`), validation contract
(`specs/002-initial-ui/contracts/validation.md`), and data model
(`specs/002-initial-ui/data-model.md`).

## 1. Environment and Setup

Use macOS Apple Silicon, Git, Node.js 24.21.0 LTS (`.nvmrc`), npm 11.x, pinned Playwright browsers,
and current native Chrome/Safari with VoiceOver. Record exact hardware, OS, runtime, and browser
versions for final review. Understand and preserve existing changes.

```sh
sw_vers
uname -m
git --version
node --version
npm --version
git status --short
```

For a clean checkout, initial acquisition may use the network:

```sh
npm ci
npm run test:install
```

Expected: supported versions, unchanged package/lock files, and pinned Chromium/WebKit available.
A prepared checkout may reuse installed packages/browsers. No dependency change is needed for R2.

## 2. Explore All Routes

```sh
npm run dev
```

Open `http://127.0.0.1:4321/`; visit `/writing/`, `/projects/`, `/about/` directly and through
navigation. Expected: shared shell, unique metadata, correct current-page marker, and content from
the page contract. Home has >=3 writing and >=3 work previews; Writing has >=4 entries across
multiple themes; Projects has >=3 summaries; About has a complete narrative. Home section links
reach matching primary pages. Stop development with `Ctrl-C`.

Review labels, links, and media. Unverified copy is illustrative at the point of use; no invented
article links, publication facts, credentials, or achievements. The approved-profile list currently
starts empty: no profile grouping is expected. Text-only work has no empty image region or
clickable/disabled action. Any later approved destination needs approval/verification evidence
and separate destination review, without adding availability requests to page rendering.

## 3. Automated Verification and Artifact Review

```sh
npm run verify
```

Stop any manual preview server before verification needs its strict test port 4322.

Expected: formatting, Astro/TypeScript diagnostics, build, Chromium/WebKit/axe checks, workflow
tests, and SHA-256 reproducibility pass. R2 assertions replace obsolete foundation-screen text
assertions; workflow/recovery and artifact checks remain effective.

Confirm root/Writing/Projects/About HTML and referenced local assets exist. No server entry,
deployment files, external content fetch, or extra feature route. Both builds have identical
normalized paths and file hashes; only existing volatile filesystem metadata is excluded.
Verification preserves source and pre-existing changes.

Browser coverage checks each route in both appearances, metadata/navigation, content counts,
sample labels, skip focus, no external render requests, zero applicable axe WCAG A/AA violations,
no-JS reading, 320-pixel reflow, fit/non-fit rails, and canonical mark geometry/colors/dimensions.
Include long titles, unbroken text, short desktop windows, and increased text.

## 4. Theme and Failure Scenarios

Start a diagnostic production preview:

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 4322
```

Open `http://127.0.0.1:4322` and inspect every route:

1. Clear `katpb.theme`; load with light and dark OS appearance. System is selected and follows a
   live OS change without reload.
2. Select Light and Dark in turn; change OS appearance and confirm the override stays. Navigate
   all primary pages and close/reopen the page in the same retained profile; mode persists.
3. Select System after an override. The key/root override is removed and current/later OS changes
   are followed, including after navigation and a later visit.
4. Seed invalid state; fault storage reads, writes, and removal separately before scripts run.
   Content/navigation remain available. A successfully initialized selector remains usable;
   choices work in the current document even if saving fails. A failed removal may retain an old
   override on a later document; do not assume retention or successful erasure.
5. Disable JavaScript. Core text/links remain available on all pages, CSS follows OS, no inactive
   selector appears, and the rail remains in flow.
6. Cold-load saved Light against dark OS and saved Dark against light OS. Inspect a filmstrip or
   first-render capture for wrong-theme frames and reveal layout shift. Settled screenshots alone
   do not establish first-paint correctness.

Stop preview before Section 5 verification needs port 4322. These checks may reveal remediation;
only the subsequent unchanged final build is used for final acceptance evidence.

## 5. Offline, Privacy, and Foundation Preservation

After package/browser acquisition, disconnect networking or enforce an equivalent network block.
Run development and inspect all four pages, stop it, then run:

```sh
npm run build
npm run verify
```

Expected: commands complete offline; all pages render local content/assets. Any later approved
outbound links are excluded from offline rendering expectations. Audit production requests,
cookies, and storage: no analytics, external content, embeds, personal-data collection, or
non-essential cookies; only local theme state is permitted.

Retain R1 interrupted/stale build recovery and strict-port behavior. Review README/CONTRIBUTING
for current routes, ownership, R2 acceptance, and unchanged commands. Preserve historical R1
evidence. Do not weaken reproducibility with new generated-content exceptions.

## 6. Final Manual Accessibility and Visual Review

Finish remediation, complete Sections 1–5, and rerun verification before recording final evidence
in `specs/002-initial-ui/checklists/acceptance.md`. Record revision and working-tree diff identity,
reviewer/date, OS/browser versions, viewport, mode, and pass/fail notes. Later changes require
verification and affected evidence to be repeated.

Start the final production preview after all remediation and automated/offline gates:

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 4322
```

Use this same unchanged source/build for Sections 6–8. Stop preview before any subsequent browser
verification requires port 4322.

Review every route in native Chrome and Safari in light/dark appearances:

- Heading/landmark/label semantics, logical reading order, VoiceOver navigation, and Home identity
  without a separate decorative-mark announcement.
- Keyboard traversal, visible/unobscured focus, skip activation, every destination/theme option,
  current-page identification, and zero traps.
- 320 CSS-pixel reflow, representative 1280×800 desktop, short desktop height, and **actual 200%
  browser zoom** without horizontal page scroll, lost content, or overlap. Pixel density and small
  viewport simulations are not zoom evidence.
- Large text/wrapped identity, controls, navigation; mark >=48 CSS pixels wide, canonical geometry,
  and equal proportional dimensions across themes at a given viewport.
- Fit rail remains visible on scroll; non-fit rail joins the single document scroll area with all
  content reachable. Mobile compact identity/footer placement follows the contract, with no full
  introduction repeated above subpages.
- Text/non-text contrast, high contrast/forced colors, non-color current/focus markers, reduced
  motion, absent media/actions, and no-JS core content.

Axe supplements this review; automated WebKit is not native Safari/VoiceOver evidence. Unperformed
reviews remain pending and cannot be labelled passed.

## 7. Final Four-Route Performance Evidence

Continue with the unchanged final revision and preview started in Section 6; do not start a second
server on the occupied port.

Use Chrome Stable Incognito, 360×800 CSS pixels, Fast 4G, and 4× CPU slowdown. Record exact network
preset values (latency/download/upload), CPU setting, hardware, OS/Chrome version, route, revision,
and tool version, cache policy, and a fixed observation interval. R1 recorded Fast 4G as 20 ms
latency, 4 Mbps download, 3 Mbps upload; record actual settings and explain any material change.
Use Chrome Performance local metrics; keep environment and code unchanged.

For **each route independently**, perform five cold runs:

1. Clear site data/cache so each run starts in System, then cold reload under recorded throttling.
2. After load, activate skip by keyboard and pointer, choose Light→Dark→System, and scroll to
   the footer. Use the same recorded observation interval after the last interaction. Scrolling
   exposes layout shifts but is not an INP interaction. Capture metrics before navigating away.
3. Record LCP, actual interaction-based local INP, and CLS. Use the Performance panel's INP across
   interactions; raw maximum individual Event Timing entries and navigation-only Lighthouse TBT
   do not substitute for INP.
4. Repeat unchanged. Retain five raw results per metric per route. Missing INP is incomplete
   evidence, never zero or a pass.

Sort each route's five values per metric; nearest-rank p75 is the fourth sorted value.

| Metric    | Required p75 on every route |
| --------- | --------------------------- |
| LCP       | <=2500 ms                   |
| Local INP | <=200 ms                    |
| CLS       | <=0.1                       |

Record all 20 raw visits, per-route p75 calculations/results, and cold-load theme captures. Changes
to rendering/interaction require affected evidence reruns. R1's historical INP approximation is
not R2 performance acceptance evidence.

## 8. First-Time Reviewer Outcomes

Use >=5 first-time representative reviewers from >=2 intended audience groups: prospective
collaborators/employers, engineering peers, and technical readers. Record audience mix and
anonymous results without site analytics/data collection. Use the final revision and record
device/viewport for each reviewer.

| Criterion | Procedure and threshold                                                                                                                                   |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SC-001    | Show Home for five seconds; >=80% identify experienced engineer/technology leader and >=1 focus area                                                      |
| SC-002    | Locate Writing/Projects/About and reach a chosen destination from Home; >=90% succeed within one desktop or two mobile actions                            |
| SC-003    | Compare Writing with other pages; >=80% identify the technical notebook within a shared personal brand                                                    |
| SC-011    | Assess credible, thoughtful, modern, personal; >=80% rate the combined experience positively; no individual quality receives majority negative assessment |

Calculate against the actual denominator, rounding required counts up: five reviewers require
four for 80% and five for 90%. Keep prompts neutral; agent opinions, screenshots, invented
participants, and automated assertions cannot replace qualitative evidence.

## 9. Completion Record

Map SC-001 through SC-013 to automated, manual, performance, and reviewer results, with pending or
failed outcomes explicit. Include content/link/privacy/scope audits, verification/offline commands,
revision, environment, and evidence references. R2 completes only when applicable criteria pass;
this guide and plan alone do not establish those results or introduce deployment work.
