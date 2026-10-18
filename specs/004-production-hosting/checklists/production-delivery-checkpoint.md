# T031–T035 production-delivery implementation checkpoint

Scope: implementation and mocked/local verification only. Owner review is required before
merge because this change introduces archive permissions and production secret bindings.
T036/T037 remain unstarted. No provider mutation, real archive/tag creation, environment/secret
configuration, DNS, custom-domain, route, certificate, dependency or lockfile change was performed.
The original workspace's US2 evidence and ROADMAP edits remain untouched.

## Implemented behavior

Production requires the exact current-main source, successful allowlisted main-push CI,
exact run/attempt/artifact/check provenance, unchanged audited main/archive rulesets, and
independent byte validation. Main-ref dispatch additionally checks current writer authority.
Candidate source/configuration/install hooks never execute in archive/provider jobs.
All toolchain installation uses pinned trusted main controls, disabled lifecycle scripts,
no candidate caches, and step-only credential bindings.

Preparation validates raw bytes, merges the newest prepared immutable union (including
unsuccessful candidates), checks collisions and quotas, and preserves raw/page bytes.
Every attempt uses a new source-bound `r4-attempt-<run-id>-<attempt>` tag and draft release.
The archive contains raw/prepared tar bytes, raw/package/retained manifests, provenance,
prepared receipt, and a digest/size index. Every asset is downloaded again and compared;
the archive job re-downloads the complete durable archive and emits an exact-ID,
digest-checked Actions handoff. The provider job independently validates those downloaded
bytes before building trusted provider configuration. Draft reads stay in archive jobs:
GitHub restricts draft visibility to writers, so read-only provider/report jobs use the
archive jobs' authenticated readback handoffs without receiving an archive token. The
Actions artifact is a transport copy; the draft release remains durable recovery authority. A live-main authorization read directly precedes upload.

A durable mutation reservation precedes the provider job. Missing/incomplete/corrupt history,
an orphan protected tag, missing deployment archive, a chain fork, retained-asset loss,
missing outcome, failed hosted checks, or unresolved upload prevents ordinary mutation.
Cancellation or missing provider evidence remains unresolved even if no upload actually occurred.
Only explicit trusted evidence that upload never started permits a `not-uploaded` outcome.
Current and immediately previous verified archives remain separately identified from the
newest prepared chain. No automatic pruning occurs.

After upload, separate credential-free HTTPS and hosted Chromium/WebKit checks must pass.
The archive recording job appends a uniquely named outcome, downloads it again, and validates
the complete archive. Deployment success requires that durable verified receipt. Upload alone,
workflow completion alone, failed recording, or unavailable recording never establishes success.
Unknown served state directs the owner to reconciliation/recovery; those commands and exercises
are outside this checkpoint. First release requires explicit null predecessors and empty
complete archive/tag/deployment inventories.

`npm run deploy:production -- --source-sha <exact-current-main-sha>` validates GitHub writer
identity, live main and eligible CI, dispatches only trusted `main`, correlates a request UUID,
prints the workflow URL, waits, and reads the exact attempt's durable verified outcome.
It rejects local provider-token environment variables and unknown/non-main inputs; it has
no local production upload path. If interrupted or timed out, follow the printed workflow
rather than assuming success or dispatching another attempt.

## Exact workflow/job permissions

Workflow default: `permissions: {}`. Omitted job permissions are none. All jobs retain the
workflow-level `r4-hosting` lock, `cancel-in-progress: false`, `queue: max`.

| Job                           | contents | actions | pull-requests | deployments | Environment                            |
| ----------------------------- | -------- | ------- | ------------- | ----------- | -------------------------------------- |
| `prepare` (existing preview)  | read     | read    | read          | read        | none                                   |
| `announce` (existing preview) | read     | read    | read          | write       | none                                   |
| `provider` (existing preview) | read     | read    | read          | none        | `preview`, deployment false            |
| `verify` (existing preview)   | read     | read    | none          | none        | none                                   |
| `report` (existing preview)   | read     | read    | read          | write       | none                                   |
| `production_prepare`          | read     | read    | none          | none        | none                                   |
| `production_archive`          | write    | read    | none          | read        | `production-archive`, deployment false |
| `production_announce`         | read     | read    | none          | write       | none                                   |
| `production_provider`         | read     | read    | none          | none        | `production`, deployment false         |
| `production_verify`           | read     | read    | none          | none        | none                                   |
| `production_record`           | write    | read    | none          | none        | `production-archive`, deployment false |
| `production_report`           | read     | read    | none          | write       | none                                   |

Only `production_provider` binds the `production` environment. Only its `provider` step
receives the production environment's `CLOUDFLARE_API_TOKEN`. The existing preview `provider`
job still receives its separate preview environment's same-named secret in its existing
provider step. No new production job references a preview or acceptance credential.

Only `production_archive` and `production_record` receive `contents: write`; two archive
jobs are necessary to persist evidence before upload and append the outcome after hosted
verification across isolated runners. Only their archive/record steps receive the proposed
`R4_ARCHIVE_APP_PRIVATE_KEY`. Trusted code mints short-lived installation tokens for App
`5176510`, installation `167561083`, selected repository `katpb/katpb.dev`, Contents write
and mandatory Metadata read only. No App token is exported as a job output or artifact.
Only `announce`, `report`, `production_announce`, `production_report` receive
`deployments: write`. Browsers and HTTPS checks receive no GitHub/provider/archive credential.

## Archive protection and owner configuration prerequisite

The existing audited rulesets remain unchanged: main `24419712`; archive immutability
`24419675`; archive creation `24419981`. Only App `5176510` bypasses the creation-only rule.
Main and archive update/deletion/non-fast-forward rules have no bypass. Creation uses a
POST-only exact-source ref, then independently reads its commit SHA. There is no overwrite,
retarget, release-update, asset-delete, tag-delete or pruning path. Draft releases are storage,
not verification. Tag protection does not itself make release assets immutable: this code uses
exclusive names and digest/readback validation; privileged external deletion/change is an
availability/integrity failure and blocks ordinary deployment.

The recorded setup did not name an archive-key environment/secret. This checkpoint proposes
`production-archive` and `R4_ARCHIVE_APP_PRIVATE_KEY`; no live configuration is performed.
Public environment readback on 2026-10-18 confirms `production-archive` is absent. Before live
use, the owner must review/configure this isolated environment with exactly branch `main`,
no admin bypass, no per-release reviewer/wait timer, and securely provision the approved App
key there. Preparation checks both `production` and `production-archive` exist and have that
exact main-only policy before any archive job can start; absence or drift fails closed.
No key value was requested, generated, read or stored by this implementation session.

## Validation and review status

Local focused production/policy/archive tests and the complete operational integration suite
pass: **226/226 operational cases**. Formatting, Astro diagnostics, production build and reproducibility pass. The site-wide
368 browser tests were not rerun locally; GitHub `repository-health` is the authoritative full
gate. Exact final counts and CI identities are recorded in the PR/checkpoint report.

Initial local validation found sandbox browser-launch restrictions and a missing initial
`dist/` build prerequisite; these were resolved by appropriate runner permissions and building
before integration. Reproducibility was rerun independently of output-mutating recovery tests.
A focused regression reproduced loss of the hosted failed-stage detail; the corrected durable
receipt preserves the exact failure and partial check results.

Constitution compliance: maintenance-only change; no visitor content, accessibility,
performance or privacy behavior changes; explicit provenance, credential isolation,
proportionate regression coverage and verified recovery evidence. No exception requested.
Owner review remains required. Do not merge, dispatch production, or begin T036/T037 as part
of this checkpoint.

Implementation references: GitHub's official [release API](https://docs.github.com/en/rest/releases/releases),
[release asset API](https://docs.github.com/en/rest/releases/assets), and
[environment API](https://docs.github.com/en/rest/deployments/environments).
