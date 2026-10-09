# T005 third-attempt Preview hosting investigation

**Closeout, 2026-10-06**: T005 is complete from the preserved third-run authorization
matrix and successful fourth-run Preview lifecycle. The procedure/investigation below
is historical; do not rerun credential-bearing T005 commands. See
[acceptance closeout](checklists/acceptance.md#t005-completed-from-combined-owner-evidence--2026-10-06).
T001–T022 = 22/22; T023 remains unstarted.

The complete authorization matrix passed. The third run remains an overall failed runner
attempt because named-Preview served-package verification failed. Its original report is
preserved byte-for-byte at
[owner attempt 3](checklists/evidence/cloudflare-t005-owner-attempt-3-2026-10-04.json).

## Observed creation and cleanup

Preview name: `local-katpb-75e53dc285f5fe59cfdbdcb7cb5c0890c68100a6`.
The initial named-resource POST returned HTTP 200, its returned name matched, asset session/
upload returned HTTP 200/201, and the first deployment POST returned HTTP 200 with a valid
UUID. Thus both resource and deployment creation succeeded. The old `created: false`
flag represented successful served-package verification, not resource creation.
The resource then read back HTTP 200, deletion returned HTTP 200, and final absence was
HTTP 404 with code 10025. Cleanup is confirmed; no further deletion is required.
The live dashboard's selector shows **Create your first Preview**.

The saved diagnostic's last HTTP 404 is this successful cleanup absence response. The old
public fetch did not retain its HTTP or transport outcome separately, so the report cannot
prove that the public GET itself returned 404. The owner's reported served-package 404 is
recorded separately from that limitation. No raw logs, credentials or response bodies are
requested to reconstruct it.

## Hosting and URL defects

A signed-in dashboard readback confirmed preview-parent production workers.dev **on**,
Preview workers.dev **off**, and no custom domains or zone routes. Worker Previews needs
at least one enabled Preview host. For workers.dev-only hosting,
[Cloudflare requires explicit Preview URL enablement](https://developers.cloudflare.com/workers/previews/custom-domains/).

The runner ignored both provider-returned URL arrays and constructed:

```text
https://local-katpb-75e53dc285f5fe59cfdbdcb7cb5c0890c68100a6-katpb-dev-preview.katpb.workers.dev/
```

That first DNS label is **70 characters**, exceeding the 63-character limit. It cannot
be used as a verified provider endpoint. This and disabled Preview hosting are confirmed
defects; the exact public failure response/transport cause was not recorded and remains
unknown. The old resource/deployment URLs were discarded, then both were deleted, so
actual returned URLs cannot now be recovered from the sanitized file or empty dashboard.
The inferred URL above is explicitly **not** evidence of a returned stable URL. No unique
deployment URL is inferred from a deployment ID.

## Later configuration adjustment

Only `katpb-dev-preview`'s workers.dev Preview toggle was enabled through the existing
signed-in dashboard, and the settled switch readback confirmed **on**. Its normal
workers.dev production toggle remained **on**. Independent readbacks confirmed production
and acceptance normal URLs **on**, Preview URLs **off**, and no domains/routes on either.
No tokens, DNS, nameservers, routes, domains or certificates were changed. Historical T004
observations showing disabled Preview URLs remain unchanged.

Policy now records per-target `workersDev`/`previewUrls`. Generated trusted Wrangler
configuration explicitly has `workers_dev: true`, `preview_urls: true` and `previews: {}`
for the preview parent; production/acceptance explicitly retain `preview_urls: false`.
Policy/config validation and T005 live baseline/final/preview-host readbacks fail closed
if required enablement is missing or wrong. The
[required previews block](https://developers.cloudflare.com/workers/previews/configuration/)
can be empty. [Worker Previews requires Wrangler 4.135.0+](https://developers.cloudflare.com/workers/previews/);
installed/project-pinned 4.147.0 satisfies this. Direct REST T005 invokes no Wrangler.

The new sanitized lifecycle evidence separates resource creation, deployment records,
provider-returned stable/unique URL arrays, public GET status/pass and cleanup. It fetches
only exact validated API-returned values using the provider's slug, never a constructed
fallback. New owner-run names use 32 random hex characters, giving a 62-character DNS
label even when the provider retains the name as its slug. Historical 40-hex names remain
in their original reports. Missing URLs fail safely and cleanup still runs. Full matrix evidence is gated
and preserved for a focused lifecycle retry with three fresh baseline/final checks.

[The exact focused fourth owner command](t005-owner-run.md) is prepared, not executed.
[Structured configuration adjustment and investigation](checklists/evidence/cloudflare-t005-preview-host-adjustment-2026-10-04.json)
records live readbacks, evidence limits, generated configuration and regression validation.
T005 is unchecked, PR #4 draft, T023 unstarted.
