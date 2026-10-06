# R4 implementation and acceptance evidence

**Window**: Owner-approved T001–T022 only, branch `004-production-hosting`, 2026-10-03.
**Status**: T001–T022 are complete: **22/22**, including T005. Main PR/integrity, archive-tag protections,
the single-repository archive App creation-only exception and main-only environments are verified.
Owner-audited/read-only drift checks remain effective; no Administration-write credential is in CI.
On 2026-10-04, T004 created/read back exactly three assets-only Workers in owner-confirmed account
`45dcbe7b47e04e1f41dc571ceb86b40e` / `katpb.workers.dev`, still Free $0. Their exact-package
HTTP checks and 192 credential-free hosted browser cases passed. Final local validation passed
368 browser cases, 34 operational tests and reproducible raw bytes at the bootstrap checkpoint.
T005 is complete from the preserved third authorization matrix plus fourth owner-run Preview
lifecycle. The approved Phase 1/foundation checkpoint is complete; full R4 story acceptance
remains pending. Final closeout validation/CI is recorded below. T023+ has not started.
Earlier dated observations below are historical evidence, not current completion claims.

## Prerequisites

| Prerequisite                                       | Status           | Evidence or required next check                                                                                       |
| -------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------- |
| Owner approval of T001–T022                        | Confirmed        | Explicit instruction in this implementation session                                                                   |
| R1 merged foundation                               | Locally verified | Exact merge SHA, ancestry and detached R1 full gate passed                                                            |
| Supported Node/npm and local gate                  | Locally passed   | Node 24.21.0/npm 11.21.0; current full gate passed                                                                    |
| Active GitHub main/archive/environment protections | Readbacks passed | Strict Actions repository-health binding, PR/integrity, archive creation-only exception, three main-only environments |
| Cloudflare Workers Free plan                       | Verified         | Signed-in Workers plans shows Free, $0, Current plan; no upgrade performed                                            |
| Three isolated assets-only Workers and Free quotas | Verified         | T004; production, preview parent, controlled acceptance only                                                          |
| Individual-Worker credentials and isolation        | Verified         | T005 third matrix + fourth lifecycle; separate Worker Editor tokens, approved 1Password source                        |
| `katpb.dev` ownership                              | Owner-confirmed  | Registered with Namecheap on 2026-10-03                                                                               |

## Observed evidence

### Starting repository

- Current branch: `004-production-hosting`; starting HEAD: `609d32526a43a5b85989b6405593f9728e03e4bc`.
- Existing working-tree changes: modified `ROADMAP.md` (R2 status); untracked `specs/004-production-hosting/`.
- Requirements-quality checklist: 16 checked, zero unchecked. This is a specification review result, not hosted acceptance.
- No `.specify/extensions.yml` exists; no implementation hooks apply.
- Baseline SHA-256 hashes for `src/`, historical R1 evidence, package/lock, Playwright configuration,
  ignore files and `ROADMAP.md` were saved outside the repository for preservation checks.
- macOS 27.0.1 (26A434), arm64; Node 24.21.0 and npm 11.21.0 from the existing pinned temporary toolchain.

### T001 local baseline — observed results

- Initial full `npm run verify` failed at formatting in the new acceptance record and R4 specification.
  Applied Prettier only to those two R4 documents; the specification change is heading-emphasis
  normalization, with no requirement change.
- Next attempt passed formatting/diagnostics/build, then stopped because port 4322 was occupied.
  Inspected PID 7474: the existing Astro preview ran from the sibling `katpb.dev` checkout.
  After approved temporary termination of that exact preview, the current checkout's full gate
  passed: zero Astro errors/warnings/hints, four routes, 368 Chromium/WebKit browser tests,
  two workflow tests and exact two-build path/SHA-256 equality for six generated files.
- Exact merged R1 revision: `6110fd835fbb94255ec12d97e428e9b7fab8bfdd` (PR #1 merge).
  It is an ancestor of current HEAD. The subsequent `0901037` completion commit changes only
  the roadmap; it does not change the R1 application. R1 package/lock files match the current
  pre-R4 dependency graph exactly.
- Verified R1 in a detached local clone at `/private/tmp/r4-r1-foundation-check` using the
  same already-installed locked dependency graph. The temporary dependency link is excluded
  locally from that clone's Git status; no dependency or source change entered the active checkout.
  Initial sandbox execution could not bind localhost; the authorized retry passed the full R1 gate:
  zero diagnostics, eight browser tests, two workflow tests and one reproducible generated file.
  [Complete R1 command output](evidence/r1-baseline-verify.txt).
- [Baseline raw output manifests](evidence/baseline-build-manifests.json) record the actual R1
  and current site generated paths, sizes and hashes. These are local observations, not CI
  equivalence or hosted acceptance. No provider credentials were supplied to either verification.

### R1-only acceptance procedure — T001 resolution

1. Pin candidate fixture source to the exact merged R1 SHA above in a separate detached checkout.
   Verify its tracked source/lockfile and run its complete credential-free gate with the pinned
   R1 runtime. Build and hash its own `dist/`; do not substitute current-main R2 output or edit
   either checkout's `src/`. The local baseline part has been observed as recorded above.
2. After reviewed R4 control code is available on protected main and all provisioning/authorization
   prerequisites pass, consume that R1 raw output as an explicitly selected acceptance fixture
   through the same trusted packaging/provider/HTTPS/browser/recording helpers. Use only the
   isolated acceptance Worker, its scoped credential, and isolated attempt/archive history.
   Record fixture source SHA, actual validation evidence and independently established control SHA
   separately. Candidate build/scripts never run with credentials. No fixture claim is eligible
   for ordinary production merely because it is a main ancestor.
3. Exercise actual provider delivery and failure/recovery against that R1-only fixture on the
   acceptance target; assert applicable ordinary-main/PR authorization rejection rules separately.
   This verifies hosting behavior does not require R2 and keeps existing main history intact.
   It adds no ordinary dispatch mode, historical production exception or permission bypass.
4. Exercise the automatic protected-main production workflow separately at current live-main SHA.
   Its R2 content proves compatibility with the same pipeline, not R1 independence. Production
   still requires exact current-main successful eligible CI and all active protections.
5. Keep hosted R1 independence, real protected-main automatic-release behavior, and local/CI
   reproducibility as separate outcomes. Do not mark FR-019/SC-003 accepted from the local R1
   baseline or a current-main R2 deployment alone. The specification's historical wording of
   a main release serving R1 cannot literally be replayed on today's main without replacing R2;
   this paired controlled-fixture/current-main procedure preserves both required behaviors and
   the owner-approved no-rewrite/no-source-change boundary. Hosted results remain pending.

### T002 initial GitHub capability inspection — historical blocked state

- The connected GitHub identity is `katpb`, but the connector's repository/branch/ruleset
  reads returned 404. Its active-branch-rules endpoint was rejected as unsupported. These
  API failures alone do not prove that repository protections are absent; the connector
  cannot currently provide the required independently authoritative deployment checks.
- Read-only native Brave inspection of the owner's signed-in repository confirmed
  `katpb/katpb.dev` is private, with main at `609d32526a43a5b85989b6405593f9728e03e4bc`.
- [Branches settings](https://github.com/katpb/katpb.dev/settings/branches) showed
  “Classic branch protections have not been configured”.
- [Rulesets settings](https://github.com/katpb/katpb.dev/settings/rules) showed no rulesets
  and explicitly stated that rulesets will not be enforced on this private repository
  until moving to a GitHub Team organization account. This is an observed capability
  blocker, not an assumption about the owner's billing tier.
- [Environment settings](https://github.com/katpb/katpb.dev/settings/environments) showed
  no deployment environments. Effective main-only restrictions, scoped environment
  secrets and recovery review protections are therefore not established.
- [Official ruleset availability](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository)
  describes availability by repository visibility and plan. No visibility, ownership,
  subscription, security policy or account setting was changed during inspection.

### Owner visibility change — verified on 2026-10-03

- The owner changed `katpb/katpb.dev` from private to public after the implementation stop.
  The repository metadata API now reports `visibility: public` and owner administration access.
- Repository, main-branch and ruleset API reads now succeed. Main remains at
  `609d32526a43a5b85989b6405593f9728e03e4bc`; the branch response reports `protected: false`,
  protection disabled and no required checks. The repository ruleset collection is empty.
- This clears the earlier private-visibility restriction and repository/branch/ruleset read
  failures. It does not establish active protections, archive authorization, deployment
  environment restrictions or T013 runtime checks. The connector's unsupported active-rules
  endpoint remains a tooling limitation to resolve before relying on those runtime checks.
- T002 remains unchecked. No protection, environment, credential, Cloudflare or DNS setting
  was changed by the agent. Implementation remains paused pending the owner's review;
  no T003 or later task has started.

#### Required T002 policy — historical proposal before the owner's solo-maintainer decision

- Main: active PR review plus code-owner review for control files; blocked force pushes and
  deletion; empty deployment-policy bypass list. Bind required `repository-health` with its
  expected GitHub Actions source at T022 after actual CI exists; no path-filter bypass.
- Archive namespace: protect `r4-attempt-*` against replacement/deletion, with creation limited
  to the narrowly authorized archive actor. Actor capability remains to be verified; no
  existing token is promoted to an archive authority.
- Deployment authorization: main-ref-only `preview`, `production` and `production-recovery`
  environments, no PR wildcard, separately scoped Worker credentials and recovery owner review
  where supported. No environment, secret or token has been created.
- Cloudflare: Workers Static Assets Free only, three approved assets-only targets, provider
  URLs only; verify the actual tier and Free quotas at T004 before provisioning. Unsupported
  Free capability blocks that path; billing, paid add-ons and broad permissions are forbidden.

### Previous window's final local validation and restoration

- Final full `npm run verify` passed after task/evidence reconciliation: formatting, strict
  Astro diagnostics, four-route build, 368 browser checks, two workflow checks and exact
  reproducibility of six generated files. [Full final command output](evidence/foundation-stop-verify.txt).
  The sandbox-only attempt failed to bind localhost; the authorized retry supplied local
  server/browser access. This is not provider/GitHub/hosted acceptance or an enforced-offline test.
- Preservation check passed for all 35 protected baseline files, including every `src/` and
  historical R1 file, package/lock, Playwright configuration, ignore files and the pre-existing
  `ROADMAP.md` contents. Only T001 is checked; all 62 task IDs remain sequential and T023 onward
  is unchecked. The five required evidence sections are present.
- The sibling checkout's original Astro preview was restored at `http://127.0.0.1:4322/`
  after final verification. No sibling source file was edited.
- User actions during this window: approved sandbox exceptions for process identification,
  temporary preview termination/restoration and local verification. No account upgrade,
  configuration change, Worker provisioning, token creation or other manual account action
  was requested or performed.

### T002 resumed setup — observed on 2026-10-03

- The owner instructed the agent to continue. The approved T001–T022 scope persists;
  T023 onward and domain cutover remain outside this window. The requirements checklist
  still has 16 checked items and zero unchecked items. No extension hooks exist.
- Repository API reads confirmed public visibility, owner administration access and unchanged
  main SHA `609d32526a43a5b85989b6405593f9728e03e4bc` before setup. The signed-in
  [collaborator settings](https://github.com/katpb/katpb.dev/settings/access) report zero
  collaborators: only `katpb` can contribute. The signed-in
  [app settings](https://github.com/katpb/katpb.dev/settings/installations) report no installed
  GitHub Apps. No collaborators, apps or credentials were added.
- Created and independently read back the following active rulesets. Every ruleset has
  `bypass_actors: []` and `current_user_can_bypass: never`.

| Ruleset                | ID       | Exact target             | Observed rules                                                 |
| ---------------------- | -------- | ------------------------ | -------------------------------------------------------------- |
| `r4-main-integrity`    | 24419712 | `refs/heads/main`        | Block deletion and force pushes                                |
| `r4-archive-immutable` | 24419675 | `refs/tags/r4-attempt-*` | Block updates, deletion and force pushes                       |
| `r4-archive-creation`  | 24419981 | `refs/tags/r4-attempt-*` | Block creation until an archive actor is explicitly authorized |

- The archive creation restriction is deliberately separate from immutability. A later
  approved actor can receive an exception to creation only; the independent update/deletion
  rules must retain an empty bypass list. Currently no actor can create matching tags, so
  this is protective setup, not evidence of a usable archive workflow. Tag rules protect Git
  refs; they do not make draft release assets immutable or prevent repository administrators
  from changing rules or deleting releases. The contract's archive-availability risk remains.
- Created the three deployment environments and read back exact branch policies. All use
  custom branch policies with exactly one `main` branch rule, no tag rule or wildcard;
  `can_admins_bypass` is false. The UI reports no secrets or variables in each environment.

| Environment           | ID          | Main branch-policy ID | Review requirement                           |
| --------------------- | ----------- | --------------------- | -------------------------------------------- |
| `preview`             | 23375413588 | 61852785              | No per-release manual approval               |
| `production`          | 23375504891 | 61852919              | No per-release manual approval               |
| `production-recovery` | 23375574659 | 61853140              | Required reviewer `katpb` (user ID 50702152) |

- Recovery uses owner approval as specified. `prevent_self_review` is false so the sole
  owner can initiate and approve a concrete recovery; administrator bypass is disabled.
  No recovery workflow or approval exercise exists yet. Configuration does not prove T005
  credential isolation or a successful recovery.
- Direct, credential-free GitHub REST reads of `/repos/katpb/katpb.dev/rules/branches/main`
  succeeded and returned the two actual integrity rules with ruleset ID 24419712. Direct
  ruleset detail and deployment environment/branch-policy reads also succeeded. This resolves
  B002's read-path limitation for this public repository without a broader credential.
  T013 still must implement pagination, validation and complete eligibility checks; these
  two integrity rules alone do not authorize deployment.
- [Raw GitHub setup readbacks](evidence/github-setup-2026-10-03.json) preserve ten successful
  public REST responses, three authenticated connector ruleset readbacks and the UTC observation
  time. Public ruleset responses omit bypass fields; the connector confirms the empty bypass
  lists and `current_user_can_bypass: never` independently. No provider or GitHub token was
  supplied to the public readbacks, and no credential value is retained in evidence.
  Restriction behavior with an actual CI/archive actor remains untested.
- No PR-review or code-owner-review rule was silently weakened. GitHub does not allow PR
  authors to approve their own PRs. With zero collaborators, the approved independent-review
  requirement cannot support owner-authored changes without another authorized reviewer.
  An owner choice between retaining that requirement and explicitly revising R4 for a solo
  maintainer is pending. No review-policy amendment has been made.
- The archive bypass chooser offered roles, deploy keys and built-in agents; searching for
  GitHub offered no matching app. No suitable installed archive actor was available. A
  dedicated app is a proposed resolution, not a provisioned credential or an assumed pass.
  Repository-admin/write-role bypass was not substituted.
- `repository-health` is still scheduled for T021/T022: create the real SHA-pinned `CI`
  workflow, observe its actual check and GitHub Actions integration identity, bind the exact
  required-check source, then verify enforcement. No nonexistent check is reported active.
- Official capability references:
  [rules and review semantics](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets),
  [PR authors cannot approve their own PRs](https://docs.github.com/en/enterprise-cloud@latest/pull-requests/how-tos/review-pull-requests/approving-a-pull-request-with-required-reviews),
  [deployment protection](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments),
  and [eligible bypass actors](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository).

#### Proposed archive actor — historical proposal, subsequently owner-approved

Propose an owner-controlled private GitHub App named `katpb-dev-r4-archive`, installed only
on `katpb/katpb.dev`, with repository Contents read/write and mandatory Metadata read access.
Leave Workflows, Actions, Administration, organization and account permissions ungranted;
disable webhook delivery and user OAuth/device-flow authorization. The homepage can be the
repository URL. No app, token or private key has been created or installed.

After owner approval and verified installation, add that app's independently read numeric
identity only to `r4-archive-creation`. Give it no main or archive-immutability bypass.
Contents write permits repository-content and release mutations; it is not a provider-side
permission limited to release assets. Protected-main validation, trusted archive code and the
separate immutable-tag rule remain necessary. An app would use short-lived installation tokens
in the future protected-main archive job, with its private key stored securely by the owner.
Credential entry/private-key handling and environment-secret setup remain separate explicit
owner steps; no credential should be pasted into chat or written into this evidence record.

This proposal uses GitHub's supported
[app registration](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app),
[selected-repository installation](https://docs.github.com/en/apps/using-github-apps/installing-your-own-github-app)
and [release permissions](https://docs.github.com/en/rest/releases/releases#create-a-release).
The release API documents extra Workflows permission for a target differing from main in
workflow files. Do not grant it implicitly: historical recovery and tag creation must be
exercised with the approved permission set, and any failure needs an explicit design correction.
App identity, actual scope and creation-versus-update/deletion behavior are pending observations.

#### Resume validation

- SHA-256 comparison with `/private/tmp/r4-implementation-baseline-hashes.json` passed for
  all 35 protected baseline files, including `src/`, historical R1 evidence, dependencies,
  test configuration, ignore files and the pre-existing roadmap contents.
- One-off assertions passed for all 13 recorded API responses: exact rules and targets,
  active enforcement, independently confirmed empty bypass lists, three exact main-only
  branch policies, disabled administrator bypass and the recovery owner-review setting.
  These assertions verify the configuration evidence, not actor/provider behavior.
- Repository-wide Prettier and Git diff whitespace checks passed. Only R4 task/evidence
  documents changed locally in this resume. The application full gate remains the prior
  window's observed result; it was not rerun for this documentation/account-setup change.

### T002 owner-approved policy and App registration — current observation

- The owner explicitly approved the solo-maintainer policy: all main changes through PRs,
  passing required repository-health checks, blocked direct/force pushes and deletion,
  and no general bypass. Independent second-human and CODEOWNER approval are non-blocking
  while `katpb` is the sole maintainer. Enable required independent and applicable code-owner
  approval when a second trusted maintainer is added. The spec, plan, tasks, quickstart and
  affected contracts were updated consistently; PR and CI requirements remain mandatory.
- Authenticated readback of `r4-main-integrity` (24419712) confirms active enforcement on
  exactly `refs/heads/main`, `pull_request` with zero required approvals, code-owner review
  false, deletion/non-fast-forward restrictions, and an empty bypass list. The current user
  cannot bypass. Archive immutability and creation rules retain their exact targets/rules
  and empty bypass lists at this observation. The real CI check binding remains T022;
  no deployment is eligible before that binding and all foundation gates pass.
- Created private, owner-controlled `katpb-dev-r4-archive`, App ID `5176510`. The registration
  and installation form show Contents read/write as the only optional permission; GitHub
  automatically adds mandatory Metadata read, which cannot be deselected. All other repository,
  organization and account permissions remain ungranted. Webhooks, user OAuth and device flow
  are disabled. No private key, client secret or installation token was generated or handled.
- The prepared installation form selects only `katpb/katpb.dev` (one selected repository,
  all-repositories off). It has not been submitted. The browser tool requires confirmation
  at the access-grant step even after advance approval; that action-time confirmation is pending.
  The approved creation-only archive exception will be added after installation and read back;
  main and archive immutability must retain empty bypass lists.
- [Current policy and registration readbacks](evidence/github-approved-policy-2026-10-03.json)
  preserve three authenticated ruleset responses and non-secret signed-in UI observations.
  The earlier snapshot above remains unchanged as historical evidence. No actor behavior,
  credential isolation or hosted acceptance is claimed from configuration readbacks.
- Current one-off evidence assertions passed: active exact main PR/integrity policy, zero
  required approvals/non-blocking code-owner review, empty bypass lists, approved App permission
  boundary and prepared single-repository selection. All 35 protected baseline hashes remain
  unchanged. Repository-wide Prettier and Git diff whitespace checks passed. The full application
  gate remains the previously recorded baseline; it was not rerun for documentation/settings.

### T002 completed setup and T003 ownership — current verified state

- The owner completed App installation and explicitly confirmed the pending creation-only
  exception. Signed-in installation settings at installation ID `167561083` show exactly one
  selected repository, `katpb/katpb.dev`, all-repositories off, Metadata read and Contents
  read/write only. No additional permission is shown. No credential was generated, read,
  printed or copied by the agent.
- Added App ID `5176510` as the sole `Integration` actor with `bypass_mode: always` on
  `r4-archive-creation` (24419981). That active ruleset contains only `creation` and targets
  only `refs/tags/r4-attempt-*`. The mode permits the App to create matching tags; it cannot
  exempt the App from rules in the other rulesets. Authenticated readbacks confirm main
  (24419712) and archive immutability (24419675) still have empty bypass lists. The latter
  still blocks updates, deletion and non-fast-forward changes on the same archive namespace.
- Fresh active-main REST readback shows PR/deletion/non-fast-forward rules. Fresh environment
  and branch-policy readbacks show exactly three environments, each with only a `main` branch
  policy and no administrator bypass; recovery still requires `katpb` owner approval.
- [Completed T002 readbacks](evidence/github-t002-completed-2026-10-03.json) preserve the three
  authenticated rulesets, public active-main/environment/policy responses and non-secret
  installation UI observations. T002 setup is complete under its explicit future T022
  required-check binding. Actual App tag/release mutation behavior and credential/job isolation
  remain untested; setup readbacks do not constitute hosting acceptance.
- T003 added `.github/CODEOWNERS` for `/.github/`, `/hosting/`, `/scripts/`, `/package.json`,
  `/package-lock.json` and the ownership file itself. Authenticated repository metadata
  confirms `katpb` owns this repository and has admin/push access. Every entry names that
  verified owner. Comments document non-blocking ownership while solo and enabling independent
  and applicable code-owner approval with a second trusted maintainer. The main ruleset
  deliberately requires zero approvals/no CODEOWNER approval. This local file becomes
  default-branch ownership documentation after its protected-main PR is merged.

### T004 account and provisioning inspection — pending execution

- Signed-in account `a20534600ae6a611d09360bbc2340c6f` shows Workers Free, $0, Current plan.
  Workers & Pages shows no projects and zero requests today. The displayed account limit
  is 100 Workers. No billing change or resource creation was submitted.
- The dashboard's assets-only path is Create application -> Upload your static files ->
  Upload and deploy. It requires a file/folder upload and keeps Deploy disabled without files.
  No file picker was opened and no file was dropped/uploaded. Hello World/runtime templates,
  legacy Pages and Git integration were not substituted.
- The official [Free limits](https://developers.cloudflare.com/workers/platform/limits/)
  document 20,000 assets per Worker version, 25 MiB per asset, 100 header rules and 2,000
  characters per header line. [Worker Preview limits](https://developers.cloudflare.com/workers/previews/)
  are 100 Previews per Worker and 100 deployments per Preview. Capacity triggers provider
  eviction, so the future helper must reject quota excess before uploading. These are
  documented limits, not exercised quotas or live target acceptance.
- Cloudflare's [metadata-only Create Worker API](https://developers.cloudflare.com/api/resources/workers/subresources/beta/subresources/workers/methods/create/)
  documents a separate POST with a required Worker name and optional settings, without
  assets or script code. This is a possible owner provisioning path, not a verified execution.
  No connected Cloudflare provisioning tool was available; plugin discovery returned no
  Cloudflare result. No broad API token, Global API key or owner credential was requested/read.
- [T004 inspection observations](evidence/cloudflare-t004-inspection-2026-10-03.json) record the
  Free plan, empty inventory, upload form and published limits. Proposed names are
  `katpb-dev-production`, `katpb-dev-preview`, and isolated `katpb-dev-acceptance`.
  Confirmed Worker IDs, workers.dev subdomain and actual HTTPS addresses remain pending.
- Proposed sequencing correction for owner review: implement credential-free T006–T022
  foundation work before provisioning/uploads; leave T004/T005 unchecked until actual owner
  provisioning and scoped-token/isolation exercises pass. All uploads still require the
  complete trusted gates, and T023 remains outside scope. Alternatively, the owner can create
  empty targets through the metadata-only API using existing owner access. No task dependency
  or upload exception has been changed without that decision.
- Current T002 evidence assertions, exact CODEOWNERS entries and all 35 preservation hashes
  passed. Application source/R1 historical evidence, package/lock and pre-existing roadmap
  contents remain unchanged. No hosted or real App mutation result is claimed.

### Owner-approved foundation-first dependency resolution

- The owner explicitly approved the no-placeholder/no-upload foundation-first correction.
  T001–T003 remain complete. T004 retains actual preflight: Free $0 plan, account ID
  `a20534600ae6a611d09360bbc2340c6f`, empty inventory, intended names
  `katpb-dev-production`, `katpb-dev-preview`, `katpb-dev-acceptance`, and the published
  Free quotas above. workers.dev subdomain/URLs remain unverified, not inferred. There
  have been zero DNS/custom-domain/nameserver/certificate changes.
- Corrected only the plan/task dependency/runbook consistency and this evidence record.
  Exact order: completed T001–T003 -> T004 preflight -> T006/T007 -> T008–T010 assertions
  -> T011/T012 -> sequential T013–T022 controls and applicable local/CI validation ->
  return to T004 one-time owner bootstrap/readbacks -> T005 individual-Worker credentials,
  permission/isolation/environment tests/readbacks -> setup/foundation checkpoint.
  Stop before T023; no preview user-story code is authorized.
- Deferred T004 actual creation and resource/HTTPS URL readbacks and T005 scoped token
  issuance/storage and provider mutation/isolation exercises. Main-only environment setup
  already read back at T002 remains evidence, not a completed credential test. T004/T005
  and Phase 1/foundation checkpoints remain pending until their actual acceptance passes.
- T006 may safely begin because dependency review/installation is credential-free and
  does not upload to Cloudflare. First registry read failed sandbox DNS; the approved
  network retry verified version 4.147.0, MIT OR Apache-2.0 and Node >=22 compatibility.
  Lifecycle scripts are disabled during dependency installation/review. No broader normal
  credentials or retained bootstrap Admin credential are introduced.
- Requirements-quality checklist remains 16 checked, zero unchecked. No extension hooks
  or applicable AGENTS.md exists. No new design blocker was identified at this correction;
  unprovisioned targets must fail closed until the deferred setup returns.

### T006/T007 dependency and exclusion review

- Wrangler 4.147.0 is the only added development dependency; MIT OR Apache-2.0 and Node >=22 support the pinned Node 24.21.0/npm 11.21.0. Registry integrity matches the locked tarball. Installation used `--ignore-scripts`; Wrangler has no install lifecycle, while new workerd/nested esbuild installers can download binaries if platform packages are missing. They were inspected but not executed. CLI version/preview/deploy help passed with a credential-free environment; automatic configuration must be explicitly disabled for deployment.
- Existing dependency versions/integrities are preserved; 83 new lock entries include optional platforms. Shared @img/colour only changes optional metadata. Both baseline and resulting audits report the identical three high findings through Astro/MDX/http-cache-semantics ([advisory](https://github.com/advisories/GHSA-ch52-4w7c-c8xp)); none is in Wrangler's added subtree. The existing finding remains unresolved. Static hosting has no Node runtime, and builds receive no provider credentials. No forced audit fix or source dependency change was performed.
- [Structured review](evidence/wrangler-review-2026-10-03.json), [current audit](evidence/wrangler-audit-2026-10-03.json), and [baseline audit](evidence/pre-wrangler-audit-2026-10-03.json) preserve actual observations.
- Added ignored .deploy/.wrangler/.dev.vars/private-key files and matching formatting exclusions. Git readback confirms generated/secrets excluded, but hosting source/scripts/CI remain covered. No provider mutation or secret handling occurred.

### Foundation implementation and local validation

- T008–T010 adversarial assertions were written and observed failing with missing modules before shared implementation. T011/T012 add strict non-secret policy with the observed account ID and approved names; Worker IDs/subdomain remain null and verified flags false, blocking every normal provider call. Trusted headers use common security headers and exact per-file immutable rules only for proven fingerprinted generated paths, with Free header/asset quota checks.
- T013 resolves GitHub source/run/attempt/artifact/check-suite/PR permission metadata through bounded read-only REST and pagination. Active main PR/check/source/integrity rules and explicitly readable empty bypass lists are mandatory; omitted bypass information fails closed. T013 remains unchecked because normal runtime capability is unresolved.
- T014–T018 implement strict release/attempt schemas, regular-file USTAR validation before extraction, deterministic raw/assets/marker manifests, explicit retained history and digest/collision checks, append-only synced/read-back local receipts, and verified status only after smoke/browser and persisted outcome. Source controls/dist are never rewritten by packaging. Real durable GitHub archives/orchestration remain future story work outside this window.
- Wrangler invocation uses only local 4.147.0, array arguments and generated assets-only config. A simulated upload verifies isolated subprocess credentials, typed version/URLs, suppression of captured credential text and deletion of scratch logs. The actual pinned CLI accepts the trusted config in an offline, credential-free dry-run; no upload occurred. Typed formats were checked against the installed pinned CLI source.
- T018/T019 verification checks marker/root/all manifest resources, recursive HTML/CSS/srcset references, MIME/hash, ordinary TLS, no redirects, genuine nonce 404, exact immutable caching and conditional mutable ETag revalidation. Browser mode is explicit and credential-free; default four local projects and port behavior remain intact. Exact hash-checked R1/current baseline TAR fixtures exercise the same helpers. The hosted browser suite passed 16 R1 and 64 current-site fixture cases across both browsers/mobile/desktop/light/dark/JS modes, with axe in JS-enabled cases and readability with JS disabled. All fixture network traffic is intercepted: these are local tests, not real TLS/provider acceptance.
- T020 exposes release:prepare/deploy:verify with help and strict inputs. Missing/stale local validation runs the entire gate in a sanitized environment from clean committed source; dirty source gets separate-checkout guidance. Operational tests are part of the existing gate; hosted network checks remain opt-in.
- T021 adds SHA-pinned CI, exact PR-head/main checkout without credentials persistence, pinned Node/npm, locked script-free installation and pinned Playwright browsers. It performs the full credential-free gate and raw handoff before artifact upload; no provider secret/environment, privileged cache or deployment job. A separate read-only GitHub-token metadata step records whether runtime bypass actors are visible, without token values. Required-check activation and matching CI bytes remain T022.
- The first complete local gate passed after fixing formatting: zero Astro diagnostics, 368 existing browser cases, 19 then-current operational tests and six files identical across two builds. Added receipt/native-CLI/R1/current/browser fixture checks subsequently passed; the final complete gate then passed: zero errors/warnings/hints, 368 existing browser tests, 24 operational tests (including 80 mocked hosted browser cases), and six identical raw files across two builds. Preservation hashes passed for all 30 unchanged baseline files; package/lock, ignore files and Playwright configuration are the explicitly authorized changes. Existing source, historical R1 evidence and ROADMAP contents remain preserved.

### Retry: clean committed-source preparation

- Pushed foundation commit `92132aedf7936e102fd691920dde4327832e1da6` on `004-production-hosting`. A separate clean temporary clone preserved the active checkout's uncommitted ROADMAP changes. The clone reused the inspected local dependencies; this is not evidence of a fresh CI installation.
- `release:prepare` ran the complete gate from that clean commit and passed: zero Astro diagnostics, 368 local browser cases, 24 operational tests including 80 intercepted hosted-browser cases, and six identical raw files across two builds. It wrote a successful exact-source validation receipt and prepared an unselected-target package.
- A second package made from identical explicit empty retained history, null predecessor, trusted headers and validated raw bytes matched the first envelope and every served asset manifest entry. Raw digest: `7bdbd0d423edcff320be8806ba6808ff394a4911bfe3e998964e6d967b2dd19f`; package digest: `35a8b532ffae8bb4a714c5a05ebb5bd27b15665b8ebbcca0c244ccd889745e6b`. Source remained clean. [Structured local evidence](evidence/local-clean-foundation-2026-10-03.json) records exact manifests and inputs.
- Draft PR creation through the connected GitHub integration returned HTTP 403, `Resource not accessible by integration`. Native Brave input attempts repeatedly stopped with the tool's browser-state-change guard, including after fresh observations. No access expansion was attempted. Repository run readback returned zero runs for this branch; exact-run CI comparison and runtime capability readback remain pending.
- Execution remains T001–T003 completed → T004 preflight → credential-free T006–T022 validation → return to T004 bootstrap → T005 Worker-scoped credentials and readbacks → foundation checkpoint → stop before T023. T013 remains partial: runtime no-bypass readback is unresolved and explicit recovery-dispatch source authorization is not yet implemented in the shared helper. No recovery workflow or preview user story was started.

## Pending/manual checks

### PR #4 and real CI readbacks, 2026-10-04

- The owner created draft [PR #4](https://github.com/katpb/katpb.dev/pull/4). B007 is resolved. Successful [CI run 37144339502](https://github.com/katpb/katpb.dev/actions/runs/37144339502), attempt 1, checked out head `19478d000b598ce6f0e807623cfd63cc49f00804`. Workflow ID `374100170`, check suite `100613391730`, check run `111265088994`, `repository-health`, Actions App `15368`, and exact artifact ID `11281532875` were read back. The observed workflow ID is now pinned in policy.
- The complete gate passed on Ubuntu CI and in a separate clean local checkout of the same head: Node 24.21.0/npm 11.21.0, 368 default browser tests, 24 operational tests (80 additional mocked hosted-browser cases), and two-build reproducibility. The artifact ZIP's SHA-256 matched authoritative metadata before reading its bounded regular raw archive. Local/CI validation receipts, six raw files and manifests matched exactly. Packages prepared from those two raw sources with identical explicit empty retained history, null predecessor and trusted headers matched envelopes and served bytes; package digest `871fbcde94a668a456fc3478776da50f596cba4114efcdd90eba9ffdaa24ac92`. [Exact-run evidence](evidence/local-ci-foundation-2026-10-04.json) records the full inputs/manifests; these observations are tied to this head, not future commits.
- Main ruleset `24419712` now requires `repository-health` from integration `15368`, strict up-to-date branches, and checks on creation. Authenticated ruleset and public active-branch-rule readbacks agree. Mandatory PRs, zero solo approvals, non-blocking code-owner ownership, blocked force pushes/deletion and an empty main bypass list remain intact. Archive immutability retains no bypass; the separate creation-only ruleset retains only App `5176510`. All three environments still allow only branch `main`, no tags, and no admin bypass; recovery still requires owner review with self-review allowed while solo. [Protection readbacks](evidence/github-t022-readbacks-2026-10-04.json) contain the actual observations. GitHub passkey reauthentication was required for saving the stronger main rule; saved readback confirms it succeeded.
- B006 is confirmed by the normal read-only CI probe: `bypassActorsVisible: false`, count null. Missing actors are not an empty list. The owner-authorized readback above proves current setup only; it does not supply future automatic jobs with live protection visibility. The API's history/version alternatives also require Administration write, so they are not read-only substitutes ([official contract](https://docs.github.com/en/rest/repos/rules)). No Administration permission, new token or App broadening was granted. A separate owner-approved capability/design decision is required before runtime no-bypass authorization can pass. T013/T022 remain unchecked, T004/T005 remain deferred, and neither foundation checkpoint nor SC-001's full hosted R1 acceptance is claimed.
- T013's shared helper now also resolves recovery source authority without adding a recovery workflow. It requires exact successful main-push CI/run/attempt/artifact/check metadata, independently fetched protected-main ancestry, and a live main-ref dispatch of the registered trusted `deploy.yml` workflow at the current control SHA by a currently write-authorized initiator. Recovery records the dispatch event and separately retains the selected historical source and current control SHA. Historical source controls may differ because candidate code is never executed by this helper and the source must be an independently established protected-main ancestor; preview control matching remains mandatory. Missing/expired run/artifact/protection evidence still fails closed. Known-good archive/receipt validation, environment approval and recovery orchestration remain T044 onward; this source result alone is not upload authorization. The recovery assertion first failed before implementation; positive and adversarial source tests and mocked authoritative endpoint lookups then passed, including failure on omitted bypass actors.
- After the shared recovery-source checks and observed workflow-ID pin were added, the full local gate passed again: zero Astro diagnostics, 368 existing browser cases, 26 operational tests including the 80 mocked hosted cases, and six identical raw files across two builds. These changes require a new PR-head CI run before use.

- Full local and R4 foundation behavior gates passed as recorded above. No new
  enforced-offline network-isolation run was performed in this window.
- Actual hosted R1-only acceptance using the documented controlled-fixture/current-main procedure.
- Independent active-rule reads, main integrity, archive-tag restrictions and main-only
  environment configuration are observed. Solo-main PR policy is configured. Exact CI binding
  and actual actor enforcement remain pending. App installation/creation-only exception
  readbacks passed as recorded above.
- Actual Worker provisioning and individual-Worker credential/preview-isolation exercises;
  actual Free plan is verified, published asset/preview limits are recorded.
- Exact-run CI raw/package comparison passed for the recorded PR head; subsequent changed heads require their own eligible CI evidence before use.
- All hosted verification, provider security, timing, performance, failure/recovery observations.
- Domain readiness inspection only: no DNS/nameserver, custom-domain/route, certificate or launch change is authorized.

## Blockers

- **B001 — Historical private-visibility restriction resolved:** the owner made the repository
  public and the agent verified it. T002 main/archive/environment setup passed; required CI
  binding remains T022 as explicitly scheduled.
- **B002 — Read-path blocker resolved:** direct public GitHub REST active-rule, ruleset and
  environment reads succeeded. The connector's endpoint limitation persists, but T013 can use
  the verified direct REST path. No new or broader credential was used.
- **B003 — Solo-maintainer policy resolved:** the owner's explicit decision was applied and
  authenticated main ruleset readback passed. Independent/applicable code-owner approval must
  be enabled with a second trusted maintainer. PR/check/no-bypass protections remain required.
- **B004 — Archive setup resolved:** single-repository installation and Contents/Metadata-only
  permissions were read back, and the sole creation-only App exception was configured and
  authenticated readback passed. Main and immutable archives retain no bypass. Real actor
  mutation/secret isolation tests remain pending; no broad role/credential was substituted.
- **B006 — Original runtime bypass-enumeration requirement superseded:** GitHub documents that ruleset bypass actors are returned only to callers with write access to the ruleset ([official API contract](https://docs.github.com/en/rest/repos/rules#get-a-repository-ruleset)). The actual read-only CI probe omitted this field; implementation fails closed. No Administration permission, App broadening or elevated credential has been created/stored. The owner explicitly approved the split audit/runtime model below; no permission expansion is authorized.
- **B007 — Resolved by owner:** the owner created draft PR #4; its real CI passed. The connector's earlier creation HTTP 403 is historical. Native browser control worked in this continuation and the required check was activated and read back.

### B006 approved split owner-audit/runtime trust model

The owner rejected the proposed second App and Administration-write CI permission. No second
App, new credential, secret or permission grant was created. This decision supersedes the earlier
runtime bypass-enumeration blocker and proposal; older observations above remain historical.

- The existing authorized owner setup connection read the complete repository/inherited inventory
  and full ruleset details, including bypass actors, on 2026-10-04. The trusted non-secret
  [audit snapshot](../../../hosting/github-ruleset-audit.json) records IDs, purposes,
  targets/conditions, enforcement, exact rules/check source, complete bypass actors and GitHub
  `updated_at` timestamps. Main `24419712` and immutable archives `24419675` have no bypass;
  creation-only `24419981` has only Integration App `5176510` in always mode.
- Owner audit validation independently enforces mandatory PR/check/integrity rules, the approved
  solo policy, exact tag protections and the sole allowed creation exception. The audit file is
  CODEOWNERS-covered protected-main control configuration, never candidate artifact authority.
- Runtime uses read-only/Metadata-capable GET requests for the complete repository/inherited
  inventory, all ruleset details and active main rules. It compares IDs, source, targets/conditions,
  enforcement, exact rules/checks and normalized GitHub revision timestamps with the audit.
  Missing, unknown, duplicate, changed or unreadable state fails closed and requires a new owner
  audit. Timestamp normalization retains GitHub's fractional precision. Runtime does not require
  or use bypass actor enumeration; unchanged live revisions connect runtime state to the owner audit.
- The new assertions first failed because the audit/drift exports did not exist, then passed:
  matching audited revisions with runtime actors omitted; changed/missing revisions or rulesets;
  unknown/duplicate inventory; target/enforcement drift; check name/source drift; force-push,
  deletion and archive update protection drift; and unsafe owner-audit bypass actors.
- The actual credential-free public Metadata gate returned eligible with audit digest
  `905ffa3ead2590f7d390156e722204b63104a584286d446364f348893667c767` and matching revisions for
  all three rulesets. CI now runs the same gate with only its existing read-only token, failing
  repository-health and withholding artifact upload on drift. Real CI run `37177434568`, attempt 1,
  passed this gate on source `e6a78ab65092ea45833b77800cfdb2d07e4a8422`; its logged token permissions
  were Contents read and Metadata read. The successful `repository-health` check came from
  GitHub Actions App `15368`, check `111362887586`, suite `100701435531`.
- Earlier exact-run CI/package evidence remains valid for its recorded SHA. T004/T005 remain
  deferred under the owner's latest instruction, and the Phase 1/foundation checkpoint and full
  hosted/R1 acceptance remain incomplete. T023 onward is untouched.
- The full local gate passed after this implementation: zero Astro diagnostics, 368 default
  browser cases, 30 operational tests (including 80 intercepted hosted-browser fixture cases),
  and six raw files identical across two builds. All 30 preserved baseline hashes, including
  ROADMAP, matched. A second actual public-Metadata lookup with only an in-memory expected
  timestamp changed was blocked; no GitHub state was mutated. [Structured observations](evidence/github-split-audit-2026-10-04.json)
  record matching and stale-audit outcomes and the actual CI result. The artifact ZIP digest
  `058031fecef7b278f964932eb54e24a2c69a53a5b785335c434f3217a4c38489` matched GitHub artifact
  `11292899349` before bounded extraction. Its provenance and six raw files matched the exact
  clean local checkout; preparing both with identical explicit empty retention and header inputs
  produced eight equal packaged files and digest
  `2bc36bc41b972362d3fef8e88cc3f2bb6a458643002d51b21ebbd4124696aafd`.
  Fresh full owner readbacks matched all audited rules and bypass actors; all three environments
  remained main-only with no admin bypass, and recovery retained the owner reviewer. T013/T022
  are now complete under the approved split model. This verifies protection eligibility and
  foundation reproducibility; it does not authorize an unprovisioned target or prove hosted acceptance.

- **B005 — Dependency order resolved, provider setup still pending:** the owner approved
  foundation-first execution. Credential-free/local/trusted T006–T022 controls now precede
  actual T004 bootstrap and T005 scoped credentials/exercises. The no-upload-before-foundation
  rule remains authoritative; no placeholder/dashboard/provider upload is substituted.
  T004/T005 stay unchecked until actual resources, URLs, permissions and isolation readbacks
  pass. Neither setup nor foundation checkpoint is complete while either remains pending.
- T004 inspection verified the Free tier and documented limits; Worker provisioning and
  individual-Worker behavior require observations. No Cloudflare account,
  resource, subscription, token, DNS/nameserver or custom-domain changes were made.

### Task reconciliation at this stop

| Tasks     | Status              | Reason                                                                                |
| --------- | ------------------- | ------------------------------------------------------------------------------------- |
| T001      | Completed           | Evidence record created, current/R1 local gates observed, procedure documented        |
| T002      | Completed setup     | Approved solo-main/App/archive/environment readbacks passed; CI binding T022          |
| T003      | Completed locally   | Sensitive-file ownership added with verified owner; non-blocking while solo           |
| T004      | Partial; unchecked  | Preflight recorded; provisioning deferred until foundation validation                 |
| T005      | Deferred; unchecked | Worker-scoped credentials and isolation exercises await actual resources              |
| T006–T007 | Completed locally   | Exact CLI pin review and generated/secret exclusions verified                         |
| T008–T012 | Completed locally   | Adversarial tests, strict unprovisioned policy and trusted headers                    |
| T013      | Completed           | Source helpers, complete owner audit and actual read-only CI revision drift gate pass |
| T014–T021 | Completed locally   | Shared packaging, invocation, verification, reporting, commands and CI files tested   |
| T022      | Completed           | Required-check source, owner/environment readbacks and exact-run local/CI bytes pass  |
| T023–T062 | Not started         | Outside the approved execution window                                                 |

T023 onward was not started. No provider upload, token creation or domain change occurred.
T022 local/CI equivalence and split protection verification passed for the exact recorded PR head.
T004/T005 provisioning, scoped-credential/isolation observations and later hosted acceptance remain
pending. The earlier runtime capability blocker B006 is resolved without an elevated credential;
the Phase 1/foundation checkpoint remains incomplete. No new blocker was discovered.

## Acceptance outcomes

| Criterion                              | Outcome                                     | Evidence                             |
| -------------------------------------- | ------------------------------------------- | ------------------------------------ |
| SC-001 local/CI reproducibility        | Partial; hosted R1 acceptance pending       | Exact-run local/CI bytes matched     |
| SC-002 PR previews                     | Pending; outside this implementation window | T023 onward not started              |
| SC-003 automatic production            | Pending; outside this implementation window | No production deployment             |
| SC-004 failure reporting               | Pending                                     | No controlled provider exercises     |
| SC-005 recovery                        | Pending; outside this implementation window | No recovery deployment               |
| SC-006 hosted HTTPS/assets/404         | Pending                                     | No hosted checks                     |
| SC-007 cache transitions               | Pending                                     | No release/recovery transitions      |
| SC-008 credential/trust isolation      | Pending                                     | No real scoped credentials exercised |
| SC-009 documented operations/readiness | Pending                                     | Operator workflow not implemented    |

Domain ownership is satisfied by the owner's confirmation. DNS and nameserver configuration,
Worker custom-domain routing, `katpb.dev` certificate activation and public launch have not
been performed. DNS and active custom-domain routing remain unchanged and are intentionally
deferred until a separate explicit owner-approved cutover.

## T004/T005 owner-authorized bootstrap attempt — 2026-10-04

The owner authorized T004 provisioning followed by T005 individual-Worker credentials and
isolation observations, with review before T023. Creation is held for an account-identity
choice: trusted policy records account `a20534600ae6a611d09360bbc2340c6f`, but the signed-in
Cloudflare session exposes only account `45dcbe7b47e04e1f41dc571ceb86b40e`, named
Katpb072@gmail.com's Account, with `katpb.workers.dev`. No account substitution was made.

The signed-in account shows Free, $0, Current plan, no projects, a 100-Worker limit,
and 100,000 daily compute requests/10 ms CPU per invocation. These are observations of the
available session, not authorization to create the approved targets in a different account.
The prepared exact-source package on `da4b7451e80f405514adc3e694065f75a99fb280` passed the full
credential-free gate again: zero Astro diagnostics, 368 browser cases, 30 operational tests
and six reproducible raw files. The exact latest successful CI run `37177854365` artifact was
SHA-256 checked before bounded extraction; provenance, six raw files and eight packaged
files matched the clean local build, package digest
`cb71c17c43139b8b3ac1801b7328757e22a9afa443a58185c3be6e2d48d66610`.
A fresh public Metadata drift readback remained eligible with the owner-audited revisions.

No Worker, API token, GitHub secret, provider upload, paid plan, DNS, nameserver, route,
custom domain or certificate was changed. T004/T005 remain unchecked, the complete foundation
checkpoint remains incomplete, and T023 was not started. [Structured observations](evidence/cloudflare-bootstrap-2026-10-04.json)
record the mismatch and validation evidence. The next action is the owner's account choice;
individual-Worker permission and isolation outcomes are still pending real observations.

### Account mismatch resolved by explicit owner decision — 2026-10-04

The owner confirmed account `45dcbe7b47e04e1f41dc571ceb86b40e` and `katpb.workers.dev` as the
only intended R4 deployment account/subdomain. Earlier `a20534600ae6a611d09360bbc2340c6f`
preflight observations above and in their original evidence file are retained as historical,
superseded observations; that account is no longer an authorized R4 deployment target.

Fresh signed-in Workers plans readback showed Free, $0, Current plan. Workers & Pages
readback showed the confirmed account ID and subdomain, search empty, filter Show all,
No projects found and no conflicting R4 Workers. `hosting/policy.json` now explicitly pins
the confirmed account ID and subdomain label `katpb`; target IDs remain absent and verified
flags false until actual provisioning readbacks pass. Runtime account/target validation
is retained. Stop before further provider action if the signed-in account changes.

Policy/configuration tests and applicable full validation must pass on this updated policy
before creation. No provisioning or credential acceptance is claimed by these preflight readbacks.

The updated policy passed the complete local gate: zero Astro diagnostics, 368 browser cases,
30 operational tests and six reproducible raw files. Additional account/subdomain mismatch
assertions passed with zero provider invocations. All 30 preserved baseline file hashes,
including the owner's ROADMAP change, still match. The policy remains explicit; no credential
can substitute a different account or host in the trusted target passed to the provider helper.
Creation remains pending the exact clean-source preparation/CI gate and actual provider readbacks.

### Production bootstrap and observed hosted behavior — 2026-10-04

After the confirmed-account policy passed clean exact-source preparation and CI run
`37180493308`, the owner dashboard created only `katpb-dev-production` at
https://katpb-dev-production.katpb.workers.dev/. The eight-file trusted assets package came
from `9e50970941ff49e901fec382b81e71f34a3fcb1a`, digest
`eab7db70606d852c64469f0a1ddc4812165c70bdb565fb927355fe3b61b9c9fe`.
The signed-in account remained `45dcbe7b47e04e1f41dc571ceb86b40e`. Settings showed assets-only,
zero bindings, no routes/custom domains, compatibility date `2026-10-04`; upload settings
were auto-trailing-slash HTML and no fallback. This one-time owner bootstrap generated no
creation token or GitHub secret. Earlier no-upload observations remain historical.

The first hosted checks blocked further creation: Cloudflare HTML omitted ETag, compressed
JSON returned a weak ETag with a matching strong 304 validator, and directory index URLs
redirected to canonical slash routes. The existing contract permits equivalent HTML freshness.
The verifier now repeats a bounded full no-cache HTML GET and checks exact bytes, MIME,
freshness and security headers; existing ETags still require 304 and RFC 9110 weak equivalence.
Directory indexes are requested at configured canonical routes; redirects remain forbidden.
Adversarial tests cover stale bytes, wrong status/types/cache/security headers, changed or
malformed validators and broken conditional responses. Live production HTTP then passed
all seven served resources, release identity, recursive assets and genuine nonce 404.
Browser acceptance, preview/acceptance creation and T005 credentials/isolation are pending.
T004/T005 and the complete foundation checkpoint remain unchecked; T023 was not started.

Production signed-in Domains readback confirmed the stable workers.dev URL enabled, preview
version URLs disabled, and no custom domains or zone routes. Policy binds the observed legacy
Worker service/script key `katpb-dev-production` (not a claimed UUID); preview and acceptance
remain unverified. The real credential-free browser suite passed all 64 cases across Chromium/
WebKit, desktop/mobile, light/dark and JavaScript enabled/disabled, with normal TLS, exact HTML
bytes, no unexpected network requests/cookies and applicable axe checks. The complete local
gate then passed zero Astro diagnostics, 368 local browser cases, 34 operational tests and six
reproducible raw files. The token builder exposes Specified Workers → Individual Workers Editor;
this is configuration availability only, not credential or permission acceptance.

### T004 completed; T005 credential acceptance pending — 2026-10-04

Exactly three assets-only targets exist in account `45dcbe7b47e04e1f41dc571ceb86b40e`:

| Target              | Observed service/script key | Actual HTTPS provider URL                       | Version prefix |
| ------------------- | --------------------------- | ----------------------------------------------- | -------------- |
| Production          | `katpb-dev-production`      | https://katpb-dev-production.katpb.workers.dev/ | `0028456d`     |
| Preview parent      | `katpb-dev-preview`         | https://katpb-dev-preview.katpb.workers.dev/    | `3c6c5306`     |
| Isolated acceptance | `katpb-dev-acceptance`      | https://katpb-dev-acceptance.katpb.workers.dev/ | `2dbb8ee8`     |

Signed-in inventory showed Show all, empty search, 1–3 of 3 and exactly these names; account ID
and `katpb.workers.dev` matched. Each settings readback showed assets-only, zero bindings,
no triggers, compatibility date `2026-10-04`, stable workers.dev URL enabled, preview-version
URLs disabled and no custom domains or zone routes. The trusted bootstrap upload contained
only the eight package assets, with auto-trailing-slash HTML and no fallback. The dashboard
path segment `production` names Cloudflare's base environment even for isolated acceptance;
it does not make that Worker the production target. Policy pins distinct observed legacy
service/script keys, not invented UUIDs. Each target passed exact seven-resource HTTP verification
and 64 hosted browser cases; production/preview/acceptance use the same recorded package.

After provisioning, signed-in Workers plans still showed Free, $0, Current plan and the
100-Worker limit. Applicable [asset limits](https://developers.cloudflare.com/workers/platform/limits/)
are 20,000 files/version, 25 MiB/file, 100 header rules and 2,000 characters/header line.
[Preview limits](https://developers.cloudflare.com/workers/previews/) are 100 previews/Worker
and 100 deployments/preview. Assets-only requests are
[free and unlimited](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/);
the displayed 100,000 compute requests/day and 10 ms CPU apply to compute, not static-asset requests.
No paid service, DNS, nameserver, custom domain, route or custom-domain certificate was changed.
Existing owner dashboard creation was bootstrap-only: no product-level credential was generated,
stored in GitHub or retained for deployment. Final full local validation passed zero Astro
diagnostics, 368 browser cases, 34 operational tests and six reproducible raw files.
CI `37181969057` on `accc6a2df5bbf1e12637b5adc73c4dbfd837b891` passed the full gate and
read-only drift check before preview/acceptance uploads. [Structured evidence](evidence/cloudflare-bootstrap-2026-10-04.json)
retains the superseded account observation, bootstrap progression, HTTP/browser results and
current main-only environment/recovery-review readbacks. T004 is checked complete.

T005 remains unchecked: Specified Workers → Individual Workers Editor is available, but
no token or deployment secret has been created and no effective scope or allowed/denied
operation has been tested. Recovery configuration remains main-only, owner `katpb` review,
no admin bypass; this is configuration evidence, not an exercised recovery approval job.
The foundation checkpoint cannot be declared complete or recommended for merge until T005
passes. Stop before T023.

### T005 exact prospective scopes and credential handoff — 2026-10-04

The signed-in account token builder supports Specified Workers and Individual Workers Editor.
Each separate review JSON contained exactly one allow policy, permission group
`7e79ec33834341f28dd431ab73884400`, the confirmed account resource and one Worker resource;
no Admin, account-wide, DNS, zone-route or additional grant was selected. Actual provider IDs
from this signed-in selector/readback now replace the earlier observed legacy service keys in policy:

| Target     | Provider Worker ID                 | Intended token name              | Approved credential destination                                                                   |
| ---------- | ---------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------- |
| Production | `1fe57381f57848dbb722225ef8949ea2` | `katpb-dev-r4-production-deploy` | `CLOUDFLARE_API_TOKEN` in main-only `production` and owner-reviewed `production-recovery`         |
| Preview    | `ede742fe3b12494b928f3785441dca6a` | `katpb-dev-r4-preview-deploy`    | `CLOUDFLARE_API_TOKEN` in main-only `preview`                                                     |
| Acceptance | `bc035ed004424484b1151cdda8c437de` | `katpb-dev-r4-acceptance-test`   | Separate secure local test source; isolated acceptance only, never normal preview/production jobs |

The drafts use a 90-day expiration (`2027-01-02T23:59:59Z`); the current acceptance-only review
is open before Create token. These are prospective configuration reviews, not issued credentials
or effective authorization proof. No token value, API key or GitHub secret was generated/entered.

**B007 — owner credential handoff required**: Computer-use credential policy requires the owner
to perform new credential entry, confirmation and submission. Available connectors do not offer
an approved GitHub environment secret-write transport; token values must not pass through chat,
source, tool inputs or logs. The owner must complete the already approved narrow token creation/
secret-storage steps, then use a secure local credential source for trusted isolated permission
tests. No additional permission or broader token is requested. Allowed operations, denied preview
→production and acceptance→production/normal-preview mutations, and scoped named-preview
create/update/delete remain untested. This blocks T005 and the complete foundation checkpoint;
keep PR draft and do not recommend merging until actual observations pass. T023+ remains untouched.

Final validation after pinning all three actual provider Worker IDs passed the full local gate
again: zero Astro diagnostics, 368 local browser cases, 34 operational tests and six reproducible
raw files. No provider credential entered that gate. The owner's ROADMAP change remains outside
the hosting commits; source/brand/R1 files were not edited.

### Final exact-source CI comparison — 2026-10-04

CI run `37183095306`, check/job `111379420529`, passed on final provisioning/control revision
`f3202216bd6bea12ebc1eb43cc650d90f8e491da`; required-check source remains Actions App `15368`.
Clean detached preparation on that exact SHA passed the full credential-free gate. Artifact
`11296390425` ZIP digest `5cac852c1d9f48b2b4604b6e085d955a3d15e464231e5bfa46dfffec425fb3ed`
was verified before bounded extraction of exactly provenance, raw manifest/TAR and runtime
protection observation. Provenance, six raw files, independently prepared package manifest and
all eight package file bytes matched local preparation; package digest
`d4a82fe0319091ead6a65bfc20ad7c8c0ed6ab7edb4317bb03bcc3b49945a0ed`.
CI read-only drift status remained eligible with the unchanged owner audit and all three
ruleset revisions. This comparison concerns the final control revision; the actual bootstrap
continues to serve the separately recorded `9e5097…` package, with no unrecorded redeployment.
T005/B007 remains the blocker; T004 is complete and T023+ was not started.

### T005 issued credentials and environment readback — 2026-10-04

The owner completed credential creation and GitHub secret storage. Signed-in Cloudflare
inventory now shows three active account-owned tokens: `katpb-r4-production`,
`katpb-r4-preview` and `katpb-r4-acceptance`. Each existing policy form contains exactly one
Worker policy, respectively `katpb-dev-production`, `katpb-dev-preview` and
`katpb-dev-acceptance`, with `Individual Workers Editor` and no additional policy. These
issued-policy observations supersede the earlier prospective drafts; draft names/expiration
and the original no-credential observations above remain historical evidence.

Signed-in GitHub environment settings show `CLOUDFLARE_API_TOKEN` in `preview`, `production`
and `production-recovery`. Values were never requested, received, displayed or written.
The owner reports the production/recovery secrets share the production-scoped token and the
acceptance token is retained securely outside GitHub; encrypted secret contents cannot be
read back to independently prove those mappings. Fresh API readbacks confirm only branch
`main`, zero tags and admin bypass disabled for all three environments. Recovery still
requires owner `katpb` (`50702152`) review; no recovery approval job was executed.

Signed-in account/subdomain readback remains `45dcbe7b47e04e1f41dc571ceb86b40e` /
`katpb.workers.dev`, with exactly the three approved Workers. Workers plans still shows Free,
$0 and Current plan. All three actual Domains views retain their workers.dev URL, disabled
preview-version URLs and no custom domains or zone routes. No provider mutation, permission
change, DNS/nameserver change, custom-domain certificate or paid-product change was performed.
Fresh credential-free HTTP verification checks seven resources on each Worker against the
unchanged bootstrap package `eab7db70606d852c64469f0a1ddc4812165c70bdb565fb927355fe3b61b9c9fe`
from source `9e50970941ff49e901fec382b81e71f34a3fcb1a`. This is served-package evidence,
not scoped-token mutation proof or a new browser verification receipt.

The sequential full local gate passed zero Astro diagnostics, 368 browser cases,
34 operational tests and six reproducible raw files. Initial local attempts required
loopback access and the installed browser-cache location; concurrently run build consumers
also interfered. The final full gate corrected those execution conditions without code or
policy changes. Read-only live ruleset drift remains eligible against the unchanged owner
audit. PR #4 head `d129bd3f965ddcca6a91b641165a443b2439769d` has a passing
`repository-health` check from Actions App `15368`, run `37184419755`.

**B007 resolved; B008 — secure local test access pending**: Issued-token configuration and
secret-name presence are verified, but the trusted local runner has no identified secure
source for the three credentials. GitHub environment secrets cannot be read back, and the
authorized T001–T022 CI has no deployment job that consumes them. Owner dashboard authority
cannot substitute for exercising these scoped credentials. The owner was asked only for
non-secret existing credential references (such as Keychain service/account names or
secret-manager item references), never values. No T023 workflow, environment relaxation,
merge or broader permission is authorized to solve this access blocker.

All three own-Worker updates, all six cross-Worker mutation denials, and named-preview
create/update/delete on the preview parent remain untested. No Editor capability failure
has been observed because no credential-authenticated provider operation was attempted.
[Structured T005 evidence](evidence/cloudflare-t005-credential-readback-2026-10-04.json)
records this distinction and the pending matrix. T005 stays unchecked: T001–T022 remains
21/22, PR #4 stays draft and is not ready to merge the full foundation checkpoint.
T023+ was not started. Stop for owner review.

### T005 approved 1Password source; CLI access blocked — 2026-10-04

The owner supplied the three secret references recorded in
`contracts/developer-commands.md` and approved 1Password CLI as the secure local credential
source. This resolves B008's unidentified-source condition without changing any security
requirement. Production, preview and acceptance remain separately Worker-scoped; acceptance
remains outside GitHub. Only one reference may be resolved per short-lived trusted provider
subprocess, using `op run` with normal masking. No `op read`, reveal, unmasked execution,
resolved-token file/argument/log or credential-bearing Codex/build/browser process is allowed.

1Password CLI `2.40.0` is installed at `/opt/homebrew/bin/op`. A normally masked `op run`
attempt used only the preview reference for a trusted read-only own-Worker preflight.
The CLI exited 1 with `No accounts configured for use with 1Password CLI.` It did not
launch the provider subprocess, resolve a token or send a Cloudflare request. No desktop/
Touch ID approval was reached. No authentication setting, account, permission or secret
was changed; the owner instruction to stop on insufficient access was followed.

**B008 resolved; B009 — 1Password CLI account access unavailable**: The source is approved
and identified, but the invoking CLI cannot access a configured account. The owner needs
to make the intended account available through the existing desktop/CLI integration and
approve its authentication prompt; no credential value or broader Cloudflare scope is needed.
[1Password's integration/troubleshooting guide](https://www.1password.dev/cli/app-integration)
describes this error and setup. The error alone does not establish whether the desktop
integration, account sign-in or OS application access caused it; those settings were not
inspected or changed.

All own-Worker updates, six cross-Worker mutation denials and named-preview create/update/
delete remain unrun. No Editor capability failure has been observed. No provider mutation,
DNS/nameserver/custom-domain/route/certificate/paid-product change or T023+ work occurred.
[Non-secret attempt evidence](evidence/cloudflare-t005-1password-attempt-2026-10-04.json)
retains the command boundary and actual failure. T005 remains unchecked, the foundation
remains 21/22 and PR #4 is not ready to merge. Prior successful provider readbacks and full
validation remain historical observations rather than fresh credential-test results.

Owner-requested retry recorded at `2026-10-04T10:19:15Z` on control
`c4a24f4651291316588c4d37c0a4a5ec915d0264`: the same normally masked preview-only
read-only settings preflight failed both in the sandbox and outside it with approved
escalation. Both attempts exited 1 with `No accounts configured for use with 1Password CLI.`
The trusted provider subprocess never launched; no credential resolved, Cloudflare request
or mutation occurred, and no authentication setting or permission was changed. B009 and
all pending T005 provider exercises remain unchanged; no T023+ work was started.

### T005 execution boundary corrected; owner-run tests prepared — 2026-10-04

The owner confirms all three 1Password references resolve successfully in the normal
VS Code integrated terminal. Codex cannot access that existing desktop/CLI integration.
This supersedes B009's configuration-remediation interpretation: it is an execution
boundary, not evidence of failed credentials or owner configuration. Historical failed
attempts above remain unchanged. Do not reconfigure 1Password, expand macOS permissions,
create alternate credentials, export tokens, create plaintext secret files or ask for
values. Do not execute credential-bearing T005 tests from Codex.

T005 is now owner-executed using [the exact manual procedure](../t005-owner-run.md),
`scripts/hosting/t005-owner-run.mjs` and its trusted built-ins-only provider subprocess.
Each masked `op run --no-masking=false` resolves one approved reference; only the short-lived
provider process receives the resolved token, with no children, raw diagnostics or secret
files. Three initial package/version/settings readbacks precede three same-package own
deployment mutations and all six valid cross-Worker mutation probes. Only explicit HTTP 403
authentication denials pass. A named-preview lifecycle test uses distinct fixed HTML-only
packages under the preview credential and deletes only its newly created preview, including
failure reconciliation. Three final readbacks compare original version/settings/subdomain
digests and seven public resource hashes per Worker.

The runner emits only validated non-secret pass/fail evidence to
`.deploy/evidence/t005-owner-run.json`. Unexpected authorization behavior returns nonzero;
unproven cleanup/base state retains the local hosting lock. Prepared code and mocked tests
are not live provider acceptance. **T005 remains unchecked, foundation remains 21/22,
and owner-run evidence is pending.** Codex will use only the completed sanitized results
to update the effective permission matrix and T005 evidence. Existing main-only
environment and recovery-owner-review readbacks remain configuration evidence.
No credential-bearing test was executed during preparation; T023 remains unstarted.

Credential-free validation passed all 44 integration tests, then all 10 T005 regressions
after adding both pinned-provider asset-upload modes. Formatting and diff whitespace
checks passed. Coverage includes strict reference/env isolation, six real request shapes
against mocked providers, unexpected allows and non-authorization failures, package/state
preservation, distinct preview packages, successful cleanup, failed cleanup, existing-preview
refusal and raw-diagnostic rejection.
[Preparation evidence](evidence/cloudflare-t005-owner-run-preparation-2026-10-04.json)
explicitly distinguishes these mocked checks from pending owner provider observations.

### T005 first owner attempt failed; diagnostic correction — 2026-10-04

The owner run from `2026-10-04T14:51:44.469Z` to `2026-10-04T14:52:50.917Z` passed all
three baseline and final version/settings/subdomain/served-package checks. The production
own update returned `pass: false, stage: authorization` without a retained HTTP status,
and the process exited 1. Further mutations stopped; no named preview was attempted.
[Original sanitized owner evidence](evidence/cloudflare-t005-owner-attempt-1-2026-10-04.json)
is preserved unchanged. This is a failed T005 runner outcome, not a completed permission
matrix or evidence that Cloudflare requires broader scope.

The provider and runner SHA-256 values match the first evidence exactly. Static inspection
finds that the token was injected by masked `op run` but the subprocess account environment
variable was omitted. The direct REST URL itself explicitly used the correct account.
The actual operation was `POST /accounts/45dcbe7b47e04e1f41dc571ceb86b40e/workers/scripts/katpb-dev-production/deployments`
with existing version `0028456d-f204-4a33-a165-12203f2cc51c` at 100%. Target name and
Worker/policy ID `1fe57381f57848dbb722225ef8949ea2` match the recorded issued policy.
No Wrangler/config-generation/login/OAuth/auto-configuration path was invoked; installed
4.147.0 was only a static request-format reference. No own-path creation/deletion,
route/domain change or account/product discovery operation occurred.

The matching first source's only `authorization` failure without status follows a
successful 2xx/`success: true` response: the local deployment ID/versions assertion.
This strongly indicates a response-schema failure mislabeled as authorization. The exact
HTTP status, numeric error code and mismatching response field were not captured and must
remain unknown. The idempotent POST may have added deployment history even though served
state stayed unchanged. Do not claim no mutation occurred or that a Cloudflare denial was
observed.

The correction explicitly supplies/checks `CLOUDFLARE_ACCOUNT_ID`, pins recorded policy IDs,
separates deployment-response/readback failures from authorization, and captures only
fixed-schema status/codes/categories, subprocess exits, verification status, explicit-account
presence, request phases and response-shape booleans. Compact/UUID deployment IDs and
optional response versions require authoritative matching deployment/version readback.
A new owner diagnostic performs only `GET /accounts/45dcbe7b47e04e1f41dc571ceb86b40e/tokens/verify`.
It records active/inactive status and optional expiry metadata, never token ID/value.
Future token-verification failure stops before Worker operations and is not a scope denial.

[Exact diagnostic and conditional second-attempt commands](../t005-owner-diagnostics.md)
are prepared. No credential-bearing diagnostic or mutation was executed from Codex.
No token was changed. Keep T005 unchecked, foundation 21/22 and PR #4 draft. T023 remains
unstarted; another mutation is held until diagnostic review and cause resolution.

The final credential-free integration suite passed **51/51** tests, including verification-only
request isolation, explicit-account fail-closed behavior, status/code/category redaction,
response-schema versus authorization separation, deployment ID/version readback, and gated
second-attempt evidence preservation. Formatting and diff whitespace checks passed.
[Structured investigation](evidence/cloudflare-t005-owner-attempt-1-analysis-2026-10-04.json)
records the observed first attempt separately from static inferences and unrun diagnostics.

### T005 second owner attempt: expected-denial harness correction — 2026-10-04

The second owner run passed all three own updates with HTTP 200 and authoritative
readbacks. It stopped at production → preview HTTP 403 with independently verified
active source token, explicit correct account, POST worker-deployments and phase
during-deployment. Its classifier incorrectly required numeric code 10000; this report
contains no numeric error code. All three final base-state checks passed and no named
preview lifecycle ran. This is a historical failed runner attempt, not a completed matrix.

[First report](evidence/cloudflare-t005-owner-attempt-1-2026-10-04.json) and
[second report](evidence/cloudflare-t005-owner-attempt-2-2026-10-04.json) are preserved
byte-for-byte. Their original failures are not rewritten. The corrected provider accepts
only a valid deployment 403 in independently verified token/account context as
pass/denied-as-expected, exits 0 and continues the remaining pairs. Cross 2xx fails the
security boundary. Own denial, 400/404/network/local validation, wrong account/target/version,
malformed responses and unrelated provider failures remain failures.

Each cross pair now has target-own credential checks before and after for latest deployment
identity, version, settings/subdomain and all seven served package hashes. The complete
six-pair matrix and twelve target-state checks must pass before named-preview lifecycle;
all three final bases are checked, including failure paths. A successful third run has
28 masked single-reference subprocesses and a separate evidence file. Inspection found no
local hosting lock or temporary T005 evidence; no lock/evidence was deleted. Existing
second-run final checks passed, and no uncertain owner-process result was recorded.

[Third manual owner command](../t005-owner-run.md) and
[structured correction/inspection evidence](evidence/cloudflare-t005-owner-attempt-2-analysis-2026-10-04.json)
are prepared. Full credential-free validation passed **59/59 integration tests**
(including **25 T005 regressions**) and **368/368 browser tests**, formatting, Astro checks
(0 errors/warnings/hints), build and reproducibility for six generated files.
Provider requests in the T005 tests are mocked; these checks do not complete live T005.
Codex has not executed a credential-bearing command and no token has been changed.
**T005 remains unchecked, foundation 21/22, PR #4 draft, and T023 unstarted.**

### T005 authorization matrix proven; Preview host correction — 2026-10-04

The [third original owner report](evidence/cloudflare-t005-owner-attempt-3-2026-10-04.json)
proves all three own existing-Worker updates (HTTP 200), all six cross-Worker denials
(HTTP 403 with active source tokens and explicit account), twelve target-state readbacks
and all final bases. This completes the observed authorization matrix, not all of T005.
The report remains overall failed at Preview served-package verification and is unchanged.
The resource creation POST and first deployment POST both returned HTTP 200; its old
created flag meant served package verified. Cleanup DELETE returned HTTP 200 and absence
GET returned HTTP 404/code 10025. No further cleanup is needed; no lock remains.

Live signed-in dashboard readback confirmed katpb-dev-preview normal workers.dev enabled,
Preview URLs disabled, no custom domains/routes. The owner-authorized correction enabled
only its Preview URL switch and verified normal workers.dev still enabled. Separate
production/acceptance readbacks confirmed normal URLs enabled, Preview URLs disabled and
no domains/routes. No token, DNS, nameserver, route, custom domain or certificate changed.
Historical T004 disabled observations remain unchanged and are superseded only for this
later preview-parent host adjustment.

The runner had discarded Cloudflare's returned stable/deployment URL arrays and constructed
a 70-character DNS label. The saved 404 is cleanup absence; the public HTTP/transport
outcome was not independently captured. The actual deleted Preview's returned URLs cannot
be recovered from the sanitized report or empty dashboard and are not inferred. Both
hosting/hostname defects are confirmed; an exact historical public response remains unknown.
The next runner records resource creation, provider-returned URLs, deployments and public
GET statuses separately, fetches only those validated URL values and has no hostname fallback.
New local names use 32 random hex characters (62-character DNS label). Empty/unsafe URLs
fail closed; deletion/absence and final base checks still run.

Trusted policy/config explicitly requires workers_dev true and preview_urls true only for
the preview parent, plus its required previews block; production/acceptance preview_urls
stay false. Baseline/final/preview-host API readbacks fail closed on missing/wrong enablement.
Pinned Wrangler 4.147.0 satisfies the documented 4.135.0 minimum. T005 uses direct REST.
[The structured adjustment](evidence/cloudflare-t005-preview-host-adjustment-2026-10-04.json)
records the live observations, generated config, historical limitations and credential-free
validation. [Next focused owner command](../t005-owner-run.md) performs only Preview lifecycle
and fresh baseline/final reads, with seven single-reference masked subprocesses, gated on
the preserved third authorization matrix. It has not been executed by Codex.
**T005 remains unchecked, PR #4 draft, foundation 21/22, and T023 unstarted.**

The final full credential-free gate passed **67/67 integration tests** (including
**33 T005 regressions**) and **368/368 browser tests**, formatting, Astro checks
(0 errors/warnings/hints), build and reproducibility for six generated files.
Historical owner reports are explicitly excluded from formatting to preserve their
byte hashes. All T005 provider calls in regressions are mocked; no owner credential
script ran. All three original/archived owner-report hashes and the historical T004
bootstrap hash were checked unchanged. The focused fourth report does not yet exist.

### T005 completed from combined owner evidence — 2026-10-06

The authoritative sanitized fourth report is
`.deploy/evidence/t005-preview-lifecycle-fourth.json`, archived byte-for-byte as
[fourth owner report](evidence/cloudflare-t005-owner-attempt-4-2026-10-06.json).
Its SHA-256 is `4be9c5db75a45dd4498d3b6e785def159a962640adb8e848362cedd77674e02a`.
It ran in the owner's normal VS Code terminal from `2026-10-06T17:19:07.507Z` to
`2026-10-06T17:20:26.483Z`, in focused lifecycle-only mode. Its matrix reference matches
the preserved third report SHA-256
`08091cf8b423efd4678910482087bc277c11a2d462b030cf6dad4a47b88e3a03`.
All recorded runner/provider/diagnostic/policy/baseline hashes match the reviewed local files.
Codex reviewed sanitized files only and executed no credential-bearing T005 command.

The [third report](evidence/cloudflare-t005-owner-attempt-3-2026-10-04.json) retains its
original overall failure at served-package verification. Its successful authorization
matrix and preservation results are independently complete and are combined with the
fourth lifecycle; neither historical overall outcome is rewritten.

| Credential | Production target | Preview target    | Acceptance target |
| ---------- | ----------------- | ----------------- | ----------------- |
| Production | Allowed, HTTP 200 | Denied, HTTP 403  | Denied, HTTP 403  |
| Preview    | Denied, HTTP 403  | Allowed, HTTP 200 | Denied, HTTP 403  |
| Acceptance | Denied, HTTP 403  | Denied, HTTP 403  | Allowed, HTTP 200 |

All six denied probes have passing before/after target-own readbacks with identical
deployment identity, version, settings/subdomain digests and verified served package.
All three third-run final base checks passed. The fourth run passed all three fresh
baselines and all three final version/settings/subdomain/served-package checks.
Production and acceptance retain their previous subdomain digests; the preview parent's
changed digest reflects the approved Preview URL enablement and is unchanged between
fourth-run baseline and final readback.

The fourth lifecycle entry is `pass: true`, `stage: complete`, `created: true`,
`updated: true`, `cleanup: true`. Both create and update deployments have
`servedVerified: true` at exact validated provider-returned stable and unique URLs.
One intermediate update propagation fetch returned HTTP 200 with `passed: false`;
the bounded retry then verified the updated stable URL and unique deployment URL.
Delete succeeded and the final resource GET's HTTP 404/code 10025 is the expected
post-delete absence check. It is not a lifecycle failure. Overall `pass`,
`baseWorkersExpected` and `previewRemoved` are true; `t023Started` is false.

Corrected preview-parent configuration: `workers_dev: true`, `preview_urls: true`,
`previews: {}`. Only `katpb-dev-preview` has Preview URLs enabled; production and
acceptance retain `workers_dev: true` and `preview_urls: false`. No domain/DNS/route/
certificate/token-scope change accompanies this closeout.

**Secure credential source and issued expiration**: 1Password is the approved local
source, resolved one reference at a time using masked `op run` into the owner's short-lived
trusted provider subprocess. Acceptance remains outside GitHub. Existing main-only
`preview`, `production`, `production-recovery` environment readbacks and configured
recovery review by owner `katpb` (`50702152`) satisfy T005's configuration requirement;
no recovery approval job is claimed. Signed-in existing token forms show **No expiration** for all three issued tokens.
The owner reports independently verify active status with `expiresOn: null` and
`notBefore: null`. These observations are recorded in the
[combined closeout evidence](evidence/cloudflare-t005-completion-2026-10-06.json) and supersede the historical prospective 90-day date
`2027-01-02T23:59:59Z`; no token was modified during readback.

**Reconciliation**: T005 is checked complete; **T001–T022 = 22/22**. B008 is resolved by
the approved 1Password source and B009's Codex boundary is resolved for acceptance by
owner-executed sanitized evidence. Earlier failed CLI/owner runs, bootstrap observations
and investigations are preserved as historical evidence with their original outcomes.
The complete approved setup/foundation checkpoint is satisfied. SC-001's full hosted
R1 exercise and all later R4 stories remain pending within their original task windows.
T023+ remains unchecked and unstarted. PR #4 stays draft until the owner marks Ready for
Review and merges after final validation/CI readback; this closeout performs neither action.

### Final T001–T022 credential-free closeout validation — 2026-10-06

The final sequential `npm run verify` passed on Node **24.21.0** / npm **11.21.0**:
formatting, Astro diagnostics (**0 errors, 0 warnings, 0 hints**), build,
**368/368 browser tests**, **67/67 integration tests** (including **33 T005 regressions**),
and reproducibility for **6 generated files**. `git diff --check` passed.
The subprocess environment was empty except explicit toolchain/local browser settings;
no Cloudflare, 1Password or GitHub credential was passed. External HTTP/HTTPS requests
were blocked by loopback proxies with only localhost exempted. T005 provider regression
calls were mocked. No credential-bearing owner runner was executed.

The first sandbox attempt passed formatting/check/build and stopped at the local browser
server's `listen EPERM 127.0.0.1:4322`. The explicitly approved loopback-capable rerun
passed the complete gate. Log: `/private/tmp/t005-closeout-credential-free-verify-2026-10-06-unrestricted.log`.
All preserved historical evidence hashes and original/archived owner-run byte equality
were checked again. All T001–T022 checkboxes are complete; every T023+ checkbox is still
unchecked. Owner ROADMAP changes remain untouched and outside this closeout commit.

The closeout is being committed to PR #4's existing head branch for exact-head CI.
The PR description will record the final head/run/check/artifact readback; earlier CI
runs remain historical evidence for their own revisions. Ready for Review and merge
remain the owner's final actions, and T023 must not start in this execution window.
