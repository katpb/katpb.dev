# Contract: R4 Developer and Operator Commands

These are commands to implement, not commands already available at planning time. R1 commands
retain their existing behavior. All R4 wrappers support `--help`, reject unknown/ambiguous inputs,
return nonzero on failed stages, and print source, target, outcome, and next action without secrets.

## Command surface

| Command                                                                             | Required behavior                                                                                                                 |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `npm run verify`                                                                    | Existing complete offline-capable repository gate, including added operational tests; no deployment/network check.                |
| `npm run release:prepare -- --source-sha <sha>`                                     | From successfully verified clean source, package `dist/` into `.deploy/`; no upload or source mutation.                           |
| `npm run deploy:preview -- --name local-<owner>-<source-sha> --package <directory>` | Validate supplied prepared source/output and explicit preview-only target, deploy named preview, run hosted smoke, record result. |
| `npm run deploy:verify -- --url <https-url> --manifest <path>`                      | Validate provider host and actual hosted bytes/headers/404/TLS against a hash-validated prepared manifest; no upload.             |
| `npm run deploy:production -- --source-sha <current-main-sha>`                      | Dispatch trusted GitHub main workflow, follow/wait for result; never invoke local provider production upload.                     |
| `npm run deploy:recover -- --archive-id <verified-id>`                              | Dispatch authorized recovery on main and follow result; no local production credential required.                                  |
| `npm run deploy:reconcile -- --deployment-id <id>`                                  | Dispatch recorded examination of unresolved production attempt on main.                                                           |
| `npm run deploy:cleanup -- --name local-<owner>-<source-sha>`                       | Delete only the explicit local preview name under preview parent; never a Worker or production target.                            |

`release:prepare` verifies successful validation evidence for the exact clean source and raw
manifest; a user-supplied SHA or an old `dist/` is insufficient. If evidence is absent/stale it
runs required validation or fails with the exact verification command. Preserve unrelated local
changes; do not reset/delete them to establish eligibility. Dirty preview source fails with
commit-or-separate-checkout guidance so its deployed identity remains attributable.

Local preview deployment runs candidate build/checks before credentials enter the provider
process. Use deployment scripts/tooling from a separate clean protected-main control checkout
when inspecting arbitrary candidate source. Do not execute an untrusted package script with
provider credentials in its environment. The README procedure must make this separation executable.

## Inputs and setup

| Input                                    | Source and rules                                                                                                                                                     |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node/npm/dependencies/browsers           | R1 `.nvmrc`, package metadata, lockfile, and browser installation.                                                                                                   |
| `CLOUDFLARE_ACCOUNT_ID`                  | Non-secret account identifier validated against trusted policy.                                                                                                      |
| `CLOUDFLARE_API_TOKEN`                   | Only the short-lived provider subprocess receives it, supplied by protected environment or secure local token source; never command-line argument, Git file, or log. |
| Worker names/host allowlists             | Non-secret `hosting/policy.json` plus environment account/subdomain values; refuse production through preview wrappers.                                              |
| `GH_TOKEN` or authenticated `gh` session | Write-authorized GitHub dispatch for local production/recovery; separate from provider credentials.                                                                  |
| Source SHA/run/archive IDs               | Explicit parameters validated against GitHub independently.                                                                                                          |

One-time owner setup creates the two normal delivery Workers and the separate non-production
assets-only acceptance Worker required by the controlled failure/recovery strategy, issues separately scoped Editor tokens, creates
main-only environments, activates main/archive rulesets and records readiness. Owner/admin audit
records complete ruleset state, bypass actors and GitHub revision timestamps; runtime read-only
checks require unchanged audited state and fail closed until a new audit after drift. No
Administration-write credential is stored in CI. Main requires PRs
and passing CI with no direct/force pushes, deletion or general bypass. CODEOWNERS documents
ownership; independent/code-owner approval is non-blocking while solo and becomes required
when a second trusted maintainer is added.
No Admin, zone DNS, or zone route token is retained in CI. Test named-preview create/update/delete
with the scoped token; handle a cleanup-permission limitation explicitly.

For T005 controlled local tests, the owner-approved secure credential source is 1Password CLI:

| Credential | Secret reference                                | Only authorized Worker |
| ---------- | ----------------------------------------------- | ---------------------- |
| Production | `op://katpb-dev/katpb-r4-production/credential` | `katpb-dev-production` |
| Preview    | `op://katpb-dev/katpb-r4-preview/credential`    | `katpb-dev-preview`    |
| Acceptance | `op://katpb-dev/katpb-r4-acceptance/credential` | `katpb-dev-acceptance` |

These are references, never resolved values. Assign only the needed reference to
`CLOUDFLARE_API_TOKEN` for each `op run -- <trusted-provider-subprocess>` invocation, with
normal output masking enabled. Only that short-lived trusted provider subprocess receives
the resolved credential. Do not start Codex, candidate code, build/validation scripts or
browser checks under the resolved-token environment. Never use `op read`,
`op item get --reveal` or `--no-masking`; never print, copy, serialize or log values into
arguments, source, plaintext `.env` files, generated files, evidence or chat. The provider
subprocess uses the credential only for the approved Cloudflare API authentication.
The owner handles desktop/Touch ID prompts. If CLI access or narrow provider permission
is insufficient, stop and record the actual error without exposing values or broadening
permissions. This secure source satisfies the existing credential boundary; it grants no
exception to source/target validation, trusted packaging, main-only environments or approvals.

The acceptance Worker is used only for controlled provider/failure/recovery exercises,
isolated from production and normal PR previews, with its own Worker-only credential and
explicit allowlisted test binding. Record the secure credential source and authorization
boundary before use; never use production/normal-preview tokens or redirect their ordinary
jobs. Use provider HTTPS addresses only, no `katpb.dev` custom domain or DNS/nameserver
changes. It is not an application/runtime environment or part of public launch topology.

## Provider invocation contract

Resolve the pinned local Wrangler CLI directly; do not use a network-fetching `npx` fallback.
Arguments are arrays passed without shell evaluation. Provider configuration is generated from
trusted control code into a clean directory, never copied from a candidate archive.

Preview create/update uses `wrangler preview --config <trusted-config> --worker-name
<preview-parent> --name <validated-name> --tag <source-sha> --message <attempt-id> --json
--ignore-base-config`. Parse typed provider JSON and validate returned stable/unique HTTPS URLs.

Production uses `wrangler deploy --config <trusted-config> --name <production-worker> --tag
<source-sha> --message <attempt-id>` only inside the trusted authorized workflow. Capture the
provider version and expected hostname using pinned CLI output/API metadata; never infer success
from a substring in output. Native provider rollback is not the normal recovery command.

Cleanup uses `wrangler preview delete --config <trusted-config> --worker-name <preview-parent>
--name <validated-name> --skip-confirmation`. No preview list/get CLI is assumed; use stored
GitHub records and narrowly scoped provider queries when reconciliation needs them.

## Network and failure contract

After initial dependency/browser setup, R1 build/verify and local packaging remain offline.
GitHub lookup/dispatch, provider upload, hosted checks, and archive retrieval require network.
Use bounded timeouts and redact tokens/authorization headers from diagnostics. Do not dump
process environments or credential files. Secure rotation replaces an environment/local token,
tests its scope, then revokes the predecessor; revocation blocks deployments without deleting
known-good output or exposing secret values.

Missing/invalid credentials fail before a mutation when determinable. An interrupted upload
reports unresolved served state and the recorded archive/deployment ID. Hosted mismatch reports
expected/observed non-secret revision and failed resource. Dispatch reports both workflow URL
and final verification result; it may never call submission of a dispatch verified deployment.
If interrupted locally, the recorded workflow ID provides a follow-up path.

No R4 command changes DNS, activates a custom domain, edits hosted files, or declares public launch.
