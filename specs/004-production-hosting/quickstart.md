# Quickstart and Acceptance: R4 — Production Hosting

**Status**: T023–T028 preview commands/workflows are implemented locally; their GitHub-hosted
validation and live acceptance remain pending T029–T030 after review. Production/recovery
sections remain planned. No hosted results are asserted here. Record actual evidence in
`checklists/acceptance.md` during implementation.

## 1. Establish prerequisites

Use the R1-supported environment with Node 24.21.0 and npm 11.x. From a clean checkout:

```sh
npm ci
npm run test:install
npm run verify
```

CI additionally installs pinned browsers' Ubuntu system dependencies. Verify `repository-health`
on main/PRs, active main PR/check/no-bypass rulesets, force-push/deletion restrictions,
and archive tag protection. Confirm GitHub plan support rather than assuming environments
provide gates on every repository plan.

Main changes must use PRs; direct pushes are blocked. While `katpb` is the only maintainer,
independent/code-owner approval is non-blocking and CODEOWNERS records sensitive-file ownership.
Enable required independent and applicable code-owner approval when a second trusted maintainer
is added. The dedicated archive app is installed only on this repository with Contents read/write
and mandatory Metadata read; its only bypass is archive-tag creation. Store its key in approved
GitHub environment secrets and request owner approval before any additional permission.

For the owner-approved foundation-first bootstrap, record account/Free-plan/name/limit preflight,
then complete and validate credential-free T006–T022 controls before any provider upload.
Defer T004 provisioning and T005 scoped credentials/exercises; do not create placeholder uploads.
Missing Worker IDs/subdomain/URLs must block normal provider invocation. Return to the actual
three-Worker bootstrap only after applicable local/CI foundation checks pass. Use the minimum
owner creation capability once; never store product-level Admin/create-delete access in CI.
Keep T004/T005 and setup/foundation checkpoints pending until actual readbacks and tests pass.
That bootstrap window stopped before T023. Following PR #4's merge and green main CI,
the owner authorized starting T023–T030 on 2026-10-09. Preview commands/workflows in this
runbook remain planned until their implementation and acceptance evidence are recorded.

The owner then preprovisions production, preview-parent and isolated acceptance Workers at provider HTTPS addresses,
with assets-only configuration. Create separate account-owned per-Worker Editor tokens. Put
them exclusively in main-ref protected `production`, `preview`, and `production-recovery`
environments; do not create repository-wide copies. Recovery requires explicit authorized
dispatch and its configured owner-review gate. No DNS/route permission is required.

Record account/subdomain, Worker names, environment policy, token scope descriptions, API
capability checks, and provider quotas without secret values. Verify the preview token can
create/update named previews and cannot deploy production; verify cleanup separately. A
missing scoped-permission feature is a setup blocker, not authorization to broaden the token.

## 2. Verify raw and packaged reproducibility

At the same clean source SHA, run the complete R1 gate and:

```sh
npm run release:prepare -- --source-sha <full-source-sha>
```

Save sorted per-file raw manifest/hashes. Obtain the exact CI run's raw manifest and compare
all normalized paths and bytes to the local build using the same source, runtime, npm version,
lockfile, and build inputs. Repeat package preparation with the same explicit retained manifest
and trusted policy; require identical package paths/hashes. Verify `git status` before/after
and preserve pre-existing changes. `dist/` remains exact R1 output.

Inspect `.deploy/assets/` for the deterministic release marker, trusted headers, and selected
raw plus retained immutable files. Ensure operational receipts, config, secrets, and manifests
are absent from the served directory. This establishes SC-001; two local builds alone do not
establish local/CI equivalence.

## 3. Perform a local review deployment

Keep candidate build/verification credential-free. Prepare its package and copy it into a
temporary data directory. For arbitrary candidate code, use a separate clean control checkout
of protected main with locked dependencies; run deployment wrappers from that control checkout,
without executing candidate scripts or reading candidate Wrangler configuration.

The local wrapper and `deploy:preview` npm alias are implemented. Use them only after the
reviewed implementation is available in protected main.
Prepare the candidate credential-free using section 2, and copy its prepared package to a
separate data directory. Create a **separate clean checkout of current protected main** with
locked dependencies and browsers installed before deployment. Do not copy candidate code,
node_modules or configuration into that control checkout.

Coordinate explicitly with hosted deployment/cleanup runs before starting this local operation;
no hosted mutation may overlap it. The wrapper acquires `.deploy/r4-hosting.lock`, shared with
the owner-run T005 path. It refuses an existing lock and retains its lock on any uncertain
post-upload result. Do not delete a retained lock to bypass reconciliation.

From the normal owner terminal in the protected-main control checkout:

```sh
npm run deploy:preview -- --help
npm run deploy:preview -- --name local-katpb-<first-32-source-sha-hex> --package <candidate-package-directory>
```

Use the first 32 lowercase hex characters of the candidate's full SHA for the name. A full
40-character suffix exceeds the observed DNS-label limit with the preview parent Worker name.
The wrapper checks this binding and retains the **full 40-character SHA** in validation,
package marker, provider tag and receipts. The earlier random 32-hex T005 names are historical
setup probes; this wrapper accepts only source-bound names.

Do not run this wrapper under `op run` or export a resolved token. It invokes masked `op run`
itself with only the approved preview reference, resolving the credential exclusively inside
`scripts/hosting/local-preview-provider.mjs`. The owner handles desktop authentication prompts.
Codex must not execute this credential-bearing step; it can review sanitized receipts afterward.
No build, install, candidate script or browser runs in that provider subprocess.

The wrapper checks current protected-main control identity and audited protection state, checks
clean-source validation, independently repackages raw bytes using trusted headers, rejects
candidate policy changes and uploads only the named preview. It then runs HTTPS and browser
checks at **both returned URLs** without credentials. Results and stage snapshots are stored in
`.deploy/local-attempts/<attempt-id>/`; upload alone is never a verified result. On a nonzero
exit, inspect the recorded stage and reconcile any uncertain upload before retrying. Provider
output and credentials are not copied into diagnostics. Actual provider, quota, timing and
production-preservation evidence still belongs to T029, not these offline fixtures.

## 4. Exercise automated PR previews

The implemented `.github/workflows/deploy.yml` listens only to completed `CI` workflow runs;
its job gate and server-side resolver require workflow ID `374100170`, a successful PR run,
exact attempt and artifact identity. The first job checks out protected main and pins its full
control SHA; subsequent jobs check out that SHA with credential persistence disabled. Candidate
code is never checked out or installed. Downloaded artifacts fail on digest mismatch and raw
archives are validated before trusted repackaging.

The workflow holds non-cancelling `r4-hosting` concurrency with `queue: max` through preparation,
explicit pending Deployment creation, upload, HTTPS/browser checks and final reporting. Only
its provider job binds the `preview` environment (`deployment: false`) and receives that
Worker-scoped environment's `CLOUDFLARE_API_TOKEN`. Metadata/reporting have narrow GitHub
permissions; the verification process has no token or secret environment. Results bind PR,
head/control SHA, CI run/attempt/artifact and provider ID. Skips never report success. The
GitHub summary distinguishes a possibly changed stable URL from the previous verified unique URL.
No PR comment is posted.

Prior verified identity is checked against an immutable final receipt from the exact successful
trusted-main preview workflow run, in addition to Deployment metadata and main ancestry. The
Actions evidence retention is 30 days. An expired/missing prior receipt fails closed before
upload; do not silently discard the previous verification record. Reconcile its evidence or
perform owner-reviewed closed-PR cleanup before establishing a fresh lifecycle.

`.github/workflows/preview-cleanup.yml` uses default-main `pull_request_target: closed` code
and the same lock; it never checks out PR code. It confirms live same-repository/main-target
closure, marks only that PR's preview Deployments inactive, then rechecks closure directly before
named-preview deletion. Failure leaves retryable evidence and quota charged. Success requires
an authoritative absence readback. A writer can retry a closed PR's cleanup via
`workflow_dispatch` on main with `pr_number`; an open/reopened PR cannot be deleted by that path.
Provider jobs use only the preview environment. Parent Workers, production and acceptance are
outside both cleanup operations.

**Review boundary**: Do not perform the following live exercises as part of T025–T028. They
remain T029/T030 work after owner review and separate continuation.

Open a trusted in-scope PR to main using the existing R1 page. Observe `repository-health`,
then the trusted deployment workflow. GitHub's deployment view/summary must expose PR number,
head SHA, URL, run link, and verified outcome. Open its stable and unique HTTPS URLs and verify
R1 content. Update the PR and verify the new head within 10 minutes of execution start.

Open a second PR and confirm independent URLs/revisions and unchanged production. Delay an
older validation completion and ensure its stale head causes no provider update. Exercise a
closed-while-pending PR; mark inactive and clean up only that named preview.

For an untrusted/fork contribution, require successful credential-free validation as applicable
and an explicit preview authorization-required skip. Also test a same-repository PR changing
CI YAML to reference the preview environment: the main-ref environment policy must deny access.
Do not print a credential to prove isolation; verify boundary behavior with a non-secret canary
and provider mutation assertions in a controlled test. Capture SC-002 and SC-008 evidence.

## 5. Exercise automatic production delivery

After configuration review and setup, merge an in-scope R4 PR through protected main. Verify
that eligible main CI success automatically creates an archived attempt, uploads the complete
assets, and verifies the actual production HTTPS address within 10 minutes of execution start.

Check source SHA, control SHA, raw/package digests, prior known-good ID, provider ID, durable
verified receipt, GitHub deployment success, and actual hosted marker/root/assets. Verify the
main ruleset requirements through the documented runtime check. Fail an applicable check and
confirm production is not replaced. Submit an old source run and a non-main dispatch; both
must reject without provider mutation. This establishes SC-003 and production eligibility.

Manual authorized redeployment follows exactly the same path:

```sh
npm run deploy:production -- --source-sha <current-main-sha>
```

It dispatches on main and waits for the workflow result; a submitted dispatch is not verified
success. It cannot upload production directly from a local checkout.

## 6. Test delivery, cache transitions, and accessibility

For every preview, production, and recovery URL, run the hosted verifier. Confirm valid TLS,
root/marker hashes, referenced resource hashes/MIME types, no insecure dependencies, JavaScript-
disabled readability, and a nonce missing path returning 404. Test rendered mobile/desktop
content with existing Chromium/WebKit/axe checks in a job that has no provider credentials.

Use the R1 manual keyboard, Safari/Chrome, VoiceOver, zoom, and performance protocol on the
served foundation when hosting affects those acceptance claims. Record environment, viewports,
five raw mobile runs and p75 LCP/INP/CLS rather than assuming unchanged output proves performance.

Preserve production HTML from release A, deploy release B with a changed fingerprinted asset,
and request A's old asset URLs at the same production origin: all must still succeed with
unchanged hashes. Confirm B's changed assets use new addresses, unchanged assets can be reused,
and HTML/non-versioned files revalidate and return current content on the next navigation.
Repeat during recovery from B to A while B's previously delivered assets remain reachable.
Check appropriate ETag/conditional responses and cache headers. Capture SC-006 and SC-007.

R1 may have no external emitted asset because its styles can be inline. When needed, use a
small static fixture only in an isolated acceptance target to exercise changed/unchanged
immutable and mutable resources. Do not add visitor content solely to make a cache test possible.

## 7. Exercise failures in a controlled target

Use the separate non-production assets-only acceptance Worker defined in `plan.md` under
“Controlled acceptance target” and non-secret fixtures to inject failures and test recovery.
It is isolated from production and normal PR previews, uses provider-hosted HTTPS addresses
only and acceptance-Worker-scoped credentials, and has no `katpb.dev` custom domain or
DNS/nameserver changes. It is test infrastructure, not an application/runtime environment
or part of public launch topology. Record its explicit allowlisted target bindings, secure
credential source, authorization boundary and isolated attempt/archive history before use.
Never deliberately break live production or normal PR previews for failure demonstrations.
Map its behavior to the production control path while keeping both unchanged.

| Failure                                                   | Required result                                                            |
| --------------------------------------------------------- | -------------------------------------------------------------------------- |
| Formatting/check/build/browser/reproducibility failure    | CI fails at named stage; no upload.                                        |
| Missing/expired/insufficient provider credential          | Nonzero result with revision and guidance, no secret value.                |
| Unsafe/corrupt archive, immutable collision, quota excess | Reject before mutation; predecessor remains served.                        |
| Provider rejection/outage                                 | Failure or unresolved outcome; no verified receipt.                        |
| Interruption after upload/before smoke or record          | Uploaded state remains unresolved; ordinary mutation blocks.               |
| Hosted wrong SHA/hash/MIME/404/TLS/cache behavior         | Failed smoke identifies resource/stage; prior known-good remains eligible. |
| Archive/receipt write failure                             | No success; recover/reconcile using preserved archive IDs.                 |
| Failed recovery verification                              | Failure stays visible with known/unknown served state and next action.     |

Every attempt must expose source, target, stage, actor/time, provider URL when available,
previous known-good ID, and next action. Inspect captured output/generated files for credential
exposure without reproducing secrets in evidence. Capture SC-004.

## 8. Restore the immediately previous verified release

With two verified releases available, identify the previous known-good archive from stored
verified receipts. Authenticate as an authorized repository writer, then run:

```sh
npm run deploy:recover -- --archive-id <previous-verified-archive-id>
```

Approve the concrete restored ID in the configured recovery environment. Observe the shared
lock, protected-main ancestry, archive digest validation, newest retained-asset union, new
recovery archive, complete upload, hosted checks, and a verified recovery record within
15 minutes of starting recovery, excluding external service outages only. Record raw
start/end times, approval/queue time, and any excluded outage intervals explicitly.

Re-run cache-transition checks and confirm initiator/restored SHA/result are visible. Confirm
local commands cannot select a PR/other-branch source for production. Repeat with a corrupt or
unavailable archive and require clear rejection. A historical rebuild fallback must execute
without credentials and match the verified raw manifest exactly, or fail and identify another
candidate. No native hosted-file edits are permitted. This establishes SC-005.

For unknown served state, an authorized examination can be requested with:

```sh
npm run deploy:reconcile -- --deployment-id <unresolved-deployment-id>
```

Reconciliation verifies the actual bytes; it cannot mark an arbitrary uploaded candidate
known-good without all original source validation and hosted checks. If unavailable, invoke
known-good recovery and preserve the unresolved attempt's history.

## 9. Cleanup, credential rotation, and domain readiness

Close test PRs; check inactive GitHub status and provider preview deletion, recording any scoped-
permission blocker/retry. Remove only local previews explicitly:

```sh
npm run deploy:cleanup -- --name local-katpb-<first-32-source-sha-hex>
```

Local cleanup uses the owner terminal, separate clean current protected-main control checkout,
masked preview-only `op run` subprocess and shared local hosting lock. Do not pass a resolved
token to the wrapper or execute this credential-bearing path from Codex. Failed deletion keeps
its evidence and local lock for reconciliation; absence is required before quota is released.

Exercise documented secure token replacement and revocation without logging values. Verify
archives remain usable after Actions artifact expiration; do not require actual waiting—remove
the temporary handoff copy in a controlled test and recover from the durable archive.

`katpb.dev` was registered with Namecheap on 2026-10-03, as confirmed by the owner.
Domain ownership is satisfied. DNS and nameserver configuration, Worker custom-domain
routing, certificate activation, and public launch have not been performed. DNS and
active custom-domain routing remain unchanged and are intentionally deferred until
a separate explicit owner-approved cutover.

Record the satisfied ownership, zone status, current nameservers/routing/DNS conflicts, intended production Worker,
certificate prerequisites, and unresolved readiness items. Use read-only inspection; deployment
config must have no active custom-domain/route entries. Compare DNS/routing before/after acceptance
and record zero changes. Domain activation/public launch remain awaiting separate explicit approval.
Capture SC-009 by following only the documented commands/setup and listing all remaining blockers.

## 10. Acceptance record

For SC-001 through SC-009, record tested source/control SHAs, environment/tool versions, exact
commands, workflow/attempt/archive IDs, non-secret URLs, raw stage/timing evidence, pass/fail,
and unresolved setup dependencies. Automated fixtures prove failure logic; real hosted exercises
prove provider behavior. Mark only results actually observed. Re-run affected checks after
implementation changes and preserve the R1 foundation and exclusions throughout.
