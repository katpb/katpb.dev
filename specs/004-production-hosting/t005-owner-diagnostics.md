# T005 first-attempt investigation and diagnostics

**Closeout, 2026-10-06**: T005 is complete from the preserved third-run authorization
matrix and successful fourth-run Preview lifecycle. The procedure/investigation below
is historical; do not rerun credential-bearing T005 commands. See
[acceptance closeout](checklists/acceptance.md#t005-completed-from-combined-owner-evidence--2026-10-06).
T001–T022 = 22/22; T023 remains unstarted.

The first owner attempt exited 1 at `own production -> production`. All three initial
and final readbacks passed; no preview lifecycle started. The original sanitized file is
preserved, including its original lack of HTTP/error-code fields, at
`checklists/evidence/cloudflare-t005-owner-attempt-1-2026-10-04.json`.
Do not rerun the original command or change any token. T005 is unchecked; PR #4 stays
draft, and T023 is unstarted.

## Static findings

The original runner and provider hashes exactly match those in the owner report.
The short-lived provider received the resolved `CLOUDFLARE_API_TOKEN` through masked
`op run`, but the original allowlisted environment omitted `CLOUDFLARE_ACCOUNT_ID`.
The REST implementation nevertheless embedded the correct account explicitly in every
URL. This omission is fixed: the runner supplies
`CLOUDFLARE_ACCOUNT_ID=45dcbe7b47e04e1f41dc571ceb86b40e` and the provider fails before
any API request if the supplied value is absent/wrong.

The failing operation was:

```text
POST https://api.cloudflare.com/client/v4/accounts/45dcbe7b47e04e1f41dc571ceb86b40e/workers/scripts/katpb-dev-production/deployments
```

It selected existing version `0028456d-f204-4a33-a165-12203f2cc51c` at 100% traffic.
The production name and policy ID `1fe57381f57848dbb722225ef8949ea2` match
`hosting/policy.json` and the recorded signed-in issued-policy readback. A version ID is
distinct from the Worker/policy ID. Runtime checks now pin all three recorded Worker IDs.

This T005 implementation invokes the trusted Node subprocess and direct REST, **not
Wrangler**. Therefore no generated Wrangler config or Wrangler executable was involved
in the failure. Installed Wrangler is pinned to 4.147.0 and its version-deployment request
implementation uses the same endpoint/payload family; this is a static reference, not an
execution claim. The separate shared `provider.mjs` Wrangler path was not called.
No login/OAuth/account inference, Worker creation/deletion, route/custom-domain change,
automatic project configuration or account/product discovery request occurs on the own path.
Authentication uses only the single injected token in an HTTPS Bearer header.

The original `success(response, "authorization")` stored HTTP status for an unsuccessful
API response. The only subsequent `authorization` failure without a status was its local
assertion requiring a UUID-shaped response `id` and a matching response `versions` array.
Consequently the matching code/report strongly indicate an HTTP 2xx, `success: true`
response rejected by that local assertion, rather than a Cloudflare authorization denial.
The exact status, numeric error code and specific mismatched field were not retained and
cannot be recovered from the first evidence. Do not invent a 403 or assert token scope
is insufficient. Unchanged served bytes also do not establish that deployment history
was unchanged; the idempotent POST may have succeeded before the runner rejected its result.

## Diagnostic changes

Deployment-response failures now have their own stage, separate from authorization.
The parser accepts UUID or compact 32-hex deployment IDs and can corroborate an omitted
response versions array using an authoritative readback. It requires the newest deployment
ID to match the successful POST and requires the expected single version at 100%, then
compares the original settings, subdomain and served bytes. An unexpected ID, wrong
traffic/version, or mismatched readback still fails.

Fixed-schema diagnostics record operation, target name, recorded Worker/policy ID, direct
REST endpoint family/method, available HTTP status/numeric error codes, generated safe
category/message, provider/op exit codes, explicit account presence, token verification,
request phase and response-shape booleans. Unknown raw provider text is discarded, not
redacted heuristically. Authorization headers, token values/IDs, environment dumps, raw
response bodies and verbose/debug output never enter evidence.

Future provider tests verify the account-owned token before Worker requests. A verification
failure has stage `token-verification` and stops before deployment; it is not counted as
a Worker authorization denial or evidence that account-wide permissions are needed.

## Read-only owner diagnostic

This separate mode performs **only** the account-owned token verification request:
`GET /accounts/45dcbe7b47e04e1f41dc571ceb86b40e/tokens/verify`.
It does not enter the mutation runner or start T023. Run manually from the normal VS Code
integrated terminal if you choose to collect this non-mutating evidence:

```sh
cd /Users/kathirprabhakaran/grepos/katpb.dev-r4
/usr/bin/env -u CLOUDFLARE_API_TOKEN -u NODE_OPTIONS -u NODE_DEBUG \
  /private/tmp/katpb-r1-node-runtime/node_modules/node/bin/node \
  scripts/hosting/t005-owner-run.mjs \
  --diagnose-production-ref 'op://katpb-dev/katpb-r4-production/credential'
printf 'T005 diagnostic exit status: %s\n' "$?"
```

It emits and saves only sanitized results to
`.deploy/evidence/t005-production-token-diagnostic.json`: active/inactive/unknown token
status, optional expiration/not-before metadata, HTTP status, numeric codes, safe category,
explicit-account presence and subprocess exit status. The token ID/value is omitted.
Active is a token-validity result, not proof of Worker deploy scope. Share only this
sanitized file and the exit status.

## Historical second mutation attempt — do not replay

The owner completed this command after the first response-shape correction. It is
preserved here as history, not a command to run again:

```sh
cd /Users/kathirprabhakaran/grepos/katpb.dev-r4
/usr/bin/env -u CLOUDFLARE_API_TOKEN -u NODE_OPTIONS -u NODE_DEBUG \
  /private/tmp/katpb-r1-node-runtime/node_modules/node/bin/node \
  scripts/hosting/t005-owner-run.mjs --second-owner-attempt \
  --production-ref 'op://katpb-dev/katpb-r4-production/credential' \
  --preview-ref 'op://katpb-dev/katpb-r4-preview/credential' \
  --acceptance-ref 'op://katpb-dev/katpb-r4-acceptance/credential'
printf 'T005 second-attempt exit status: %s\n' "$?"
```

The second path requires preserved first-attempt unchanged-state evidence and a successful
production verification-only diagnostic from the current provider/diagnostic code hashes.
It reruns baseline checks, preserves the original file, and writes a separate
`.deploy/evidence/t005-owner-run-second.json`. Those machine checks are prerequisites;
they do not replace reviewing/resolving the first response-shape cause. No credential-bearing
diagnostic or second mutation has been executed by Codex.

[Cloudflare's Workers roles](https://developers.cloudflare.com/workers/authorization/workers/)
explicitly grant Editor on the selected existing Worker the ability to deploy/update
versions and deployments. [Deployment API](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/deployments/methods/create/)
and [account-owned token verification](https://developers.cloudflare.com/api/resources/accounts/subresources/tokens/methods/verify/)
support the request families used here. No Admin/account-wide scope increase follows from
this first runner failure.

## Second attempt: expectation bug corrected for third owner run

The second report passed own production/preview/acceptance with HTTP 200 and matching
authoritative readbacks. It then recorded cross production → preview HTTP 403, active
source token, explicit account binding, deployment POST and phase during-deployment.
No numeric error code was retained. The obsolete `errors.every(code === 10000)`
assertion classified this expected denial as failure. The historical runner exited 1,
ran all final checks successfully, and never entered the preview lifecycle.

[The original second report](checklists/evidence/cloudflare-t005-owner-attempt-2-2026-10-04.json)
is preserved unchanged, including its failure and provider exit code 1. The corrected
provider treats a valid 403 denial envelope in that independently verified deployment
context as pass/denied-as-expected with exit 0; cross 2xx fails the security boundary.
No token changes follow from this harness bug. The current
[third owner command and target-preservation checks](t005-owner-run.md) write a separate
third report. T005 remains unchecked, PR #4 remains draft, and T023 is unstarted.
