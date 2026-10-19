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

## Reconciled first-attempt lock release

The first run's unresolved acknowledgement is reconciled separately in
[the evidence](checklists/evidence/t036-first-attempt-reconciliation.json).
Acceptance is knowingly at verified fixture A with source
`7682202a08e4ad2dea1b3a4312b4a06fecff9569`, raw digest
`910297067e19630b319b8735098d3dbd53d900683a8ad007f3cec49b379a1264` and package digest
`00b9443253af7ca84880c8a315cf3ddcc5f1683b0c195ae20a65ad9097a85bbc`.
Original `provider.json`, `final.json`, archive outcomes and incomplete
`evidence.json` stay unchanged. Reconciliation does not promote them to success.

PR #20 merged at `24af806c34fb6d9a51d2a20eec3dc6e3d15826ac` and its merge-SHA CI
passed. PR #19 has been rebased onto this correction. Before a fresh run, require
passing `repository-health` on the exact current PR #19 head and a clean checkout
containing that commit. Keep the owner execution boundary above.

The owner performs these steps from the original
`/private/tmp/katpb-r4-t036` checkout; Codex has not released the lock or run T036.

1. Reserve an exclusive window. Confirm the prior terminal run and all its
   provider/1Password child processes have exited and no Hosting/cleanup operation
   is queued, running or awaiting approval. The PID check below alone cannot prove
   child-process exit. If PID 3996 exists (including reuse by another process),
   stop and investigate; do not kill a process just to clear this check.
2. Confirm no acceptance mutation occurred since reconciliation. If one did, or
   identity is uncertain, repeat credential-free HTTP and browser checks against
   the **retained first-attempt manifest**, requiring the fixture-A identity above.
   Do not reset the Worker as a substitute for reconciliation. Confirm
   `production-archive` and `R4_ARCHIVE_APP_PRIVATE_KEY` remain absent.
3. Check all original attempt hashes against the separate reconciliation evidence.
   The snippet below also checks them, checks the exact retained lock and process
   exit, and moves the lock bytes into a newly created exclusive retention folder.
   It neither deletes evidence nor changes the old unresolved outcomes. Run this
   once in the owner terminal, with Node 24.21.0:

   ```sh
   cd /private/tmp/katpb-r4-t036
   node --input-type=module <<'JS'
   import fs from "node:fs";
   import { createHash } from "node:crypto";
   const e = JSON.parse(fs.readFileSync(
     "specs/004-production-hosting/checklists/evidence/t036-first-attempt-reconciliation.json"
   ));
   const hash = bytes => createHash("sha256").update(bytes).digest("hex");
   const check = value => { if (!value) throw Error("Stop: reconciliation/lock differs"); };
   check(process.versions.node === "24.21.0");
   for (const [name, expected] of Object.entries(e.originalAttempt.fileSha256))
     check(hash(fs.readFileSync(e.originalAttempt.path + "/" + name)) === expected);
   const bytes = fs.readFileSync(e.retainedLock.path);
   check(hash(bytes) === e.retainedLock.sha256);
   const lock = JSON.parse(bytes);
   check(lock.pid === 3996 && lock.sourceSha === e.originalAttempt.controlSha);
   let exited = false;
   try { process.kill(lock.pid, 0); }
   catch (error) { if (error.code === "ESRCH") exited = true; else throw error; }
   check(exited);
   const retained = ".deploy/t036-first-attempt-reconciled-lock";
   fs.mkdirSync(retained); // Exclusive; an existing folder stops a repeat.
   fs.renameSync(e.retainedLock.path, retained + "/t036-owner.lock");
   check(hash(fs.readFileSync(retained + "/t036-owner.lock")) === e.retainedLock.sha256);
   fs.writeFileSync(retained + "/release.json", JSON.stringify({
     releasedAt: new Date().toISOString(),
     reason: "Independent fixture-A reconciliation; shared acknowledgement fix merged and CI passed",
     originalLockSha256: e.retainedLock.sha256,
     originalAttempt: e.originalAttempt.path
   }) + "\n", { flag: "wx" });
   console.log("Retained original lock bytes; local exercise lock released. No provider mutation.");
   JS
   ```

4. Only after those checks and lock retirement, from this clean corrected PR #19
   checkout with Node 24.21.0/npm 11.21.0 and installed pinned browsers, the owner
   may start a **fresh** attempt:

   ```sh
   node scripts/hosting/t036-owner-run.mjs --run
   ```

The fresh attempt creates a new `.deploy/t036-<time>` namespace and runs all cases
from the beginning. It will deliberately upload fixtures as part of the approved
matrix; it does not resume or overwrite the original unresolved transaction.
On a new failure retain the new lock and evidence and reconcile again. T036 stays
pending until the full live matrix passes. Keep production archive/key absent;
do not start T037.
