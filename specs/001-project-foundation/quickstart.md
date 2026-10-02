# Quickstart and Validation Guide: R1 Project Foundation

This guide defines the runnable acceptance path once R1 is implemented. It validates the contracts
without describing production deployment.

Final acceptance follows this order: complete Sections 1-8 and 11-12, remediate every defect, and
rerun `npm run verify`; then record the timed clean-checkout procedure in Sections 1-3 and the
manual accessibility and performance evidence in Sections 9-10. If later remediation changes the
implementation or documentation, repeat final verification and every affected final acceptance
procedure. Manual evidence must describe the version it approves.

## 1. Prerequisites

Use the supported environment:

- macOS on Apple Silicon (arm64); the exact tested macOS version is recorded during acceptance
- Git
- Node.js 24.21.0 LTS (the repository `.nvmrc`)
- npm 11.x
- Initial network access for npm dependencies and Playwright browsers
- Current Chrome and Safari for recorded manual acceptance

From the repository root:

```sh
sw_vers
uname -m
git --version
node --version
npm --version
git status --short
```

Expected: the machine reports the supported architecture, Node and npm satisfy `package.json`, and
any pre-existing working-tree changes are understood and preserved. Record the exact macOS, Git,
Node, and npm versions for final acceptance.

## 2. Clean Setup

For the final SC-001 acceptance run, start a timer immediately before `npm ci` in a clean checkout.
Continue through Section 3 without unrelated pauses and stop the timer when the local page visibly
shows the expected katpb.dev identity and operational status. Record the Apple Silicon hardware,
exact macOS version, Git/Node/npm versions, start and end times, elapsed duration, and pass/fail
result in `specs/001-project-foundation/checklists/acceptance.md`. The elapsed duration must be 10
minutes or less.

```sh
npm ci
npm run test:install
```

Expected:

- setup completes without changing `package.json` or `package-lock.json`;
- pinned Chromium and WebKit are available;
- rerunning both commands is safe.

If setup was interrupted, rerun the same command. Do not manually edit `node_modules/` or the
lockfile.

## 3. Start and Inspect the Foundation Page

```sh
npm run dev
```

Open `http://127.0.0.1:4321/`.

Expected:

- startup completes within 30 seconds;
- the page identifies `katpb.dev`;
- the page states that the project foundation is operational;
- source changes appear without another setup or production build;
- `Ctrl-C` stops the server.

For the final timed clean-checkout run begun in Section 2, the visible page must be reached within
10 minutes of the recorded start time.

The endpoint and response rules are in
[contracts/foundation-page.md](./contracts/foundation-page.md).

## 4. Verify Port-Conflict Recovery

While another process owns port 4321, run:

```sh
npm run dev
```

Expected: the command exits nonzero, identifies port 4321, and prints:

```text
npm run dev -- --port <free-port>
```

Choose a free port and confirm recovery:

```sh
npm run dev -- --port 4322
```

The command does not silently select a different port.

## 5. Run the Automated Repository-Health Check

```sh
npm run verify
```

Expected stages:

1. formatting check;
2. Astro/TypeScript diagnostics;
3. first static build;
4. Chromium and WebKit page/accessibility tests;
5. developer-workflow tests;
6. second static build and generated-path/substantive-content comparison.

Expected result:

- every stage passes;
- `dist/index.html` and its local resources exist;
- both builds have the same normalized relative paths and substantive file content, verified by
  one SHA-256 hash per file;
- only explicitly identified volatile filesystem metadata—timestamps, ownership, and
  permissions—is excluded from that comparison;
- tracked source has the same state before and after verification.

The exact command behaviors are in
[contracts/developer-commands.md](./contracts/developer-commands.md), and artifact equality is in
[contracts/build-artifact.md](./contracts/build-artifact.md).

## 6. Prove Failure Reporting

Make one temporary, known formatting violation in an R1 source file and run:

```sh
npm run verify
```

Expected: verification exits nonzero and identifies the formatting stage and file. Restore the
file, rerun `npm run verify`, and confirm success. Do not commit the temporary violation.

## 7. Verify Offline Operation

After setup and browser acquisition have completed:

1. Disconnect the machine from the network.
2. Run `npm run dev` and open the local page.
3. Stop development and run `npm run build`.
4. Run `npm run verify`.

Expected: all commands complete without package installation, update checks, telemetry, remote
assets, remote content, or external test services.

Reconnect only after the test. Initial `npm ci` and `npm run test:install` are allowed to use
the network and are not part of this offline assertion.

## 8. Verify Interrupted and Stale-State Recovery

For setup, development, build, and validation in turn:

1. Start the command.
2. Interrupt it.
3. Rerun the same command.

Also place an unrelated stale file under `dist/`, then run `npm run build`.

Expected:

- each rerun reaches the normal documented result without manual cleanup;
- the stale `dist/` file is absent from the new complete artifact;
- tracked source remains unchanged.

## 9. Record Manual Accessibility Acceptance

Against the production preview, record the following on current macOS Chrome and Safari:

- document title, language, headings, landmarks, and logical reading order;
- keyboard-only traversal, visible/unobscured focus, and no trap;
- VoiceOver announcements and reading order;
- 200% text zoom;
- 320 CSS-pixel mobile reflow and representative desktop layout;
- no horizontal page scrolling, hidden content, or meaning conveyed by color alone;
- core content with JavaScript disabled.

Record reviewer, date, macOS/browser versions, viewports, and pass/fail notes. Automated axe
results supplement this review but do not replace it.

## 10. Record Performance Acceptance

Build and start a production preview on the test port:

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 4322
```

In Chrome Stable:

1. Open an Incognito window and DevTools.
2. Set Device Mode to a fixed 360 x 800 viewport.
3. Select Fast 4G network throttling and 4x CPU slowdown.
4. Open Performance Live Metrics.
5. Clear site data and cold reload `http://127.0.0.1:4322/`.
6. After load, activate the page's skip link once by pointer and once by keyboard.
7. Record local LCP, local INP, and CLS.
8. Repeat steps 5-7 for five runs without changing machine, Chrome version, viewport, or
   throttling.

Sort each metric's five values. The fourth value is nearest-rank p75.

| Metric    | Required p75 |
| --------- | ------------ |
| LCP       | <=2500 ms    |
| Local INP | <=200 ms     |
| CLS       | <=0.1        |

Record the five raw runs, p75 values, hardware, macOS/Chrome versions, viewport, and throttling
preset with the review. Do not substitute navigation-only Lighthouse TBT for the approved INP
measurement.

## 11. Verify Checkout-Path Robustness

Repeat setup and `npm run verify` from a clean checkout whose absolute path contains spaces.

Expected: no project-owned script assumes a fixed parent directory or fails because of the path.

## 12. Review Scope

Confirm that the implementation contains none of the following:

- final visual design or a design system;
- content collections, article schema, publishing flow, RSS, or editorial automation;
- Cloudflare adapter, Wrangler, Workers configuration, deployment command, or GitHub Actions;
- analytics, accounts, forms, search, database, API, or future-feature placeholder.

The root README and CONTRIBUTING guide must let an unfamiliar contributor locate application
source, tests, assets, configuration, documentation, dependency state, and generated output in five
minutes or less.
