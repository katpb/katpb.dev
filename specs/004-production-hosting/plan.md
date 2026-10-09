# Implementation Plan: R4 — Production Hosting

**Branch**: `004-production-hosting` | **Date**: 2026-10-02 | **Spec**: [spec.md](./spec.md)

**Input**: `/specs/004-production-hosting/spec.md` and the merged R1 foundation.

## Summary

Add GitHub Actions validation and trusted deployment orchestration for the existing Astro
static site. Use two preprovisioned Cloudflare assets-only Workers: a production Worker and a
preview parent with named, isolated PR previews. A separate assets-only acceptance Worker
supports controlled provider/failure/recovery exercises only. Preserve R1's toolchain and `dist/` contract.
Release only complete validated output, verify the served HTTPS revision, archive attempts
and known-good evidence durably, and recover by redeploying complete verified output with
retained immutable assets. Domain cutover and public launch require later explicit approval.

This document describes future implementation. No hosted acceptance, account setup, repository
protection, or deployment is claimed complete.

**Bootstrap dependency resolution (owner-approved 2026-10-03)**: After completed T001–T003,
record T004 account/Free-plan/name/limit preflight and defer actual Worker provisioning and
T005 Worker-scoped credentials/exercises. Implement credential-free T006–T022 foundation
controls first, including their tests, policy, packaging, provenance, trusted CLI, HTTPS/browser
verification, reporting, commands and CI/required-check integration. No placeholder/dashboard
or provider upload is allowed before these controls pass applicable local/CI validation.
Unconfirmed Worker IDs, subdomain and provider URLs remain absent; normal provider operations
must fail closed until verified setup fills the policy. Then return to T004 for a one-time
owner bootstrap of the production, preview-parent and isolated acceptance assets-only Workers,
using workers.dev only. Use minimum owner creation capability; never retain a product-level
Admin/create-delete credential in GitHub CI. Complete T005 only with individually scoped
deployment permissions and actual resource/URL/scope/environment/isolation readbacks. T004/T005
remain unchecked until their original acceptance passes, and neither setup/foundation checkpoint
is complete while they remain pending. T023 and preview story implementation are not authorized.

## Technical Context

**Language/Version**: Node.js 24.21.0, npm 11.x (existing package manager npm 11.21.0),
ES modules for operational scripts, Astro 7.3.5, existing strict TypeScript/browser tests,
JSON/JSONC configuration, YAML workflows, and Markdown documentation.

**Primary Dependencies**: Existing R1 dependency graph plus development-only Wrangler 4.147.0,
pinned exactly and reviewed before installation. GitHub-owned Actions pinned to immutable
commit SHAs during implementation. No Astro adapter, runtime package, or new test runner.

**Storage**: GitHub Actions artifacts for CI handoff; draft GitHub release assets for durable
production packages and receipts; GitHub Deployments for revision-bound status. No application
database or new runtime storage service.

**Testing**: Existing `npm run verify`, Node operational tests with mocked provider/GitHub
responses, existing Playwright/axe coverage, local static-host fixtures, credential-free hosted
smoke/browser checks, and controlled provider exercises recorded during acceptance.

**Target Platform**: GitHub-hosted Ubuntu runners, supported R1 macOS local environment,
Cloudflare Workers Static Assets at provider HTTPS addresses, and GitHub `katpb/katpb.dev`.

**Project Type**: Single static website with maintenance scripts and CI/CD configuration.

**Performance Goals**: Verified preview/update and production release within 10 minutes after
execution starts; previous-known-good recovery within 15 minutes; preserve LCP <=2.5 seconds,
INP <=200 milliseconds, and CLS <=0.1 at p75 under the applicable R1 lab protocol.

**Constraints**: Credential-free candidate builds; secrets restricted to protected-main
orchestration; source-specific provenance; non-cancelling serialized mutations; reproducible raw
output; real HTTPS/404/cache checks; no visitor UI/content changes, DNS cutover, CMS, analytics,
backend, or production secrets in source. R1 local checks remain offline after initial setup.

**Scale/Scope**: R1's single foundation page initially; one production Worker, one preview
parent, one named preview per eligible PR, and one isolated non-production acceptance Worker
used only for controlled acceptance exercises; indefinite retention of production attempt archives
and immutable assets, with quota failures blocking upload. Later merged R2 output uses the same pipeline.

## Constitution Check

_GATE: Evaluated before research and re-evaluated after Phase 1 design._

| Principle/constraint                          | Pre-research | Post-design evidence                                                                                                                                       |
| --------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. User Value and Content Integrity           | PASS         | Reviewed, attributable releases and recoverable complete output serve the documented maintenance outcome; no content changes.                              |
| II. Accessibility and Progressive Enhancement | PASS         | R1 browser/axe gates remain mandatory; hosted core content is checked without JavaScript.                                                                  |
| III. Performance Is a Feature                 | PASS         | Static serving and versioned-asset caching add no runtime code; hosted performance acceptance preserves existing thresholds.                               |
| IV. Privacy and Security by Default           | PASS         | No data collection; scoped tokens, main-only environments, trusted tooling, validated archives, and credential-free browser jobs protect trust boundaries. |
| V. Simplicity and Verifiable Quality          | PASS         | Reuse R1 and platform services; one additional official CLI, proportionate operational tests, no backend or new runner.                                    |
| Environment separation and safe failures      | PASS         | Inputs and secrets are external; unknown upload outcomes block ordinary mutation and cannot become known-good.                                             |
| Delivery workflow and recovery                | PASS         | Protected-main eligibility, exact-run provenance, hosted verification, durable receipts, complete redeployment, and reviewable acceptance evidence.        |
| Scope and discovery                           | PASS         | Noindex provider delivery supports technical acceptance; custom-domain configuration remains absent until separately approved.                             |

All post-design gates are PASS. No constitution exception is requested. Required hosted and
permission checks are acceptance work; the design gate does not substitute for those results.

## Project Structure

### Documentation (this feature)

```text
specs/004-production-hosting/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── developer-commands.md
│   ├── deployment-workflow.md
│   └── release-artifact.md
├── checklists/
│   ├── requirements.md
│   └── acceptance.md          # Implementation records actual outcomes here
└── tasks.md                  # Generated later by speckit-tasks
```

### Planned implementation paths

```text
.github/
├── CODEOWNERS
└── workflows/
    ├── ci.yml
    ├── deploy.yml
    └── preview-cleanup.yml
hosting/
├── policy.json               # Non-secret targets, quotas, host and workflow allowlists
└── headers                   # Trusted _headers template
scripts/
├── prepare-release.mjs
├── deploy-preview.mjs
├── request-production.mjs
├── release-orchestrator.mjs
├── verify-hosted.mjs
├── cleanup-preview.mjs
└── hosting/
    ├── github.mjs            # Narrow REST operations and provenance checks
    ├── provider.mjs          # Explicit local Wrangler process invocation
    └── release-records.mjs   # Archive/receipt validation and state transitions
tests/
├── integration/
│   ├── release-artifact.test.mjs
│   ├── deployment-policy.test.mjs
│   ├── deployment-recovery.test.mjs
│   └── hosted-verification.test.mjs
└── e2e/
    └── hosted-foundation.spec.ts
```

Also update `package.json`, `package-lock.json`, `.gitignore`, `.prettierignore`, README,
CONTRIBUTING, and existing test configuration only where commands or hosted checks require it.
`.deploy/` and provider state are ignored. Preserve `src/` and the Astro static build.

**Structure Decision**: Keep one root project. Operational helpers share provenance and state
rules across local commands and workflows. Documentation names planned paths; do not create
empty implementation placeholders during planning.

## Phase 0 Research Outcome

[research.md](./research.md) resolves platform, trust, concurrency, retention, recovery,
cache, and CLI choices using current official documentation and published CLI metadata.
Choose named Worker Previews, individual-Worker tokens, an unprivileged build followed by
protected-main orchestration, and GitHub draft-release archives. Avoid a custom backend,
provider-integrated duplicate builds, or dynamically created PR Workers.

## Phase 1 Design

### Build and provenance

`ci.yml` runs on PRs targeting main and main pushes. Explicitly build PR head SHA and record
base SHA separately; production builds use the push SHA. Install locked dependencies and
pinned browsers using the R1 runtime, then run the existing complete verification. Packaging
runs after success and does not change `dist/` or tracked source. Upload only the static
artifact and manifest, using an artifact name bound to SHA, run ID, and run attempt.

The release workflow independently verifies the triggering run through GitHub, selects its
artifact by run and artifact ID, and checks paths/digests. Candidate code and config never run
in a secret-bearing runner. Deployment tooling is installed from the trusted control revision,
without candidate-populated caches. Cross-platform acceptance compares local and CI manifests
for identical source/build inputs; the aggregate deployment package has a separate manifest.

### Eligibility and authorization

Require active rulesets on main: pull requests with no direct pushes, the named required CI
check, blocked force pushes/deletion, and an empty deployment-policy bypass list. The owner's
2026-10-03 solo-maintainer decision sets required approvals to zero and leaves code-owner
approval non-blocking while `katpb` is the only maintainer. CODEOWNERS documents ownership
of workflows, hosting policy, scripts, lockfile and ownership rules. Enable required independent
approval and applicable code-owner approval when a second trusted maintainer is added.
Owner review remains part of the PR process; PR and CI gates remain mandatory.
Use a split audit/runtime trust model. The existing authorized owner/admin setup path audits
complete applicable rulesets and bypass actors; pin IDs, targets/conditions, enforcement,
exact rules/check source and GitHub `updated_at` revisions in `hosting/github-ruleset-audit.json`.
Runtime reads active branch rules and the complete repository/inherited ruleset inventory using
read-only/Metadata access, verifies exact audited state and matching revisions, and fails closed
on changed, missing or unknown state until a new owner audit. Runtime does not enumerate bypass
actors; no Administration-write credential or second App is introduced in CI. The audit snapshot
is trusted protected-main control configuration, never artifact-supplied authority.
`protected: true` alone is insufficient. Setup must verify that the account's GitHub plan
supports the required protections and environments.

Use the dedicated owner-approved archive GitHub App installed only on `katpb/katpb.dev`,
with Contents read/write and GitHub's mandatory Metadata read access only. Grant its exception
only to archive-tag creation; keep main and the separate archive update/deletion rules without
bypass actors. Store its private key only through approved GitHub environment secrets and mint
short-lived installation tokens in trusted archive jobs. Additional permissions require explicit
owner approval. Verify the actual app identity, installation scope and rules through readbacks.

Normal deployment CI provider tokens exist only in main-ref deployment environments `preview` and `production`.
Ordinary production releases are automatic after eligible main CI success. A separate
`production-recovery` environment uses the same Worker scope, main-ref restriction, and
required owner review when supported, with exact restored archive ID in its approval context.
Dispatch also requires repository write permission and records the initiator.
Controlled acceptance credentials remain separate as defined under “Controlled acceptance target”.

Same-repository, current, open PRs authored by a maintainer/write-authorized collaborator are
eligible for automatic preview. Forks and other untrusted PRs validate without credentials
and receive a visible authorization-required skip. A maintainer can promote reviewed fork
content to a maintained branch; no privileged fork-code execution path is introduced.

### Upload, verification, and reporting

One workflow-level `r4-hosting` lock spans all automated mutations: preflight, archive, provider
upload, credential-free hosted verification, recording, and preview cleanup. A global lock
avoids inferring PR numbers before authoritative provenance checks. Recheck the current main/PR
SHA immediately before upload; queue ordering never establishes eligibility. Hold the lock
while different jobs separate archive write permissions, provider secrets, and browser execution.

Create an explicit deployment for the candidate SHA. Environment jobs use `deployment: false`
so environment authorization does not create a misleading record for the control SHA. Configure
job permissions narrowly. Archive the complete production attempt before upload; then invoke
Wrangler with generated, trusted, assets-only configuration and explicit target. Smoke-check
the actual production or preview address. Persist the verified receipt before reporting success.
Always publish stage/revision diagnostics and workflow summaries; PR deployment records show
URL, source SHA, latest attempt outcome, and older verified preview identity when applicable.

### Recovery and unknown outcomes

The previous verified production archive remains known-good when later checks fail. An uploaded
or possibly uploaded candidate is unresolved until smoke verification and served identity are
established. Ordinary deployment refuses to pass an unresolved mutation. Authorized
reconciliation or recovery shares the production lock and records the outcome.

Recovery resolves a verified archive, confirms its source is in protected-main ancestry, checks
all stored bytes, merges the newest retained immutable assets into the selected raw output,
archives a new recovery attempt, deploys it, and verifies the actual address again. No historical
code executes in the privileged workflow. A missing/corrupt archive fails clearly; rebuilding
the historical SHA in an unprivileged validation job is a documented fallback only if its
raw manifest exactly matches the archived verified manifest. Local production commands only
dispatch this workflow; they receive no production provider token.

### Delivery and preview lifecycle

Serve assets with `html_handling: auto-trailing-slash` and `not_found_handling: none`.
Use default revalidation for HTML/non-versioned files, a trusted immutable rule for generated
fingerprinted `/_astro/` files, and noindex on technical acceptance addresses. Reject
candidate provider-control files. Reserve `/__release.json` for deterministic release identity.
Retain every previously prepared production immutable asset without replacing its bytes.
Quota checks include retained assets. Recovery keeps assets delivered by failed/newer attempts.

Closed PRs are marked inactive immediately and queued cleanup uses the same global lock, rechecks
closed state, and deletes only that named preview. Scoped-token cleanup permission and provider
preview quotas must be exercised; if cleanup needs separate privilege, provision only that
specific permission and document it instead of expanding the deployment token. Local previews
have explicit names and documented cleanup. Preview history is temporary, not recovery storage.

### Controlled acceptance target

The isolated acceptance Worker already required by `quickstart.md` section 7 is a
non-production assets-only test target for controlled provider, failure, and recovery
acceptance exercises. It is separate from the production Worker and the preview parent
and cannot affect normal PR previews. Use only provider-hosted HTTPS addresses, no
`katpb.dev` custom domain, and no DNS/nameserver changes. It is not an application/runtime
environment and is not part of the public launch topology.

Use a separate token scoped only to this Worker, explicit allowlisted acceptance target
bindings, and isolated attempt/archive history. Never reuse production or normal-preview
credentials or redirect their ordinary jobs to the test target. Controlled exercises use
the same trusted control path, validation, authorization and credential-free hosted checks;
record the secure test-credential source and authorization boundary before use. This
clarifies acceptance infrastructure without adding a visitor service or deployment mode.

For T005 local credential exercises, use the owner-approved 1Password CLI references in
`contracts/developer-commands.md`. Resolve only the needed reference with normally masked
`op run` into each short-lived trusted provider subprocess. Values never enter Codex,
candidate/build/browser processes, arguments, plaintext files, logs or evidence. The owner
handles desktop/Touch ID access prompts; unavailable CLI access or insufficient scoped
permissions blocks T005 without permission broadening. This is the approved secure local
source under the existing trust boundary, not a security exception.

### Domain readiness

`katpb.dev` was registered with Namecheap on 2026-10-03, as confirmed by the owner.
Domain ownership is satisfied. DNS and nameserver configuration, Worker custom-domain
routing, certificate activation, and public launch have not been performed. DNS and
active custom-domain routing remain unchanged and are intentionally deferred until
a separate explicit owner-approved cutover.

Record owner, account/zone identifiers, current DNS and conflicts, intended production Worker,
HTTPS prerequisites, and outstanding blockers during setup/acceptance. Do not configure active
routes or custom domains. Adding a Worker custom domain can create DNS records and certificates;
that belongs to later explicit owner-approved cutover with separate permissions.

## Validation Strategy

- Preserve the full R1 gate and compare raw local/CI build manifests for the same revision.
- Unit/integration exercises cover malformed archives, symlinks, traversal, hash mismatch,
  immutable collisions, quota failures, reserved paths, source/run spoofing, stale runs,
  closed/fork PRs, non-main dispatch, missing credentials, unknown uploads, failed smoke,
  interrupted receipt writes, and failed recovery.
- Mocked tests must assert provider mutation is absent for rejected candidates and known-good
  identity is preserved after failures. They do not claim hosted acceptance.
- Hosted acceptance exercises preview creation/update/isolation, actual merge deployment,
  credential scope, TLS/404/MIME/hash/cache behavior, failure stages, and recovery with newer
  assets still addressable. Capture raw timing and revisions for SC-002 through SC-009.
- Credential-free hosted Playwright checks preserve accessibility, JavaScript-disabled
  readability, mobile/desktop usability, and applicable performance evidence.
- Record prerequisites not satisfied as blockers; do not check off acceptance without evidence.

See [quickstart.md](./quickstart.md), [developer commands](./contracts/developer-commands.md),
[deployment workflow](./contracts/deployment-workflow.md), and
[release artifact](./contracts/release-artifact.md) for the planned executable procedures.

## Complexity Tracking

No constitution violations. Durable archives and retained-asset packaging are required by
recovery and complete-transition requirements. Wrangler is the sole new package; GitHub and
Cloudflare already form the approved hosting boundary.

## Planning Completion

Phase 0 research and Phase 1 design/contracts are complete. The project has no
`.specify/extensions.yml`, so no before/after-plan extension hooks apply. Generate `tasks.md`
with `speckit-tasks` next; implementation and hosted acceptance are separate subsequent work.
