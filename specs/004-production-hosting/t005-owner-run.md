# T005 focused owner-run Preview lifecycle

**Closeout, 2026-10-06**: T005 is complete from the preserved third-run authorization
matrix and successful fourth-run Preview lifecycle. The procedure/investigation below
is historical; do not rerun credential-bearing T005 commands. See
[acceptance closeout](checklists/acceptance.md#t005-completed-from-combined-owner-evidence--2026-10-06).
T001–T022 = 22/22; T023 remains unstarted.

The third owner run proved all three own updates, all six expected cross denials,
twelve target-state checks and three final base checks. Only named-Preview lifecycle
remains pending. Its resource and first deployment were created, but package verification
failed; deletion and API absence were confirmed. All historical reports remain unchanged.
See [the hosting investigation](t005-preview-hosting.md).

Run only from the normal VS Code integrated terminal. Codex must not execute this
credential-bearing command. No token or 1Password configuration change is needed.

## Exact next owner command

```sh
cd /Users/kathirprabhakaran/grepos/katpb.dev-r4
/usr/bin/env -u CLOUDFLARE_API_TOKEN -u NODE_OPTIONS -u NODE_DEBUG \
  /private/tmp/katpb-r1-node-runtime/node_modules/node/bin/node \
  scripts/hosting/t005-owner-run.mjs --preview-lifecycle-only \
  --production-ref 'op://katpb-dev/katpb-r4-production/credential' \
  --preview-ref 'op://katpb-dev/katpb-r4-preview/credential' \
  --acceptance-ref 'op://katpb-dev/katpb-r4-acceptance/credential'
printf 'T005 preview-lifecycle exit status: %s\n' "$?"
```

Keep this run exclusive: do not change the Workers or run another provider mutation
while it runs. Approve the existing desktop/Touch ID prompts. After completion, display
only the sanitized evidence:

```sh
cat .deploy/evidence/t005-preview-lifecycle-fourth.json
```

## Trusted execution and prerequisites

Only the three exact references above are accepted, never token values. The parent is
credential-free and starts one masked invocation per operation:
`op run --no-masking=false -- <trusted Node provider subprocess>`.
Each minimal environment contains exactly one reference and explicit
`CLOUDFLARE_ACCOUNT_ID=45dcbe7b47e04e1f41dc571ceb86b40e`. Other references/auth variables,
OAuth/login state, debug hooks and proxy settings are not inherited. The resolved token
is confined to that short-lived provider, removed from its environment entry immediately,
and held only in memory for HTTPS API authentication. It launches no children and records
no token values/IDs, Authorization headers, environment dumps, raw API bodies or CLI logs.
Raw op stderr is discarded; stdout must pass the fixed sanitized schema.

The focused mode pins the third report's hash and validates every own/cross/pre/post/final
result and successful cleanup before resolving a credential. It references that historical
matrix and does not rerun authorization mutations. Seven sequential subprocesses run on
success: three fresh baselines, one preview-only lifecycle, and three final base checks.
Each independently verifies the account-owned token first. The production and acceptance
references are used only for their own read-only base checks.

Live Preview URLs were disabled on the preview parent. The owner-authorized dashboard
adjustment enabled only that Preview switch; normal workers.dev URLs remain enabled on
all three Workers. Production/acceptance Preview URLs remain disabled. No domain, route,
DNS, nameserver or certificate was changed. Historical T004 disabled observations remain
unchanged. The fourth run establishes a fresh baseline including this intentional host
adjustment, and fails before mutation if the preview-parent host is not enabled.

The trusted policy and generated Wrangler configuration explicitly set `workers_dev: true`
and `preview_urls: true` only for the preview parent. Its required `previews: {}` block
is present. Wrangler 4.147.0 is pinned and exceeds the Worker Previews minimum 4.135.0.
T005 itself uses direct REST from trusted built-ins, not Wrangler or automatic project
configuration. [Preview configuration requirements](https://developers.cloudflare.com/workers/previews/configuration/)
and [workers.dev hosting requirements](https://developers.cloudflare.com/workers/previews/custom-domains/)
explain the host/block requirements.

## Controlled operations and sanitized output

All seven public resources must match the non-secret T004 manifest pinned in
`hosting/t005-baseline.json`, with expected version, zero bindings, compatibility date,
settings/subdomain digests and per-target URL enablement. Every final check compares its
fresh baseline and all served package bytes. No base Worker is deleted or redeployed.

A fresh random `local-katpb-<32 random hex>` named Preview must first be confirmed absent.
It is created with `ignore_base_config=true`, then receives two distinct fixed HTML-only
packages, each under 1 KiB, with a trusted noindex/nosniff headers module and no runtime
code, bindings, candidate source or external dependencies. Upload JWTs stay in memory.

The runner fetches the exact validated `resource.urls` and `deployment.urls` values.
It uses the provider-returned slug and deployment ID only to constrain HTTPS, account/Worker,
DNS label length and deployment identity. It never constructs a fallback hostname. Empty,
wrong-account/Worker, credential-bearing, query-bearing, path-bearing or unsafe URLs fail
closed and trigger cleanup. Both stable and unique deployment URLs must serve the expected
bytes with noindex headers, and the latest deployment ID must match the upload. Resource
creation, deployment creation, served checks and cleanup are separate evidence fields.

Only this newly created Preview is deleted, including on failure after a possibly
successful create, and API absence is checked. Normal parent settings/domains/routes stay
unchanged. Example sanitized success output:

```text
PASS baseline production
PASS baseline preview
PASS baseline acceptance
PREVIEW resource-created=true
URL stable <validated provider-returned URL>
URL create-deployment <validated provider-returned URL>
URL update-deployment <validated provider-returned URL>
PASS served GET <validated provider-returned URL> HTTP 200
PASS preview create
PASS preview update
PASS preview delete
PASS final production
PASS final preview
PASS final acceptance
PASS T005 owner tests; T023 not started
Sanitized evidence: .deploy/evidence/t005-preview-lifecycle-fourth.json
T005 preview-lifecycle exit status: 0
```

A complete success exits 0; unexpected behavior exits nonzero. The JSON contains only
non-secret timestamps, code/policy hashes, roles, verified URLs, deployment IDs/digests,
pass/fail stages, token activity metadata, explicit-account binding, API status/codes and
public fetch results. Public-fetch status is separate from the expected cleanup 404.

## Failure, local lock and evidence handoff

A previous report is never overwritten. The local `.deploy/r4-hosting.lock` serializes
owner runs. If cleanup/final state cannot be proven, or a mutation subprocess is uncertain,
the lock is retained and unresolved state is reported. Do not delete that lock or rerun
mutations until the sanitized results have been reviewed and the recorded preview/base
state reconciled. Resolve any uncertain subprocess before removing only the empty
reconciled lock directory; unknown state is never grounds for deleting a lock. Ctrl-C
stops additional tests while allowing the current subprocess to finish cleanup. A hard
termination cannot guarantee cleanup.

After attempt three, the report proved delete HTTP 200, absence HTTP 404/code 10025 and
all final base states. The dashboard has no named Preview. There was no retained lock or
temporary attempt evidence; no lock/evidence was deleted. No additional cleanup is needed.

Share only the sanitized fourth report and exit status. Codex will combine new lifecycle
results with the preserved third authorization matrix and existing non-secret policy/
environment/recovery-review evidence. T005 remains unchecked until the remaining live
lifecycle passes and evidence is reviewed. PR #4 remains draft; T023 is unstarted.
