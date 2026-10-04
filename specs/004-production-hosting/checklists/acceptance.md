# R4 implementation and acceptance evidence

**Window**: Owner-approved T001–T022 only, branch `004-production-hosting`, 2026-10-03.
**Status**: T002 setup readbacks passed and T003 CODEOWNERS was added on 2026-10-03.
Main PR/integrity, archive-tag protection, the single-repository archive App with a creation-only
exception, and main-only environments are configured. On 2026-10-04, real PR CI passed,
the strict Actions required-check binding was activated, and exact-run local/CI bytes matched.
T004 preflight passed; actual provisioning and T005 scoped credentials/exercises are deferred
under the owner's foundation-first correction. T006 dependency review and T007 output/secret exclusions passed. No provider deployment, credential isolation,
hosted acceptance is claimed. The owner approved split owner-audit/read-only drift verification
on 2026-10-04 and rejected the Administration-write App proposal. The owner audit and public
Metadata drift gate passed, and real CI run `37177434568` verified the same gate with only
Contents read/Metadata read permissions. Exact-source local/CI raw and packaged bytes matched;
fresh owner and environment readbacks passed. T013/T022 are complete. T004/T005 remain deferred,
so the Phase 1/foundation checkpoint and hosted acceptance remain incomplete.

## Prerequisites

| Prerequisite                                       | Status           | Evidence or required next check                                                                                       |
| -------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------- |
| Owner approval of T001–T022                        | Confirmed        | Explicit instruction in this implementation session                                                                   |
| R1 merged foundation                               | Locally verified | Exact merge SHA, ancestry and detached R1 full gate passed                                                            |
| Supported Node/npm and local gate                  | Locally passed   | Node 24.21.0/npm 11.21.0; current full gate passed                                                                    |
| Active GitHub main/archive/environment protections | Readbacks passed | Strict Actions repository-health binding, PR/integrity, archive creation-only exception, three main-only environments |
| Cloudflare Workers Free plan                       | Verified         | Signed-in Workers plans shows Free, $0, Current plan; no upgrade performed                                            |
| Three isolated assets-only Workers and Free quotas | Pending          | T004; production, preview parent, controlled acceptance only                                                          |
| Individual-Worker credentials and isolation        | Pending          | T005; no account-wide/Admin/DNS/zone-route permission                                                                 |
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
