# Acceptance Evidence: R1 Project Foundation

**Acceptance date**: 2026-10-02  
**Reviewer**: Codex implementation agent using the local Apple Silicon test machine  
**Feature branch metadata**: `001-project-foundation`  
**Overall status**: All executed R1 checks pass. VoiceOver acceptance is explicitly deferred by
the user and remains the only open item in T028.

## Environment

- MacBook Pro `Mac16,5`, Apple M4 Max, 48 GB memory
- macOS 27.0.1, build 26A434, arm64
- Git 2.54.0 (Apple Git-157)
- Node.js 24.21.0 and npm 11.21.0
- Astro 7.3.5
- Google Chrome Stable 149.0.7827.116
- Safari 27.0.1
- Playwright Chromium 153 and WebKit 26.6

Only the supported environment is asserted. The exact macOS version above records this acceptance
run without restricting R1 support to that release.

## Cross-cutting acceptance

| Check                     | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                    | Result            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| Complete verification     | `npm run verify` passed formatting, zero-error/zero-warning Astro diagnostics, build, 8 browser tests, 2 workflow tests, and reproducibility.                                                                                                                                                                                                                                                                                               | Pass              |
| Failure reporting         | A temporary formatting violation in `src/pages/index.astro` made `verify` stop at `format:check` and name that file. The violation was restored before the passing run.                                                                                                                                                                                                                                                                     | Pass              |
| Offline operation         | With npm forced offline, external HTTP(S) proxies pointed at a closed local port, telemetry disabled, and loopback exempted, the complete `npm run verify` pipeline passed. Browser tests also observed zero cross-origin page requests.                                                                                                                                                                                                    | Pass              |
| Interrupted setup         | `npm ci` was sent `SIGINT` in the disposable checkout and exited 130; rerunning installed all 285 locked packages without manual cleanup. The initially interrupted browser acquisition was also rerun successfully.                                                                                                                                                                                                                        | Pass              |
| Interrupted development   | The foreground server was stopped with `Ctrl-C`, restarted, and served the expected page.                                                                                                                                                                                                                                                                                                                                                   | Pass              |
| Interrupted build         | A disposable-checkout build was sent `SIGINT`; rerunning `npm run build` produced the complete artifact without cleanup.                                                                                                                                                                                                                                                                                                                    | Pass              |
| Interrupted validation    | The disposable-checkout verification process group was sent `SIGINT` during formatting; rerunning the same command passed every stage.                                                                                                                                                                                                                                                                                                      | Pass              |
| Stale output              | The workflow test seeded an unrelated `dist/` file, ran two builds, and confirmed that the stale file was removed while `dist/index.html` remained servable.                                                                                                                                                                                                                                                                                | Pass              |
| Reproducibility           | Two clean builds contained the same single normalized path and identical SHA-256 content hash. Only timestamps, ownership, and permissions were excluded.                                                                                                                                                                                                                                                                                   | Pass              |
| Source preservation       | Workflow and reproducibility checks compared before/after `git status --porcelain --untracked-files=all`; pre-existing state was unchanged.                                                                                                                                                                                                                                                                                                 | Pass              |
| Path containing spaces    | `npm ci`, browser acquisition, and `npm run verify` passed from `/private/tmp/katpb R1 acceptance.BpYR83/clean checkout`.                                                                                                                                                                                                                                                                                                                   | Pass              |
| Documentation walkthrough | Using only README and CONTRIBUTING, the reviewer placed a route in `src/pages/`, a PascalCase layout/component in `src/layouts/` or future `src/components/`, processed and public assets in future `src/assets/` and `public/`, tests in `tests/`, scripts in `scripts/`, root configuration at the repository root, and generated output in ignored directories. `npm run verify` was immediately identifiable as the health entry point. | Pass (<5 minutes) |
| Scope exclusions          | Source/config review found no UI system, publishing flow, content collection, Cloudflare adapter, Wrangler/deployment/CI automation, analytics, account, form, search, database, API, or future-feature placeholder. Astro remains static with only the MDX integration.                                                                                                                                                                    | Pass              |
| Static artifact           | `dist/index.html` is the only generated file, has no external URL, needs no server runtime, and passes the foundation-page suite through Astro preview.                                                                                                                                                                                                                                                                                     | Pass              |

## Timed clean-checkout acceptance (SC-001)

The source snapshot was committed on the feature branch name and cloned into a fresh disposable
checkout. The timer began immediately before the documented `npm ci`, continued through
`npm run test:install` and `npm run dev`, and stopped only after the served response visibly
contained both `katpb.dev` and `The project foundation is operational.`

- Start: 2026-10-02T11:24:50Z (16:54:50 IST)
- End: 2026-10-02T11:24:54Z (16:54:54 IST)
- Measured elapsed time: 3.532 seconds
- Astro ready time within that run: 98 ms
- Result: Pass; 3.532 seconds is below the 10-minute limit and startup is below 30 seconds

The setup left `package.json` and `package-lock.json` unchanged. The development server shut down
cleanly after the page check.

## Accessibility acceptance

The production artifact was reviewed at `http://127.0.0.1:4322/` after final verification.

| Surface             | Viewport / mode                       | Evidence                                                                                                                                                                                                            | Result   |
| ------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Chrome Stable       | Desktop, keyboard only                | Accessibility tree exposed title, skip link, labelled header, main landmark, one level-one heading, and status in logical order. `Tab` exposed a high-contrast unobscured skip link; `Enter` moved focus to `main`. | Pass     |
| Safari              | Desktop, keyboard only                | Native Safari exposed the same title, reading order, landmarks, heading, and status. `Option-Tab` exposed the skip link; `Enter` moved focus to `main`.                                                             | Pass     |
| Chrome Stable       | Exact 200% browser zoom               | Chrome reported `Zoom: 200%`; all identity, heading, and status text remained visible without clipping or horizontal page scrolling.                                                                                | Pass     |
| Safari              | 200% text/page zoom step              | Identity, heading, status, and focus indication remained readable and unobscured.                                                                                                                                   | Pass     |
| Chromium and WebKit | 320 x 800 and 1280 x 800              | Pinned mobile/desktop projects found no horizontal overflow, hidden core content, cross-origin request, or unexpected console error.                                                                                | Pass     |
| Chromium and WebKit | JavaScript disabled at 320 x 800      | Server-produced identity, heading, and operational status remained readable with no horizontal overflow.                                                                                                            | Pass     |
| Automated WCAG      | Four pinned browser/viewport projects | Axe reported zero applicable WCAG 2.0, 2.1, and 2.2 A/AA violations.                                                                                                                                                | Pass     |
| Color and motion    | All surfaces                          | Meaning is present in text rather than color; no content depends on animation, and skip-link motion respects reduced-motion preference.                                                                             | Pass     |
| VoiceOver           | Safari on macOS 27.0.1                | Deferred by the user on 2026-10-02; no VoiceOver announcement claim is made. Run this check later to complete T028.                                                                                                 | Deferred |

## Chrome mobile performance acceptance

Five isolated Chrome Stable incognito contexts used a fixed 360 x 800 CSS-pixel viewport, Fast 4G
(20 ms latency, 4 Mbps download, 3 Mbps upload), 4x CPU slowdown, cleared browser/site data, and a
cold navigation to the production preview. Each run activated the skip link once by pointer and
once by keyboard. Chrome PerformanceObserver entries supplied local LCP, interaction event timing,
and CLS; the maximum interaction duration was the local INP value.

| Run | LCP (ms) | Local INP (ms) | CLS |
| --: | -------: | -------------: | --: |
|   1 |      436 |            248 |   0 |
|   2 |       84 |             40 |   0 |
|   3 |       96 |             40 |   0 |
|   4 |       92 |             40 |   0 |
|   5 |       96 |             40 |   0 |

Nearest-rank p75 is the fourth sorted value of five:

- LCP sorted: 84, 92, 96, 96, 436 ms; p75 **96 ms** (required <=2500 ms): Pass
- Local INP sorted: 40, 40, 40, 40, 248 ms; p75 **40 ms** (required <=200 ms): Pass
- CLS sorted: 0, 0, 0, 0, 0; p75 **0** (required <=0.1): Pass

The isolated run used the exact hardware, macOS, Chrome version, viewport, and throttle settings
listed above; no navigation-only Lighthouse proxy metric was substituted for local INP.
