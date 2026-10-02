---
description: "Dependency-ordered implementation tasks for R1 Project Foundation"
---

# Tasks: R1 Project Foundation

**Input**: Design documents from `/specs/001-project-foundation/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md),
[research.md](./research.md), [data-model.md](./data-model.md),
[contracts/](./contracts/), and [quickstart.md](./quickstart.md)

**Tests**: Required. The specification explicitly requires automated smoke, validation-failure,
accessibility, workflow-recovery, and reproducible-build coverage. Story test tasks are written
before their corresponding implementation and must be observed failing for the intended reason.

**Organization**: Tasks are grouped by user story so the runnable foundation, repository-health
workflow, and contributor conventions can each be implemented and validated as a distinct
increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it changes different files and has no dependency on an
  incomplete task in the same group.
- **[Story]**: Maps work to User Story 1, 2, or 3 from [spec.md](./spec.md).
- Every implementation task names its exact target path.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the locked Astro/npm project and shared repository policies.

- [x] T001 Initialize the private Astro 7/npm 11 project in package.json and package-lock.json with only astro, @astrojs/mdx, @astrojs/check, typescript, prettier, prettier-plugin-astro, @playwright/test, and @axe-core/playwright; declare Node >=24.21.0 <25 and npm >=11 <12, failing devEngines checks, telemetry-disabled local scripts, and the complete command names from specs/001-project-foundation/contracts/developer-commands.md
- [x] T002 [P] Pin Node 24.21.0 in .nvmrc and configure shared npm behavior without forced offline mode in .npmrc
- [x] T003 [P] Expand .gitignore for /node_modules/, /dist/, /.astro/, Playwright output, coverage, logs, environment files, editor state, and OS metadata, and add LF text normalization in .gitattributes
- [x] T004 [P] Configure Astro strict TypeScript checking in tsconfig.json and Astro-aware formatting in prettier.config.mjs and .prettierignore

**Checkpoint**: A clean checkout can install the exact dependency graph and every later task has a
stable runtime, formatter, and repository baseline.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Configure the static build and browser-test harness shared by all stories.

**Critical**: No user-story implementation begins until this phase is complete.

- [x] T005 Configure static output to ./dist, the official MDX integration, loopback host defaults, port 4321, and Vite server/preview strict-port behavior without adapters or experimental features in astro.config.mjs
- [x] T006 [P] Configure tests to serve the existing production build on http://127.0.0.1:4322 with reuse disabled and pinned Chromium/WebKit mobile and desktop projects in playwright.config.ts

**Checkpoint**: The project has one deployment-neutral Astro configuration and a production-build
browser harness; no page or future feature has been implemented.

---

## Phase 3: User Story 1 - Run the Application Locally (Priority: P1) - MVP

**Goal**: A contributor can follow repository instructions from a clean checkout, start the local
application, view the operational katpb.dev foundation page, recover from an occupied port, observe
source changes through hot reload, and stop the server.

**Independent Test**: On macOS on Apple Silicon with the documented Node/npm environment, use only
README.md to install dependencies and browsers, run `npm run dev`, reach
`http://127.0.0.1:4321/` within 30 seconds, see the expected identity and operational status,
observe a source edit without rebuilding, stop with Ctrl-C, and confirm an occupied port exits
nonzero with `npm run dev -- --port <free-port>`.

### Tests for User Story 1

> Write T007 and T008 first and observe them fail because the page and launcher do not yet exist.

- [x] T007 [P] [US1] Add the initial production-page contract tests for HTTP 200, a non-empty title/description, visible katpb.dev identity, one primary heading, operational status, and a keyboard-operable local skip link in tests/e2e/foundation.spec.ts
- [x] T008 [P] [US1] Add a Node integration test that occupies port 4321 and requires a nonzero startup exit, the occupied port, and the literal recovery command npm run dev -- --port <free-port> in tests/integration/dev-port-conflict.test.mjs

### Implementation for User Story 1

- [x] T009 [US1] Implement a dependency-free local Astro launcher that parses an optional --port argument, preflights the loopback port, delegates to the project-local Astro CLI, forwards shutdown signals, and prints the required actionable conflict message in scripts/dev.mjs
- [x] T010 [P] [US1] Implement the semantic document shell in src/layouts/BaseLayout.astro so language is a BCP 47 language tag present on the document root, title is a non-empty string identifying katpb.dev, and description is a non-empty string without future-feature claims
- [x] T011 [P] [US1] Add only baseline usability styles for readable content, 320 CSS-pixel reflow, 200% zoom, no horizontal page overflow, and visible/unobscured skip-link and keyboard focus states in src/styles/global.css
- [x] T012 [US1] Implement the unique literal / route in src/pages/index.astro with the literal siteName katpb.dev, a non-empty operational statusMessage, exactly one primary heading, and a local skipLinkTarget that reaches primary content without JavaScript or cross-origin resources
- [x] T013 [US1] Document exact prerequisites, macOS on Apple Silicon support with exact tested macOS version recorded during acceptance, npm ci, npm run test:install, startup, hot reload, shutdown, missing/wrong-tool failures, port-conflict recovery, and the ten-minute clean-checkout path in README.md
- [x] T014 [US1] Execute the User Story 1 independent test from sections 2-4 of specs/001-project-foundation/quickstart.md, measure the clean-checkout-to-visible-page duration and environment as a preliminary SC-001 check, and correct any contract mismatch in README.md, scripts/dev.mjs, src/layouts/BaseLayout.astro, src/pages/index.astro, src/styles/global.css, tests/e2e/foundation.spec.ts, or tests/integration/dev-port-conflict.test.mjs; final SC-001 evidence is recorded after remediation in T027

**Checkpoint**: User Story 1 is a complete local MVP and can be demonstrated without validation,
repository-convention, publishing, UI-design, or deployment features.

---

## Phase 4: User Story 2 - Verify Repository Health (Priority: P2)

**Goal**: A maintainer can run one documented non-mutating verification entry point that checks
formatting, Astro/TypeScript diagnostics, the production page, accessibility, workflow behavior,
and two-build reproducibility, with clear failures and no post-install network dependency.

**Independent Test**: From an unchanged setup-complete checkout, run `npm run verify`; every
stage succeeds, two clean builds produce identical sorted paths and substantive file content as
verified by matching per-file SHA-256 hashes while ignoring only explicitly identified volatile
filesystem metadata, the final artifact satisfies the static-build contract, and tracked source
is unchanged. Introduce one known formatting violation and confirm verification exits nonzero and
names that stage.

### Tests for User Story 2

> Write T015 and T016 before wiring the complete verification pipeline and observe the intended
> assertions fail.

- [x] T015 [P] [US2] Extend tests/e2e/foundation.spec.ts with pinned Chromium/WebKit coverage for JavaScript-disabled readability, no cross-origin requests or unexpected console errors, 320 CSS-pixel and desktop overflow checks, skip-link keyboard behavior, and zero applicable WCAG 2.0/2.1/2.2 A/AA axe violations
- [x] T016 [P] [US2] Add Node workflow coverage that seeds stale dist/ output, runs repeated full builds, confirms stale output removal and a servable dist/index.html, and verifies tracked-source state is unchanged in tests/integration/build-recovery.test.mjs

### Implementation for User Story 2

- [x] T017 [P] [US2] Implement scripts/check-reproducible-build.mjs so entries are sorted lexicographically by normalized POSIX relative path, each path is unique within dist/ and cannot escape it, each entry contains one SHA-256 hash of the file's bytes, and both manifests have identical paths and hashes as the check for the same generated files and substantive content; ignore only explicitly identified volatile filesystem timestamps/ownership/permissions, and preserve pre-existing working-tree changes by before/after comparison
- [x] T018 [US2] Wire format, format:check, check with warnings failing, build, preview, test:e2e, test:workflow, test:reproducible, and fail-fast verify scripts in package.json so verify performs exactly one baseline build plus one reproducibility build using only local binaries
- [x] T019 [US2] Document validation, production build/preview, deterministic output, negative-check diagnosis, stale/interrupted-command recovery, offline guarantees, path-with-spaces support, and common build/test failures in README.md
- [x] T020 [US2] Execute sections 5-8 of specs/001-project-foundation/quickstart.md, including the deliberate formatting failure, offline run, interruption reruns, and stale-output check, and correct defects in package.json, scripts/check-reproducible-build.mjs, tests/e2e/foundation.spec.ts, tests/integration/build-recovery.test.mjs, or README.md

**Checkpoint**: User Stories 1 and 2 work together, and repository health has a repeatable local
definition suitable for later automation without adding CI configuration.

---

## Phase 5: User Story 3 - Extend a Predictable Repository (Priority: P3)

**Goal**: A contributor unfamiliar with the repository can identify where code, tests, processed
and unprocessed assets, configuration, documentation, dependency state, and generated output
belong, plus the naming, validation, and documentation rules for future changes.

**Independent Test**: Give a reviewer only README.md and CONTRIBUTING.md. Without assistance, they
identify every required project area and the verification command in five minutes or less, then
correctly place and name a hypothetical route, layout/component, processed asset, public asset,
test, script, configuration change, and generated file.

### Implementation for User Story 3

- [x] T021 [P] [US3] Create CONTRIBUTING.md with PascalCase Astro component/layout naming, lowercase kebab-case routes, descriptive kebab-case scripts/tests, source/public/generated ownership, dependency and lockfile review, documentation-update rules, required automated/manual evidence, GitHub pull-request expectations, and explicit R2/R3/R4 scope boundaries
- [x] T022 [P] [US3] Extend README.md with a five-minute top-level directory map covering src/pages/, src/layouts/, src/styles/, future src/assets/ and public/, scripts/, tests/, specs/, configuration files, package-lock.json, ignored node_modules/dist/.astro/test output, and npm run verify as the health entry point
- [x] T023 [US3] Perform the unfamiliar-contributor placement walkthrough from the User Story 3 independent test and resolve every ambiguity or contradiction in README.md and CONTRIBUTING.md without creating placeholder source, asset, content, deployment, or automation files

**Checkpoint**: All three user stories are independently reviewable, and the initial scaffold no
longer relies on undocumented accidental architecture.

---

## Phase 6: Final Validation & Acceptance

**Purpose**: Complete all cross-cutting remediation and final verification before recording timed,
accessibility, and performance acceptance evidence.

- [x] T024 Review every direct dependency's purpose, version, license, and known security status and record the result plus rejected unnecessary packages in specs/001-project-foundation/checklists/dependencies.md
- [x] T025 Complete the offline, interrupted-command, stale-state, checkout-path-with-spaces, five-minute documentation, and excluded-scope checks from sections 7-8 and 11-12 of specs/001-project-foundation/quickstart.md, resolve every discovered implementation or documentation defect within R1 scope, and record the results in specs/001-project-foundation/checklists/acceptance.md
- [x] T026 Run npm run verify from package.json, confirm all commands and links in README.md and CONTRIBUTING.md match specs/001-project-foundation/contracts/developer-commands.md, confirm the artifact matches specs/001-project-foundation/contracts/build-artifact.md and specs/001-project-foundation/contracts/foundation-page.md, resolve any final inconsistency without adding deferred UI, publishing, Cloudflare, CI, or deployment work, and repeat T025 plus this task after any implementation-changing remediation until the repository is stable
- [x] T027 After T024-T026 pass, perform the timed clean-checkout-to-visible-page procedure from sections 1-3 of specs/001-project-foundation/quickstart.md and record the Apple Silicon environment, exact tested macOS version, Git/Node/npm versions, start and end times, elapsed duration, and ten-minute pass/fail result in specs/001-project-foundation/checklists/acceptance.md; if remediation is required, return to T025-T026 and rerun this task
- [ ] T028 After T027 passes and implementation/documentation are frozen, run the Chrome/Safari keyboard, VoiceOver, 200% zoom, JavaScript-disabled, 320 CSS-pixel, desktop, and five-run Chrome mobile LCP/INP/CLS protocols from sections 9-10 of specs/001-project-foundation/quickstart.md and record exact environment, raw values, nearest-rank p75, and pass/fail evidence in specs/001-project-foundation/checklists/acceptance.md; if any later implementation or documentation change affects accepted behavior, repeat T025-T027 as applicable and rerun this task in full

---

## Dependencies & Execution Order

### Phase Dependencies

1. **Setup (Phase 1)** has no dependencies and starts immediately.
2. **Foundational (Phase 2)** depends on Setup and blocks all user stories.
3. **User Story 1 (Phase 3)** depends on Foundational and produces the MVP.
4. **User Story 2 (Phase 4)** depends on the User Story 1 page/build because it verifies that
   artifact, but remains independently testable through `npm run verify`.
5. **User Story 3 (Phase 5)** can draft CONTRIBUTING.md after Foundational, but its final README
   map and walkthrough depend on the paths and commands completed by User Stories 1 and 2.
6. **Final Validation & Acceptance (Phase 6)** depends on every selected story being complete and
   runs sequentially as T024, T025, T026, T027, then T028. No implementation-changing work may
   follow T027 or T028 unless final verification and the affected acceptance evidence are rerun.

### User Story Dependency Graph

```text
Setup
  └── Foundational
        └── US1: Runnable local foundation (MVP)
              ├── US2: Repository health and reproducible build
              └── US3: Repository conventions
                    └── Cross-cutting acceptance
```

US3 documentation drafting can overlap US2 implementation, but T023 must run after the final
command and directory surfaces are stable.

### Within Each User Story

- Tests are drafted first and observed failing for the intended missing behavior.
- Shared configuration precedes page, workflow, or documentation implementation.
- Contract-producing code precedes documentation that promises its behavior.
- The independent test completes before the story checkpoint.

### Parallel Opportunities

- **Setup**: T002, T003, and T004 can run in parallel after T001 begins because they touch
  independent configuration files.
- **Foundational**: T005 and T006 can run in parallel after Phase 1.
- **US1**: T007 and T008 can run in parallel; after test drafts, T010 and T011 can run in parallel.
- **US2**: T015, T016, and T017 can run in parallel after US1; T018 integrates their commands.
- **US3**: T021 and T022 can run in parallel after their referenced paths/commands are stable.
- **Final validation**: T024-T028 are sequential so remediation and final verification cannot be
  overtaken by acceptance evidence.

---

## Parallel Example: User Story 1

```text
Task T007: Add page contract tests in tests/e2e/foundation.spec.ts
Task T008: Add occupied-port test in tests/integration/dev-port-conflict.test.mjs

After those test drafts:

Task T010: Implement src/layouts/BaseLayout.astro
Task T011: Implement src/styles/global.css
```

## Parallel Example: User Story 2

```text
Task T015: Extend browser/accessibility tests in tests/e2e/foundation.spec.ts
Task T016: Add build recovery coverage in tests/integration/build-recovery.test.mjs
Task T017: Implement reproducibility checks in scripts/check-reproducible-build.mjs
```

## Parallel Example: User Story 3

```text
Task T021: Create contributor conventions in CONTRIBUTING.md
Task T022: Add the repository map to README.md
```

---

## Implementation Strategy

### MVP First: User Story 1

1. Complete Setup and Foundational phases.
2. Write the US1 page and port tests and observe the expected failures.
3. Implement the launcher, semantic page, baseline CSS, and local-workflow documentation.
4. Stop and run the US1 independent test.
5. Demonstrate locally; do not deploy.

### Incremental Delivery

1. **Foundation ready**: Setup + Foundational.
2. **MVP**: US1 provides the locally runnable page and recovery behavior.
3. **Quality increment**: US2 adds the complete local verification and reproducible artifact.
4. **Maintainability increment**: US3 makes placement and contribution rules discoverable.
5. **Acceptance**: Complete Phase 6 remediation and final verification, then record the timed
   clean-checkout, accessibility, and performance evidence.

Each increment is reviewable without introducing UI design, publishing, deployment automation, or
later roadmap capabilities.

### Parallel Team Strategy

After Setup and Foundational:

1. One contributor completes US1, which establishes the executable artifact.
2. After US1, one contributor can build US2 verification while another drafts US3 conventions.
3. The US3 walkthrough waits for US2's final command surface.
4. Run the Phase 6 gates sequentially; record browser/manual evidence only after implementation,
   documentation, and final verification are stable.

## Notes

- Tasks marked [P] change independent files at that point in the dependency graph.
- Story labels provide requirement traceability; setup, foundational, and final-validation tasks intentionally
  have no story label.
- Preserve unrelated existing working-tree changes and never use destructive cleanup to satisfy a
  build or test.
- Commit after each task or coherent task group.
- Stop at each checkpoint and run the stated independent test before advancing.
