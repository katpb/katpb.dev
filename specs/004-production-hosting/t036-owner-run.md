# T036 isolated acceptance observations

Status: harness prepared; **live owner observations pending**. T036 remains unchecked.
T037 has not started. Keep `production-archive` absent and do not configure
`R4_ARCHIVE_APP_PRIVATE_KEY` during this exercise or its corrective merges.

PR #18 merged at `dcb4f44b10cadeaae5199cd0451ee7ce74a5df1f`. Its reviewed tree is
unchanged. Protected-main `repository-health` passed, including 368 browser and
230 integration tests. The automatic Hosting run stopped in production resolve;
every archive/provider/reporting job skipped. The authenticated environment and
release inventories and public tag inventory were empty for production archives.
All seven public production files matched the historical October 15 pre-merge
baseline. This is the expected pre-activation stop, not a served-state failure.
See [recorded observations](checklists/evidence/t036-postmerge-preactivation.json).
The runner's existing log is generic: it does not emit a specific environment
error/receipt. Classification rests on the independent absent-environment readback,
resolve-stage stop, missing context/artifacts and skipped downstream jobs.
A credential-free GET-only replay of the unchanged merged preflight validator
accepted the existing production environment/policy and then rejected the absent
archive environment at HTTP 404. That replay performed no writes.

## Execution boundary

The existing [secure owner execution boundary](contracts/developer-commands.md)
continues to apply: “Do not retry credential-bearing tests from Codex.” The owner
runs this procedure from the normal integrated terminal and handles 1Password
Desktop/Touch ID. Codex receives only sanitized evidence. This is a new T036
exercise; do not rerun T005, export tokens, use `op read`, create another credential,
change environments, or grant broader permissions.

The only reference used is `op://katpb-dev/katpb-r4-acceptance/credential`.
The credential-free parent invokes masked `op run` for a short-lived trusted
provider child. That child pins the account, Worker name and Worker ID to
`katpb-dev-acceptance`; the existing provider helper generates assets-only config
with Preview URLs disabled. No production or preview credential is referenced.
The parent rejects inherited credential variables. Builds, fixture packaging,
archive tests, HTTPS and Chromium/WebKit checks receive no resolved token.
Only schema-validated provider IDs, fixed URL and rejection status leave the child.
Raw provider/1Password diagnostics are discarded.

## Controlled transport and limits

The fixtures are synthetic static HTML/CSS, labelled as acceptance fixtures. Their
schema-compatible test validation records are **not real CI eligibility evidence**
and cannot authorize production. Source SHA identifies the harness control commit.
They pass through the merged `prepareRelease`, archive bundle/readback,
`mutateProduction`, `verifyProduction`, `recordProduction`, and
`productionHistory` functions without changing those production functions.

Archive faults use an append-only, file-backed API substitute under `.deploy`.
Tags/releases/assets in that substitute are local test objects, not GitHub writes.
It stores actual bundle/manifest/prepared/outcome bytes and verifies re-downloads.
This exercises transaction semantics under archive quota, corruption, prepared
receipt corruption, append failure and readback unavailability. It does not claim
live GitHub App authentication, ruleset enforcement, GitHub quota exhaustion or
production archive persistence was exercised. Those remain unavailable until the
separately approved archive activation; T032 authority regression evidence remains
distinct from these T036 transport faults.

Real provider observations are acceptance-only uploads, a deliberately invalid
acceptance version deployment rejected by Cloudflare, and a controlled lost
acknowledgement after a real upload. The latter is not a claim of an interrupted
Cloudflare server write. Separate controlled HTTPS/browser failures prove that
uploaded output alone cannot become verified success. Normal HTTPS and all four
Chromium/WebKit mobile/desktop projects run credential-free for success.

Two overlapping controlled requests deliberately finish the newer transaction
before the older caller obtains its turn. Archive preparation occurs serially,
the older freshness gate rejects it with zero provider calls, and history must
distinguish newest prepared from current/previous verified. This is controlled
queue/freshness evidence, not a claim that concurrent GitHub workflow executions
were launched or that the workflow lock was modified.

## Owner procedure

1. Use the reviewed, committed T036 branch with Node 24.21.0 and npm 11.21.0,
   locked dependencies and installed pinned Chromium/WebKit. The working tree must
   be clean. Do not put tokens in the terminal environment or command arguments.
2. Reserve an exclusive exercise window: no preview/deploy/cleanup requests or
   other acceptance runs. The runner checks active Hosting/cleanup runs before
   each provider operation, and uses an exclusive local lock. These read checks
   do not atomically acquire GitHub's workflow lock; maintain the reserved window.
3. From the clean checkout run:

   ```sh
   node scripts/hosting/t036-owner-run.mjs --run
   ```

4. The runner first proves the archive environment is absent and all seven public
   production baseline files match. It repeats production hashes after each
   provider operation. It uploads fixture A, requires HTTPS/browser and durable
   local verified receipt, then runs the fault matrix. Each fault has a separate
   local archive namespace with the original verified A receipt preserved byte
   for byte. An unresolved branch must block ordinary mutation. Before moving to
   a separate experiment, the runner observes actual served identity and performs
   an explicit acceptance-fixture reset to A, with HTTPS/browser checks. This is
   controlled experiment setup, not production recovery or T049 evidence.
5. A passing run finishes with checked fixture B on acceptance and prints the
   `.deploy/t036-<time>/evidence.json` path. Supply that sanitized JSON and
   `provider-observations.json` for review. Do not supply raw credential-bearing
   diagnostics. T036 completion requires `liveProvider`, `complete`,
   `productionPreserved`, and `productionArchiveAbsent` all true, all twelve cases
   present, actual provider IDs/rejection status, and no false verified success.
6. On any error, keep partial evidence and the local lock. Do not rerun blindly,
   remove an unresolved branch, or change credentials/environments. Reconcile
   actual acceptance marker/root/assets with the sanitized operation ledger first.
   Failed/unobserved cases remain pending. No production mutation is permitted.

After passing actual observations, update acceptance evidence and T036 only.
Stop for owner review. The remaining activation actions are: owner approves the
T036 evidence; owner creates `production-archive` with exact main-only policy and
administrator bypass disabled; securely installs the private key for approved
App 5176510; verifies policy and secret-name readback without exposing the key;
then explicitly authorizes T037 as the first real production release.
