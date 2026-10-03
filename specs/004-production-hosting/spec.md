# Feature Specification: R4 — Production Hosting

**Feature Branch**: `004-production-hosting`

**Created**: 2026-10-02

**Status**: Draft

**Input**: User description: "Establish a safe, automated hosting and deployment workflow for the existing Astro static site using Cloudflare Workers Static Assets and GitHub. Reuse the R1 toolchain; automate pull-request previews and production deployment from protected main; verify deployments, report failures, support recovery, protect credentials, prepare HTTPS and katpb.dev custom-domain readiness, apply appropriate static-asset caching, and document local and CI deployment commands. Validate independently of R2 using the merged R1 foundation page. Exclude UI/content changes, publishing, CMS, analytics, backend services, committed production secrets, deployed-file editing, and DNS cutover or public launch without later explicit approval. Leave detailed implementation mechanisms to planning."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Deploy a validated production release (Priority: P1)

As the site maintainer, I want a change merged into protected `main` to be built,
validated, and deployed automatically so the hosted site corresponds to reviewed
repository history without manual file uploads.

**Why this priority**: A repeatable production release is the core R4 maintenance
outcome and can be demonstrated using the existing R1 page.

**Independent Test**: Deploy a reviewed R4 configuration change from protected
`main`, without R2 or content changes, to the production hosting target's HTTPS
address. Confirm the R1 page and assets, release identity, and recorded verification
result. No custom-domain cutover is required.

**Acceptance Scenarios**:

1. **Given** the merged R1 foundation and configured hosting prerequisites,
   **When** an eligible commit reaches protected `main`, **Then** the workflow
   automatically installs locked dependencies with the R1 toolchain, passes the
   required repository checks, and deploys the validated static output to
   Cloudflare Workers Static Assets.
2. **Given** identical source, locked dependencies, and build inputs, **When**
   production builds run locally and in CI, **Then** the generated paths and
   substantive file contents agree under R1's reproducibility contract and neither
   build changes tracked source.
3. **Given** a release has been uploaded, **When** hosted verification passes,
   **Then** the release record identifies the source revision, target, HTTPS
   address, and successful checks, and the release becomes known-good.
4. **Given** a commit fails a required check or does not satisfy protected-main
   policy, **When** deployment eligibility is evaluated, **Then** it cannot replace
   production and the reason is visible to the maintainer.
5. **Given** a later R2 change has merged and passes the same release gates,
   **When** the pipeline runs, **Then** it deploys through the established workflow
   without a separate hosting pipeline.

---

### User Story 2 - Review a pull request at its own preview address (Priority: P1)

As a reviewer, I want an automatically deployed preview of an eligible pull request
so I can inspect the proposed site before merge without changing production.

**Why this priority**: Previewing the hosted output supports review and reduces
release risk.

**Independent Test**: Open and update a trusted pull request containing an in-scope
configuration change, obtain its preview address and revision from GitHub, and
verify the R1 page there while production remains unchanged.

**Acceptance Scenarios**:

1. **Given** an eligible pull request targeting `main`, **When** it is opened or
   updated and validation passes, **Then** a preview deploys automatically and
   GitHub exposes its HTTPS address, revision, and deployment and verification
   status to reviewers.
2. **Given** two pull requests are open, **When** their previews deploy or update,
   **Then** each is identifiable with its own pull request and revision and neither
   overwrites the other or production.
3. **Given** untrusted pull-request code, including a fork contribution, **When**
   validation runs, **Then** deployment credentials are unavailable to that code;
   a preview requiring trust authorization is reported as awaiting authorization
   or skipped, rather than successful.
4. **Given** validation or preview deployment fails, **When** the result is reported,
   **Then** GitHub identifies the failed revision and stage and any older preview
   is clearly identified as an older revision.

---

### User Story 3 - Diagnose failure and restore a known-good version (Priority: P1)

As the site maintainer, I want clear release failures and a repeatable recovery
procedure so I can restore service without editing deployed files.

**Why this priority**: Production automation must provide recovery when build,
upload, or hosted behavior fails.

**Independent Test**: Exercise validation and deployment failures, then recover to
a previously verified release using the documented procedure. Verify the restored
page and assets and identify the restored source revision.

**Acceptance Scenarios**:

1. **Given** a known-good production release, **When** a new build or validation
   fails before deployment, **Then** that release remains served and the failed
   stage and revision are reported.
2. **Given** a rejected or interrupted deployment, **When** the workflow finishes,
   **Then** it reports failure or an unresolved outcome, never verified success,
   with guidance to determine the served version and recover.
3. **Given** upload succeeds but the hosted smoke check fails, **When** the result
   is recorded, **Then** the candidate is unverified or failed, is excluded from
   known-good candidates, and both its identity and the previous known-good
   release are identifiable.
4. **Given** a prior known-good release from protected-main history, **When** an
   authorized maintainer invokes documented rollback or redeployment, **Then**
   the complete release is restored, hosted checks run again, and a recovery
   record identifies the initiator, restored revision, target, and result.
5. **Given** recovery verification fails, **When** recovery finishes, **Then**
   failure remains visible with the served version or its unresolved status and
   a next recovery action; success is not reported.

---

### User Story 4 - Verify secure delivery and prepare for domain cutover (Priority: P2)

As the site owner, I want secure hosting with predictable asset freshness and
documented custom-domain prerequisites so deployment capability is ready before
I approve directing visitors to it.

**Why this priority**: Hosting acceptance must establish secure delivery and
readiness without implicitly authorizing public launch.

**Independent Test**: Verify HTTPS, rendering, asset responses, missing paths, and
cache behavior at the hosting addresses. Review domain readiness without changing
DNS or activating `katpb.dev` routing.

**Acceptance Scenarios**:

1. **Given** a preview or production hosting address, **When** the R1 page is opened
   over HTTPS, **Then** the certificate is valid, content and assets load without
   insecure requests, and core content remains readable without optional
   client-side JavaScript.
2. **Given** a versioned asset with an unchanged address, **When** a visitor returns,
   **Then** caching allows reuse without unnecessary revalidation; changed content
   receives a different versioned address.
3. **Given** cached HTML or a non-versioned asset, **When** a verified release or
   recovery changes it and the visitor next loads the page, **Then** freshness
   checks obtain current content and referenced assets load as a complete release.
4. **Given** a path does not exist, **When** requested, **Then** the host reports a
   missing resource rather than a successful foundation page and reveals no
   secrets or internal diagnostic details.
5. **Given** no owner approval for domain cutover or public launch, **When** R4 is
   validated, **Then** evidence records satisfied `katpb.dev` ownership and remaining
   DNS, nameserver, routing, and HTTPS prerequisites, while DNS and active custom-domain routing remain
   unchanged and public launch is not declared.

---

### User Story 5 - Operate deployment from documented commands (Priority: P2)

As an authorized maintainer, I want documented local and CI commands so I can
deploy, verify, diagnose, and recover without undocumented setup.

**Why this priority**: Operations must be repeatable outside the original setup
session.

**Independent Test**: Follow documentation from a clean checkout, supply credentials
securely, deploy and verify a preview, and exercise recovery in a controlled target.

**Acceptance Scenarios**:

1. **Given** a clean checkout and documented prerequisites, **When** an authorized
   maintainer follows local commands, **Then** they can build, validate, select a
   target explicitly, deploy, and smoke-check without editing generated or hosted files.
2. **Given** the documentation, **When** local and CI workflows are compared,
   **Then** commands, inputs, permissions, gates, expected results, troubleshooting,
   and recovery steps are identifiable for both.
3. **Given** missing, expired, or insufficient credentials, **When** deployment is
   attempted, **Then** it fails safely with actionable guidance, exposes no
   credential values, and does not report success.
4. **Given** a local invocation or recovery request targeting production, **When**
   eligibility is evaluated, **Then** source, validation, and authorization
   constraints apply; local commands cannot bypass protected-main policy.

### Edge Cases

- Overlapping runs finish out of order: an older ordinary deployment must not
  replace a newer verified production release or latest pull-request preview;
  intentional recovery is explicitly distinguished and recorded.
- The first deployment has no predecessor: failure identifies that no known-good
  rollback candidate exists and directs the maintainer to correct and retry.
- A run stops after upload but before verification: the release remains unverified
  until its served state and smoke-check result are established.
- Provider outages or unreachable addresses prevent verification: report the
  failed stage and unresolved served state without assuming success or restoration.
- A recovery release is unavailable or cannot be reproduced: reject it clearly
  and identify another known-good candidate or the documented rebuild recovery path.
- Cached older HTML references an older versioned asset: visitors must not receive
  broken pages during deployment or recovery transitions.
- A preview lacks authorization or a pull request closes while a run is pending:
  report its disposition and prevent it from affecting production.
- Nameserver, routing, or certificate prerequisites are incomplete: validate at the
  hosting address and record blockers rather than claiming domain activation.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Hosting MUST use Cloudflare Workers Static Assets for the existing
  static site, with GitHub (`katpb/katpb.dev`) as source repository and release
  history. No application backend service is required by this feature.
- **FR-002**: Local and CI production builds MUST reuse the R1 toolchain,
  dependency lock, and static-build contract. Identical source and build inputs
  MUST produce matching paths and substantive file bytes, ignoring only R1's
  permitted filesystem metadata, without changing tracked source.
- **FR-003**: Deployment MUST require applicable R1 repository-health checks,
  including formatting, diagnostics, browser/accessibility checks, workflow tests,
  production build, and reproducibility validation, to pass for the deployed
  revision. Failed checks MUST block deployment of that candidate.
- **FR-004**: Eligible pull requests targeting `main` MUST receive automated
  previews on opening and updates after validation. Each MUST be isolated from
  production and other pull requests and linked to its source revision.
- **FR-005**: Reviewers MUST find the preview address, source revision, and
  deployment and verification results in GitHub. Failed, stale, skipped, cancelled,
  and authorization-pending outcomes MUST be distinguishable from verified success.
- **FR-006**: Normal production deployment MUST run automatically for eligible
  changes to protected `main`, after required checks pass. Branch protection MUST
  require a pull request and passing `repository-health` checks before merge,
  block direct pushes, force pushes and deletion, and allow no general bypass.
  While `katpb` is the sole maintainer, independent second-human and CODEOWNER
  approvals are not blocking requirements; CODEOWNERS documents ownership of
  sensitive deployment files. Enable required independent approval, including
  applicable code-owner approval, when a second trusted maintainer is added.
  Pull requests, other branches and unauthorized local invocations MUST NOT
  replace production.
- **FR-007**: Only complete static output validated for the selected revision and
  build inputs MUST be released. Maintainers MUST NOT modify deployed files
  manually, and visitors MUST NOT encounter partially updated releases with
  missing referenced assets.
- **FR-008**: Every deployment and recovery attempt MUST record its revision,
  target, initiator or triggering event, time, stage outcomes, and hosted address
  when available. Current verified production and prior known-good recovery
  candidates MUST be identifiable.
- **FR-009**: Every preview, production deployment, and recovery MUST run a basic
  smoke check at the actual hosted HTTPS address. It MUST verify expected page
  identity for the selected release, a successful root response, referenced local
  assets with correct content types, valid HTTPS with no insecure asset requests,
  and appropriate missing-path behavior. Only passing checks permit verified status.
- **FR-010**: Build, validation, deployment, and smoke-check failures MUST produce
  a failing local command or CI result naming the failed stage and revision with
  actionable diagnostics and recovery guidance. Interrupted runs with unknown
  served state MUST be reported as unresolved, never verified success.
- **FR-011**: Pre-deployment failure MUST preserve current production. Failed
  post-deployment verification MUST preserve the previous known-good release's
  identity and recovery eligibility and MUST NOT promote the candidate to known-good.
- **FR-012**: Authorized maintainers MUST have a documented, repeatable rollback
  or redeployment procedure for at least the immediately previous known-good
  production release. Recovery MUST restore a complete release from protected-main
  history, verify it again, and record the restored revision and result without
  manual file edits.
- **FR-013**: Ordinary overlapping or retried runs MUST NOT let older revisions
  overwrite newer verified releases or newer previews. Intentional recovery to an
  older revision MUST be authorized and recorded as recovery.
- **FR-014**: Credentials MUST be supplied separately from committed source with
  permissions limited to required targets and operations. Credentials MUST NOT
  appear in Git history, generated site files, reviewer output, or logs. Missing
  or invalid credentials MUST fail safely; documentation MUST describe secure
  setup, replacement, and revocation without secret values.
- **FR-015**: Untrusted pull-request code MUST NOT receive deployment credentials
  or production permissions. Preview execution requiring trust authorization MUST
  wait for it or report a skip; the authorization policy MUST be documented.
- **FR-016**: Preview and production hosting addresses MUST provide valid HTTPS.
  R4 MUST document `katpb.dev` ownership, routing, and certificate prerequisites,
  the intended production target, and outstanding readiness blockers. DNS cutover,
  active custom-domain routing changes, and public launch MUST remain gated on
  separate explicit approval.
- **FR-017**: Versioned assets MUST support long-lived reuse and use new addresses
  when content changes. HTML and non-versioned assets MUST check freshness on
  subsequent use so releases and recovery expose current content. Cache behavior
  MUST preserve complete rendering during transitions and be documented and
  verified for both asset classes.
- **FR-018**: Documentation MUST provide executable local and CI commands for
  setup, reproducible build, validation, preview deployment, production deployment,
  smoke checks, and recovery, including non-secret inputs, target selection,
  authorization, expected outcomes, and troubleshooting. Deployment network
  prerequisites MUST be distinguished from R1's offline local workflow.
- **FR-019**: Hosting acceptance MUST use the merged R1 foundation page and MUST
  NOT depend on R2, UI/content changes, or publishing capabilities. Later merged
  R2 changes MUST use the same validation and deployment workflow.

### Scope Boundaries

Included: static hosting capability, automated review and release deployments,
verification, recovery, credential protection, delivery caching, operational
documentation, and readiness evidence for later custom-domain cutover.

Excluded: UI or content changes; article publishing workflows; CMS integration;
analytics; application backend services; production secrets in Git; manual changes
to deployed files; DNS cutover or public launch without later explicit approval.
Availability at provider-hosted addresses supports technical acceptance and does
not constitute approval to launch `katpb.dev`.

Controlled provider, failure, and recovery acceptance exercises use a non-production
test target isolated from production and normal PR previews. It is provider-hosted only,
uses credentials scoped only to that target, and has no `katpb.dev` custom domain or
DNS/nameserver changes. This target is acceptance infrastructure, not an application/runtime
environment or part of the public launch topology.

Planning will select deployment orchestration, platform configuration, credential
provisioning mechanisms, preview addressing and lifecycle, release retention,
recovery mechanics, cache settings, and exact command names. This specification
sets required behavior without choosing those mechanisms.

### Constitution Compliance

- **Maintenance value and integrity**: Reviewed history, reproducible output, and
  release identity make the served site attributable and recoverable.
- **Accessibility and progressive enhancement**: Preserve R1 content and required
  accessibility checks; the hosted foundation remains readable without optional
  client-side JavaScript. No new visitor interactions are introduced.
- **Performance**: Preserve applicable existing performance acceptance thresholds
  and required checks; caching must not break freshness or asset loading.
- **Privacy and security**: Introduce no visitor data collection, analytics,
  third-party scripts, or cookies. Protect credentials and serve over HTTPS
  without exposing internal diagnostics to visitors.
- **Simplicity and verifiable quality**: Reuse R1 validation and static output;
  release validated candidates, record post-release failures, and convert
  reproducible failures into regression coverage where feasible. No constitution
  exception is requested.

### Key Entities

- **Source Revision**: A repository commit and reviewed history, build inputs,
  and validation outcomes; identifies what a deployment serves.
- **Release Artifact**: Complete static output for a revision and build inputs,
  with reproducibility evidence and no deployment credentials.
- **Deployment Target**: An isolated preview or production destination, its hosted
  address, and the authorization boundary governing changes to it.
- **Deployment Record**: A deployment or recovery attempt's initiator, revision,
  target, time, stage results, and hosted verification outcome.
- **Known-Good Release**: A production release that passed required pre-deployment
  and hosted checks and is identifiable for recovery.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: From a clean checkout, two builds using identical source and inputs
  produce identical generated paths and substantive content locally and in the
  release environment, with zero tracked-source changes.
- **SC-002**: One eligible pull-request opening and one subsequent update each
  produce a reachable, verified review address within 10 minutes of the automated
  run starting, excluding external service outages, with the matching revision and
  result visible to the reviewer and zero production changes.
- **SC-003**: One eligible merge produces a verified production release within
  10 minutes of the automated run starting, excluding external service outages,
  without manual deployment or file editing and without requiring initial-UI work.
- **SC-004**: In controlled failed-validation, invalid-credential, interrupted-
  deployment, and failed-smoke-check exercises, 100% of attempts expose the failed
  or unresolved stage and revision and zero attempts report verified success.
  Pre-deployment failures leave the served version unchanged.
- **SC-005**: Following recovery documentation, an authorized maintainer restores
  and verifies the immediately previous known-good release within 15 minutes of
  starting recovery, excluding external service outages, with the restored
  revision recorded and no edits to hosted files.
- **SC-006**: All tested review, release, and recovery addresses pass the defined
  smoke check: expected page, required assets and content types, valid secure
  transport, zero insecure asset requests, and missing-resource behavior.
- **SC-007**: In one release transition and one recovery exercise, returning
  visitors obtain current HTML and non-versioned assets on their next page load,
  unchanged versioned assets remain reusable, and zero referenced assets are missing.
- **SC-008**: Inspection of acceptance changes, generated files, and captured
  workflow output finds zero deployment credential values; an untrusted-change
  exercise exposes zero credentials and makes zero production changes.
- **SC-009**: A maintainer following only documented prerequisites and commands
  completes one local review deployment, verifies it, and identifies automated
  release and recovery procedures without undocumented steps. Domain-readiness
  evidence identifies every outstanding prerequisite, with zero DNS or active
  custom-domain routing changes during acceptance.

## Assumptions

- `katpb.dev` was registered with Namecheap on 2026-10-03, as confirmed by the owner.
  Domain ownership is satisfied. DNS and nameserver configuration, Worker custom-domain
  routing, certificate activation, and public launch have not been performed. DNS and
  active custom-domain routing remain unchanged and are intentionally deferred until
  a separate explicit owner-approved cutover.
- R1 is complete and merged; its minimal page is sufficient hosting content.
  R2 and R3 are independent roadmap items and are not prerequisites.
- The existing GitHub repository and a suitable Cloudflare account are available
  to the authorized owner. Access and required branch protections are setup
  dependencies to verify during planning and acceptance.
- The R1 toolchain contract remains authoritative, including the pinned Node
  version, supported npm major, lockfile, static output, and local command behavior.
  R4 does not require a toolchain migration.
- Automated previews apply to trusted, eligible pull requests. Forks and other
  untrusted contributions require a documented safe authorization boundary before
  credential-bearing deployment operations.
- Hosting can be validated at provider-hosted HTTPS addresses before custom-domain
  activation. The owner will separately approve DNS cutover or launch.
- Normal local deployment targets a preview; production operations are restricted
  to authorized, validated protected-main releases and explicit known-good recovery.
- Ten-minute release/preview and fifteen-minute recovery targets are initial
  acceptance budgets for this small static site, measured after execution starts
  rather than during external queueing or outages.
- Recovery guarantees at least the immediately previous verified release.
  Planning will choose retention and recovery details sufficient to preserve that
  guarantee; automatic rollback is not assumed.
- Deployment and hosted verification require network access; R1's offline local
  development, build, and validation contract remains intact after setup.
