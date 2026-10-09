# Data Model: R4 — Production Hosting

This is an operational record model, not an application database. All JSON uses a versioned
schema, strict field validation, and explicit nulls for unavailable outcomes. Credentials never
appear in these entities.

## Source Revision

| Field                                         | Rule                                                                                                        |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `repository`                                  | Literal `katpb/katpb.dev`.                                                                                  |
| `sourceSha`                                   | Full lowercase 40-character Git SHA independently established through GitHub.                               |
| `sourceRef`, `event`                          | `main`/push for ordinary production; PR head/pull_request for preview; explicit main dispatch for recovery. |
| `pullRequest`, `baseSha`                      | PR number and separately recorded base revision, otherwise null.                                            |
| `controlSha`                                  | Protected-main revision supplying trusted deployment code/configuration.                                    |
| `validationRunId`, `runAttempt`, `artifactId` | Numeric identifiers checked against GitHub's run/artifact endpoints.                                        |
| `nodeVersion`, `npmVersion`, `lockfileSha256` | Exact build inputs; match the R1 contract and source lockfile.                                              |
| `validationResult`                            | Success only when every mandatory R1 and R4 check passed.                                                   |

The candidate's manifest cannot establish authority for these values. The orchestrator derives
provenance independently and compares the manifest to it. PR head output is never described as
tested synthetic-merge output. Recovery relates to the original validation record and archive.

## Release Artifact

| Field                                  | Rule                                                                                                                                    |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `schemaVersion`                        | Initially 1. Reject unsupported versions.                                                                                               |
| `rawManifest`                          | Sorted unique POSIX relative paths, byte sizes, and SHA-256 hashes for all raw `dist/` files.                                           |
| `rawDigest`                            | SHA-256 of the canonical raw manifest.                                                                                                  |
| `immutableManifest`                    | Generated fingerprinted `/_astro/` files eligible for permanent retention; never raw public files masquerading as fingerprinted assets. |
| `retainedManifest`, `retainedDigest`   | Historical immutable union, including every prepared production candidate that could have been served.                                  |
| `packageManifest`, `packageDigest`     | Selected raw output plus retained assets, trusted headers, and deterministic marker.                                                    |
| `policySha256`, `predecessorArchiveId` | Identify packaging policy and preceding aggregate archive; no implicit mutable latest input.                                            |
| `reproducibility`                      | Exact raw build comparison evidence and tracked-source before/after result.                                                             |

All entries are regular files within the artifact root. Reject absolute paths, traversal,
symlinks, hard links, device files, duplicates, case-colliding paths, forbidden controls, oversized
files, and immutable path/hash collisions. Include all inputs in reproducibility evidence.

Raw artifact identity is separate from package identity: adding historical assets must not
pretend that the raw Astro build produced them. Timestamps and initiators belong in records,
not reproducible site files.

## Deployment Target

| Field                     | Rule                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------- |
| `kind`                    | `production`, `preview`, or isolated `acceptance` target.                             |
| `accountId`, `workerName` | Non-secret, allowlisted setup values; explicit, never inferred from a branch name.    |
| `previewName`             | `pr-<positive integer>` or approved `local-<owner>-<source-sha>`, otherwise null.     |
| `environment`             | `preview`, `production`, or `production-recovery`; workflow ref must be main.         |
| `stableUrl`, `uniqueUrl`  | HTTPS provider-returned URLs validated against expected account/Worker host patterns. |
| `credentialScope`         | Description of individually scoped Worker token; never token value.                   |
| `quota`                   | Selected provider plan limits and current asset/preview counts.                       |

Production and preview are distinct Workers. Custom-domain routing is absent from deployable
configuration. Provider URL host validation happens before any network smoke request or report.

The isolated `acceptance` target is a separate non-production assets-only Worker used only
for controlled provider/failure/recovery acceptance exercises, isolated from production and
normal PR previews. It has provider HTTPS addresses only, no `katpb.dev` custom domain and
no DNS/nameserver changes. Use its own Worker-scoped credentials, explicit allowlisted target
bindings and isolated attempt/archive history; never production or normal-preview credentials.
The existing `environment` field describes workflow authorization, not an application/runtime
environment. This acceptance target adds no application/runtime environment and is outside
public launch topology; controlled exercises retain the applicable operation authorization
and validation gates described in `plan.md` under “Controlled acceptance target”.

## Deployment Attempt

An attempt relates one revision and one complete package to one target.

| Field                                               | Rule                                                                                                                      |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `attemptId`                                         | `<run-id>-<run-attempt>` for CI; uniquely identified local attempt.                                                       |
| `mode`                                              | `release`, `preview`, `recovery`, `reconcile`, or `cleanup`.                                                              |
| `initiator`, `trigger`, `startedAt`, `finishedAt`   | Authoritative event identity and UTC times.                                                                               |
| `deploymentId`, `archiveId`, `providerDeploymentId` | GitHub/provider IDs, null until established.                                                                              |
| `sourceSha`, `controlSha`, `packageDigest`          | Bind record to revision, tooling, and bytes.                                                                              |
| `previousKnownGoodArchiveId`                        | Latest verified production predecessor, null on first deployment.                                                         |
| `restoredArchiveId`                                 | Selected verified recovery source, otherwise null.                                                                        |
| `stages`                                            | Eligibility, validation, packaging, archive, upload, HTTPS smoke, browser checks, and recording with individual outcomes. |
| `state`, `failedStage`, `servedState`               | Explicit outcomes; served state is known revision or `unknown`.                                                           |
| `urls`, `logUrl`, `guidance`                        | Non-secret HTTPS addresses, run link, and next action.                                                                    |

### State transitions

```text
requested -> eligible -> validated -> prepared -> archived -> uploading
uploading -> uploaded -> verifying -> verified
requested/eligible/validated/prepared/archived -> failed-before-upload
uploading -> unresolved
uploaded/verifying -> failed-after-upload or unresolved
any pre-upload eligibility stage -> skipped-stale or skipped-authorization or skipped-closed
unresolved -> verified-after-reconciliation or failed-after-reconciliation
```

An upload success, absent final receipt, cancellation, timeout, or provider outage never implies
verification. GitHub status uses pending/in_progress before checks, success only after persisted
verification, failure for established failures, and error for unknown served state. The summary
and payload preserve the more precise state. A skipped preview cannot display verified success.

## Known-Good Release and archive chain

A known-good release is a production attempt with a stored verified outcome receipt, complete
hash-verified archive, successful source validation, and protected-main ancestry. Preserve both
the current and immediately previous verified archive IDs even when another candidate fails.

Each production attempt has a draft GitHub release tagged
`r4-attempt-<run-id>-<run-attempt>` at its source SHA. Its prepared archive and receipt exist
before provider mutation. Outcome receipts are appended with unique names; do not overwrite
successful evidence. GitHub Actions artifacts are handoff/evidence copies, not durable recovery
authority. No automatic archive or immutable-asset pruning is permitted in R4.

The retained-asset chain advances at durable preparation, not verified success: failed or
unresolved uploads may have exposed new asset URLs. The known-good chain advances only after
hosted checks and receipt persistence succeed. Recovery selects the known-good raw release while
using the newest prepared retained-asset chain.

If a predecessor archive is missing/corrupt or a mutation is unresolved, ordinary deployment
blocks. An authorized operator reconciles served identity or invokes recorded recovery. First
deployment failure reports explicitly that no earlier known-good archive exists.

## Preview Lifecycle

`open/current -> preparing -> uploaded/unverified -> verified` with failed/stale outcomes kept
separate. Updating a PR retains its prior verified deployment record and creates a new attempt.
The stable URL may serve an unverified new attempt after upload; only the unique verified URL
can safely be described as the older verified revision. Closure produces inactive status and
serialized cleanup, with failed deletion recorded for retry. Cleanup never changes production.

## Domain Readiness

`katpb.dev` was registered with Namecheap on 2026-10-03, as confirmed by the owner;
domain ownership is satisfied. DNS and nameserver configuration, Worker custom-domain
routing, certificate activation, and public launch have not been performed. DNS and
active custom-domain routing remain unchanged pending a separate explicit owner-approved cutover.

Readiness evidence records owner, account/zone, intended hostname and Worker, current DNS/routing
conflicts, certificate prerequisites, outstanding blockers, inspection date, and a separate
cutover-approval reference. Unknowns remain unknown. A ready provider address is not evidence
that `katpb.dev` is active or that public launch has been approved.
