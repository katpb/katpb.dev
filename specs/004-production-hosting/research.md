# Research: R4 — Production Hosting

**Date**: 2026-10-02 | **Scope**: Planning decisions; no infrastructure has been provisioned or deployed.

## 1. Preserve the R1 build and add a deployment package

**Decision**: Keep Node 24.21.0, npm 11.x, the existing lockfile, Astro static output, and
`npm run verify`. Add exactly pinned Wrangler 4.147.0 as a development dependency during
implementation, with license, install-script, transitive dependency, and advisory review.
Registry metadata checked during research reports Node >=22, compatible with R1.

**Rationale**: Wrangler supplies the official asset upload and preview commands. A separate,
ignored `.deploy/` package holds deployment metadata, headers, retained assets, and generated
configuration; `dist/` remains the reproducible R1 artifact. Provider commands use the installed
binary and never download a newer CLI at invocation time.

**Alternatives considered**: An Astro Cloudflare adapter introduces unnecessary server output.
Direct asset-upload API implementation duplicates Wrangler. A global or floating CLI weakens
reproducibility. Cloudflare Pages conflicts with the specified host.

Sources: [Wrangler installation](https://developers.cloudflare.com/workers/wrangler/install-and-update/),
[Wrangler registry metadata](https://registry.npmjs.org/wrangler/4.147.0), and the
[R1 build contract](../001-project-foundation/contracts/build-artifact.md).

## 2. Static hosting and isolated previews

**Decision**: Preprovision two Workers, proposed names `katpb-dev-production` and
`katpb-dev-preview`. Deploy assets only, without a Worker script, adapter, or backend binding.
Use `workers.dev` addresses with no routes or custom-domain entries. Named Worker Previews
under the preview Worker use `pr-<number>`; local previews use an explicit `local-<owner>-<source-sha>`.
Capture both the stable preview URL and unique deployment URL from provider output.

These two Workers form the normal delivery topology. The failure/recovery strategy in
`quickstart.md` section 7 additionally requires a separate non-production assets-only
acceptance Worker for controlled exercises only. Its provider-only addressing, isolation
from production/normal PR previews, acceptance-only scoped credentials, and exclusion from
application/runtime environments and public launch are defined in `plan.md` under
“Controlled acceptance target”; no `katpb.dev` custom domain or DNS/nameserver changes apply.

**Rationale**: Worker Previews provide a separate review destination with a stable name and
revision-specific address. The production target remains a different Worker. The documented
minimum preview CLI is 4.135.0; the selected pinned version exceeds it.

**Alternatives considered**: A Worker per PR requires creating Workers with broader privileges.
Legacy version URLs share production version history and are unnecessary for isolated previews.
Provider-integrated builds duplicate GitHub orchestration and its validation/reporting boundary.

Sources: [Static Assets](https://developers.cloudflare.com/workers/static-assets/),
[Preview setup](https://developers.cloudflare.com/workers/previews/get-started/),
[Preview configuration](https://developers.cloudflare.com/workers/previews/configuration/), and
[Worker Previews](https://developers.cloudflare.com/workers/previews/).

## 3. Scope provider credentials to existing Workers

**Decision**: Use separate account-owned API tokens with Editor scope on only the production
Worker or only the preview Worker; controlled exercises use a separate acceptance-Worker-only
token with the same narrow permission principle. Store CI tokens only in protected GitHub environments. Tokens
receive no DNS or zone-route permissions. The owner performs one-time Worker creation before
issuing scoped tokens; CI does not receive creation/deletion privileges.

**Rationale**: Current Workers authorization documentation supports individual-Worker scope;
Editor can deploy existing Workers but cannot create or delete them. Local preview credentials
must have the same preview-only boundary. CI production credentials are not needed locally.
Verify permission support for named previews in a controlled provider test before acceptance.

**Alternatives considered**: Account-wide legacy Workers edit tokens widen the blast radius.
Interactive OAuth is unsuitable for unattended, narrowly scoped automation. Separate accounts
are unnecessary when tested per-Worker authorization provides isolation.

Source: [Workers roles and permissions](https://developers.cloudflare.com/workers/authorization/workers/).

## 4. Separate candidate execution from privileged orchestration

**Decision**: An unprivileged `ci.yml` validates explicit source SHAs on `pull_request` and
`push` to `main`. A default-branch `deploy.yml` handles `workflow_run` completion and explicit
main-ref dispatches. It fetches run and PR metadata independently through GitHub, consumes
only static files from the exact run's artifact, and executes deployment tools/scripts from a
pinned protected-main control revision in a clean runner.

**Rationale**: A successful build artifact is data, not executable deployment authority.
`workflow_run` can access secrets even after an unprivileged build; therefore PR source,
scripts, configuration, dependency installation, and caches must never execute in the
privileged workflow. Both deployment environments allow only the `main` workflow ref.
This also prevents same-repository PR YAML from asking for those environment secrets directly.

**Alternatives considered**: Building a PR with secrets in a single job, or checking out its
code in `pull_request_target`, permits credential exposure. Merely checking whether the PR
is a fork does not protect against same-repository workflow changes.

Sources: [Workflow events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows),
[Secure use](https://docs.github.com/en/actions/reference/security/secure-use), and
[Deployment environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments).

## 5. Serialize mutations and check current source eligibility

**Decision**: All automated deployment, recovery, reconciliation, and preview cleanup operations
share one non-cancelling workflow concurrency group, `r4-hosting`. Re-query the
live main tip or PR head immediately before provider mutation; stale ordinary candidates skip.
Recovery intentionally accepts an older protected-main ancestor after explicit authorization.
An unfinished previous upload blocks ordinary mutations until reconciliation or recovery.

**Rationale**: GitHub concurrency prevents simultaneous runners but does not establish commit
order. SHA eligibility checks reject old runs even when they acquire the lock later. Avoiding
cancellation in the upload/verification window reduces unknown served states.

**Alternatives considered**: Relying on queue order permits stale releases. Cancelling a running
upload can leave an unverified release live. A distributed lock service adds an unnecessary backend.

Source: [Concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency).

## 6. Keep durable archives and explicit verified receipts

**Decision**: Before each production upload, create a draft GitHub release in the
`r4-attempt-<run-id>-<attempt>` namespace at the selected source SHA, with the raw artifact,
prepared asset package, manifests, and a prepared receipt. Append an outcome receipt after
verification. Keep these archives without automatic deletion. A verified receipt, rather than
a release title or upload exit code, establishes known-good eligibility. GitHub Deployments and
Actions summaries provide reviewer status and links to the archive.

**Rationale**: Actions artifacts expire and cannot guarantee recovery after a quiet period.
Release assets provide durable complete output without adding application storage. Persisting
the prepared package before upload preserves newly exposed immutable assets even when a
candidate later fails verification. Receipts retain known-good evidence independently of
GitHub's deployment-status history and include the previous known-good archive ID.

**Alternatives considered**: Native rollback alone may restore a manifest missing assets from
newer HTML. Rebuilding every recovery adds dependency and historical-tooling failure modes.
Cloudflare R2 storage, runtime storage bindings, or a release database are unnecessary for this small site.

Sources: [Workflow artifacts](https://docs.github.com/en/actions/concepts/workflows-and-actions/workflow-artifacts),
[Release assets](https://docs.github.com/en/rest/releases/assets), and
[Deployment statuses](https://docs.github.com/en/rest/deployments/statuses).

## 7. Preserve immutable asset addresses across transitions

**Decision**: Every production package unions the selected release's static output with all
previously prepared immutable `/_astro/` assets. Only generated fingerprinted files receive
`public, max-age=31536000, immutable`; repeated paths must have identical bytes. HTML,
non-versioned files, and the release marker revalidate on every reuse. Do not retain old HTML
or old non-versioned files as current pages. Recovery restores selected raw output while
retaining the latest immutable asset union. No automatic pruning is included.

**Rationale**: Cached HTML can request earlier fingerprinted assets after a release or recovery.
Provider version retention and browser cache hits do not ensure those requests still succeed.
The union makes complete transitions explicit and testable. Reject asset collisions and
provider quota excess before upload; never silently delete an asset to make a deployment fit.

**Alternatives considered**: Replacing only the current `dist/` breaks old asset references.
Caching all files for a year prevents HTML freshness. A runtime asset router adds backend logic.

Sources: [Asset headers](https://developers.cloudflare.com/workers/static-assets/headers/),
[Static asset limits](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/), and
[Rollbacks](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/).

## 8. Treat hosted verification as a release gate

**Decision**: Verify the HTTPS URL with normal certificate validation, exact root-document
hash, a deterministic static `/__release.json` marker, local resource hashes and MIME types,
recursive CSS dependencies, no insecure requests, cache headers/revalidation, and a real 404.
Run browser readability and asset-request checks in a credential-free job. Verify stable and
unique preview addresses; production verification uses the actual served production address.

**Rationale**: Upload success cannot prove that the intended revision is being served.
The static marker provides revision identity without changing visitor UI or adding runtime code.
Bounded retries allow propagation while preserving a failing result when checks never pass.

**Alternatives considered**: A 200 response alone can verify an older revision or SPA fallback.
A dynamic health endpoint introduces an unnecessary service. Disabling TLS verification defeats
secure-delivery acceptance.

Sources: [HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/)
and [Static site routing](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/).

## Research result and setup dependencies

No unresolved design choice or constitution exception remains. Provider account capability,
scoped-token preview behavior, repository plan support for protected environments/rulesets,
locked dependency review, and real hosted timing are implementation/setup checks rather than
claims of completed acceptance. If a required capability is unavailable, record the blocker
and revise the design explicitly; do not silently broaden credentials or weaken gates.

`katpb.dev` was registered with Namecheap on 2026-10-03, as confirmed by the owner.
Domain ownership is satisfied. DNS and nameserver configuration, Worker custom-domain
routing, certificate activation, and public launch have not been performed. DNS and
active custom-domain routing remain unchanged and are intentionally deferred until
a separate explicit owner-approved cutover. Cloudflare zone status, existing DNS records,
and future certificate prerequisites still require read-only readiness inspection.
