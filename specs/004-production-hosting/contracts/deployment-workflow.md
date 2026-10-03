# Contract: R4 GitHub Deployment Workflow

## CI and protected-main prerequisites

`ci.yml` is named `CI` and exposes one stable required check, `repository-health`, for every PR
targeting main and every main push; no path filter may bypass this gate. Checkout the exact PR
head or push SHA, set checkout credential persistence off, use Node 24.21.0/npm 11.x, install
locked dependencies and pinned Chromium/WebKit with Ubuntu system dependencies, and run
`npm run verify`. Include operational tests in that gate. Upload only complete verified static
output/manifest after success. Failed validation produces no deployable artifact.

Build runners receive only read repository permissions and no environment/provider credentials.
Pin GitHub-owned actions to full commit SHAs. PRs cannot access preview or production environments.
Do not share writable candidate caches with the privileged workflow.

Require active rulesets on main with mandatory PRs/no direct pushes, the named required check
and its expected Actions source, force-push/deletion protection and no bypass actors. While
`katpb` is the sole maintainer, require zero independent approvals and no blocking code-owner
approval; retain CODEOWNERS for sensitive control-file ownership. Enable required independent
and applicable code-owner approval when a second trusted maintainer is added. Verify active
branch rules through GitHub's rules API at deployment time. Record
setup capability/plan blockers rather than assuming protection from the branch name.

## Trusted orchestration entry points

`deploy.yml` runs from default protected main on completion of the allowlisted CI workflow and
on explicit `workflow_dispatch`. Reject dispatches whose workflow ref is not `refs/heads/main`.
Pin the control checkout to the protected-main SHA resolved at orchestration start and record it.
Never checkout/run/install the candidate code in privileged runners; artifacts are static data.

Inputs for dispatch:

| Input           | Values and validation                                                         |
| --------------- | ----------------------------------------------------------------------------- |
| `operation`     | `release`, `recover`, or `reconcile`.                                         |
| `source_sha`    | Required for release; exactly current main plus successful eligible CI.       |
| `archive_id`    | Required for recovery; known-good production archive ID resolved server-side. |
| `deployment_id` | Required for reconciliation; unresolved attempt on the allowlisted target.    |

Fetch the triggering CI run and artifact through GitHub by ID; require expected repository,
workflow ID/path, run attempt, permitted event/ref, success, and exact SHA. Do not accept
artifact-supplied repo/run/PR/target authority. Confirm PR number through GitHub, not artifact
text. Consume the selected run's artifact ID, never a global artifact named latest.

## Eligibility matrix

| Candidate                                                              | Result                                                                 |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Successful main push, current main SHA, compliant protection           | Automatic production attempt.                                          |
| Current open same-repository PR to main by write-authorized maintainer | Automatic isolated preview.                                            |
| Fork or other untrusted PR                                             | CI runs; preview explicitly skipped because authorization is required. |
| Old main/PR SHA, closed PR, other branch, invalid run or failed checks | Skip/reject with revision and reason; zero provider mutations.         |
| Main-ref release dispatch for current main with successful CI          | Authorized redeployment through same gates.                            |
| Main-ref recovery dispatch for verified protected-main ancestor        | Reviewed recovery under recovery authorization and production lock.    |

Trust requires a documented GitHub permission check, not `author_association` alone. Promoting
reviewed fork content to a maintained branch creates a new eligible CI candidate. No PR labels
or arbitrary artifact fields grant credentials.

## Permissions and environments

| Job responsibility         | Permissions/credentials                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Candidate CI               | `contents: read`; no provider secrets.                                                                             |
| Provenance/preparation     | `contents: read`, `actions: read`, `pull-requests: read`; no provider secrets.                                     |
| Durable production archive | `contents: write` only where needed; trusted scripts/data only; no provider secrets.                               |
| Provider mutation          | Main-only protected environment with token scoped to selected Worker; no PR code or browser execution.             |
| Hosted checks              | Credential-free browser/process environment; read-only metadata if needed.                                         |
| Deployment reporting       | `deployments: write`, necessary read permissions, and narrowly scoped preview status write permission if required. |

Default workflow permissions are read-only/none; elevate by job. Tokens are environment secrets,
never repository-wide secrets. Environments `preview`, `production`, and `production-recovery`
restrict workflow refs to main, without PR-ref wildcard exceptions. Ordinary production does
not require manual per-release approval; recovery uses owner review where available plus explicit
write-authorized dispatch. Environment jobs use `deployment: false`; explicit deployment records
bind the selected source SHA rather than the orchestrator SHA. No custom protection app is assumed.

Controlled provider/failure/recovery acceptance exercises use the isolated non-production
assets-only Worker defined in `plan.md` under “Controlled acceptance target”, with separate
Worker-scoped test credentials, explicit allowlisted target bindings and isolated attempt/archive
history. Preserve the applicable main-ref authorization, provenance, validation and credential-free
hosted-check gates; never reuse production/normal-preview credentials or redirect their ordinary
jobs. The target is isolated from production and normal PR previews, provider-hosted only,
with no `katpb.dev` custom domain or DNS/nameserver changes. It adds no application/runtime
environment and is outside public launch topology.

## Mutation ordering

Hold one non-cancelling workflow-level `r4-hosting` concurrency lock across deployment,
preview, recovery, reconciliation, and cleanup workflows, with `queue: max` where supported.
Include the candidate SHA or recovery archive ID in the workflow run name so even queued
cancellations remain attributable in GitHub. This small site favors simple
serialization over separate per-PR locks requiring pre-lock provenance lookup.
Do not automatically cancel an upload or verification. Re-fetch source eligibility after approval
and immediately before upload while holding the lock. Already verified identical retries can
verify/report without uploading again; all actual mutations receive distinct attempts.

Queue order is not source order. If main advances after preflight, its newer candidate waits
for the existing attempt to finish. The earlier candidate cannot run later and overwrite the
newer verified release because its subsequent live-main check fails. PR closure during upload
requires inactive reporting and serialized cleanup; it never grants production access.

If an earlier mutation lacks a conclusive final receipt, stop ordinary production work.
Reconciliation identifies the served marker/root/package or explicit recovery restores a known-good
release. An absent archive/history is not permission to assume a first deployment.

## Production transaction and durable retention

1. Verify source/run/artifact/protection and resolve previous known-good plus newest prepared archive.
2. Validate raw bytes, merge retained immutable assets, and enforce provider quotas.
3. Create explicit GitHub deployment for candidate SHA with `auto_merge: false`; record pending.
4. Create draft release/tag `r4-attempt-<run-id>-<attempt>` at source SHA, upload complete raw and
   prepared archives/manifests and prepared receipt, and verify stored digests before any upload.
5. Recheck source eligibility; invoke pinned Wrangler with explicit trusted target/config.
6. Capture provider ID/URL, record upload outcome, and run credential-free hosted checks.
7. Append verified receipt only when all checks pass; then report deployment success and URL.
8. On any failure, record stage/source/served state and recovery guidance; preserve previous
   known-good identity. Recording failure after upload remains unresolved, never success.

Prepared archives are retained even after failure because their assets may have been served.
All production attempt archives/receipts remain without automatic expiration/deletion. Protect
the archive tag namespace against replacement/deletion; permit only the narrowly authorized
archive actor to create tags. Draft status is organizational, not known-good evidence.

The owner-approved dedicated archive GitHub App is installed only on `katpb/katpb.dev`,
with Contents read/write and mandatory Metadata read only. Its bypass applies exclusively
to the creation-only archive-tag ruleset; the separate archive update/deletion rules and all
main rules retain empty bypass lists. Its key is an approved GitHub environment secret;
only trusted archive jobs mint installation tokens. Do not add permissions implicitly.
Repository administrator deletion or GitHub storage outage is an explicit archive-availability
failure, not a silent fallback to incomplete output.

## Recovery transaction

Validate initiator/ref/authorization, selected verified receipt, complete archived raw bytes,
and selected SHA's ancestry in protected main. Use current trusted tooling and newest retained
immutable assets. Create a new recovery archive/deployment carrying restored archive ID and
previous known-good ID, upload a complete new provider version, and run hosted checks again.
The successful recovery becomes current verified production; preserve its predecessor.

If archive bytes are unavailable, fail visibly. A fallback unprivileged historical rebuild must
pass all applicable validation and match the preserved verified raw manifest exactly before
the trusted workflow may consume it. If historical inputs cannot reproduce it, select another
verified complete archive or correct current main; never edit hosted files.

## Reviewer status and cleanup

Create explicit preview deployments for source SHA with environment `preview-pr-<N>`, stable
and unique URLs, provider ID, run link, and stage outcome. GitHub's PR deployment view and
Actions summary are sufficient; no unsolicited PR comments are necessary. A failed update
shows the failed revision and previous verified unique URL, distinguishing it from the stable
URL that may now serve unverified bytes. Skips/cancellations/stale outcomes are explicit.

`preview-cleanup.yml` handles PR closure from trusted default-branch code, never checks out PR
source, shares the global mutation lock, rechecks closed status, and deletes only its named preview.
Mark inactive even when provider cleanup fails; record failure for retry. Verify scoped cleanup
permission and preview quota behavior during setup. Do not delete the preview parent Worker.

Every stage emits a machine-readable receipt and readable summary containing source, target,
initiator, UTC times, URLs when available, result, known-good predecessor, and actionable next step.
Redact provider authorization errors before writing logs; never print tokens or full environments.
