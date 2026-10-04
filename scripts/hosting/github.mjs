import { readFileSync } from "node:fs";
import {
  SHA,
  HASH,
  requireThat,
  strictFields,
  digest,
  canonical,
} from "./release-records.mjs";
import { validatePolicy } from "./provider.mjs";

const RULESET_FIELDS = [
  "id",
  "name",
  "target",
  "source_type",
  "source",
  "enforcement",
  "conditions",
  "rules",
  "updated_at",
];
const revision = (value) => {
  const match =
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.(\d+))?(?:Z|[+-]\d{2}:\d{2})$/.exec(
      value,
    );
  requireThat(
    match && Number.isFinite(Date.parse(value)),
    "ruleset revision missing/invalid; new owner audit required",
  );
  // Normalize timezone representation without discarding GitHub's fractional precision.
  const seconds = new Date(Math.floor(Date.parse(value) / 1000) * 1000)
    .toISOString()
    .slice(0, 19);
  const fraction = (match[1] ?? "").replace(/0+$/, "");
  return seconds + (fraction ? "." + fraction : "") + "Z";
};
const sortedRules = (rules) => {
  requireThat(Array.isArray(rules), "required rules unavailable");
  return rules
    .map((r) => ({
      type: r.type,
      ...(r.parameters === undefined ? {} : { parameters: r.parameters }),
    }))
    .sort((a, b) => canonical(a).localeCompare(canonical(b)));
};
const state = (set) =>
  Object.fromEntries(
    RULESET_FIELDS.map((k) => [
      k,
      k === "updated_at"
        ? revision(set[k])
        : k === "rules"
          ? sortedRules(set[k])
          : set[k],
    ]),
  );
export function readRulesetAudit() {
  return JSON.parse(
    readFileSync(
      new URL("../../hosting/github-ruleset-audit.json", import.meta.url),
      "utf8",
    ),
  );
}
export function validateOwnerAudit(audit, policy) {
  validatePolicy(policy);
  strictFields(audit, [
    "schemaVersion",
    "repository",
    "auditedBy",
    "auditedAt",
    "rulesets",
  ]);
  requireThat(
    audit.schemaVersion === 1 &&
      audit.repository === policy.repository &&
      audit.auditedBy === policy.owner,
    "owner audit identity invalid",
  );
  revision(audit.auditedAt);
  requireThat(
    Array.isArray(audit.rulesets) &&
      audit.rulesets.length === 3 &&
      new Set(audit.rulesets.map((s) => s.id)).size === 3 &&
      new Set(audit.rulesets.map((s) => s.purpose)).size === 3,
    "complete owner audit missing",
  );
  for (const set of audit.rulesets) {
    strictFields(set, ["purpose", ...RULESET_FIELDS, "bypass_actors"]);
    requireThat(
      ["main", "archiveImmutable", "archiveCreation"].includes(set.purpose) &&
        Number.isSafeInteger(set.id) &&
        set.id > 0 &&
        typeof set.name === "string" &&
        set.name.length > 0 &&
        set.source_type === "Repository" &&
        set.source === policy.repository &&
        set.enforcement === "active",
      "owner audit ruleset authority invalid",
    );
    revision(set.updated_at);
    const main = set.purpose === "main";
    requireThat(
      set.target === (main ? "branch" : "tag") &&
        canonical(set.conditions) ===
          canonical({
            ref_name: {
              exclude: [],
              include: [main ? "refs/heads/main" : "refs/tags/r4-attempt-*"],
            },
          }),
      "owner audit target/conditions invalid",
    );
    requireThat(
      Array.isArray(set.bypass_actors) &&
        canonical(set.bypass_actors) ===
          canonical(
            set.purpose === "archiveCreation"
              ? [
                  {
                    actor_id: 5176510,
                    actor_type: "Integration",
                    bypass_mode: "always",
                  },
                ]
              : [],
          ),
      "owner audit bypass actors invalid",
    );
    const expected = main
      ? [
          "deletion",
          "non_fast_forward",
          "pull_request",
          "required_status_checks",
        ]
      : set.purpose === "archiveCreation"
        ? ["creation"]
        : ["deletion", "non_fast_forward", "update"];
    requireThat(
      canonical(set.rules?.map((r) => r.type).sort()) ===
        canonical(expected.sort()),
      "owner audit required rules invalid",
    );
    if (main) validateMainRuleRequirements(set.rules, policy);
  }
  return true;
}
export function validateRulesetDrift(rulesets, audit, policy) {
  validateOwnerAudit(audit, policy);
  requireThat(
    Array.isArray(rulesets) &&
      rulesets.length === audit.rulesets.length &&
      new Set(rulesets.map((s) => s.id)).size === rulesets.length,
    "missing/unknown ruleset; new owner audit required",
  );
  for (const live of rulesets) {
    const expected = audit.rulesets.find((s) => s.id === live.id);
    requireThat(
      expected && canonical(state(live)) === canonical(state(expected)),
      "ruleset state/revision changed; new owner audit required",
    );
  }
  return true;
}
export function validateMainRules(
  rules,
  rulesets,
  policy,
  audit = readRulesetAudit(),
) {
  validateRulesetDrift(rulesets, audit, policy);
  const main = audit.rulesets.find((s) => s.purpose === "main");
  requireThat(
    Array.isArray(rules) &&
      rules.every((r) => r.ruleset_id === main.id) &&
      canonical(sortedRules(rules)) === canonical(sortedRules(main.rules)),
    "active main required rules/checks differ from owner audit",
  );
  validateMainRuleRequirements(rules, policy);
  return true;
}
function validateMainRuleRequirements(rules, policy) {
  const types = new Set(rules.map((r) => r.type));
  for (const type of [
    "pull_request",
    "deletion",
    "non_fast_forward",
    "required_status_checks",
  ])
    requireThat(types.has(type), `main protection missing ${type}`);
  const pr = rules.filter((r) => r.type === "pull_request");
  requireThat(
    pr.some((r) =>
      policy.maintainerCount === 1
        ? r.parameters?.required_approving_review_count === 0 &&
          r.parameters?.require_code_owner_review === false
        : r.parameters?.required_approving_review_count >= 1 &&
          r.parameters?.require_code_owner_review === true,
    ),
    "main approval policy differs from maintainer count",
  );
  requireThat(
    rules.some(
      (r) =>
        r.type === "required_status_checks" &&
        r.parameters?.strict_required_status_checks_policy === true &&
        r.parameters.required_status_checks?.some(
          (c) =>
            c.context === policy.workflow.check &&
            c.integration_id === policy.workflow.checkAppId,
        ),
    ),
    "main required check/source or strict policy missing",
  );
  return true;
}
export function authorizeSource(f, input, policy) {
  validatePolicy(policy);
  const { sourceSha, runId, runAttempt, artifactId, mode } = input;
  requireThat(
    (mode === "recovery" || f.controlFilesMatch === true) &&
      f.publicAstroAbsent === true,
    "source changed trusted validation controls or contains public/_astro inputs",
  );
  strictFields(input, [
    "mode",
    "sourceSha",
    "runId",
    "runAttempt",
    "artifactId",
    ...(mode === "recovery" ? ["dispatchRunId"] : []),
  ]);
  requireThat(
    SHA.test(sourceSha) &&
      [runId, runAttempt, artifactId].every(
        (n) => Number.isSafeInteger(n) && n > 0,
      ),
    "source/run/artifact identifier invalid",
  );
  requireThat(
    ["release", "preview", "recovery"].includes(mode),
    "source operation unsupported by foundation authorization",
  );
  requireThat(
    f.repository?.full_name === policy.repository &&
      f.repository.default_branch === "main" &&
      f.run?.repository?.full_name === policy.repository &&
      f.run.head_repository?.full_name === policy.repository,
    "repository provenance mismatch",
  );
  requireThat(
    f.workflow?.id === policy.workflow.id &&
      f.workflow.path === policy.workflow.path &&
      f.workflow.name === policy.workflow.name &&
      f.workflow.state === "active" &&
      f.run.workflow_id === f.workflow.id,
    "workflow provenance mismatch",
  );
  requireThat(
    f.run.id === runId &&
      f.run.run_attempt === runAttempt &&
      f.run.head_sha === sourceSha &&
      f.run.status === "completed" &&
      f.run.conclusion === "success",
    "validation run/attempt failed or stale",
  );
  requireThat(
    f.artifact?.id === artifactId &&
      f.artifact.expired === false &&
      f.artifact.workflow_run?.id === runId &&
      f.artifact.workflow_run.head_sha === sourceSha &&
      f.artifact.name === `r4-raw-${sourceSha}-${runId}-${runAttempt}` &&
      /^sha256:[a-f0-9]{64}$/.test(f.artifact.digest),
    "artifact provenance mismatch",
  );
  requireThat(
    SHA.test(f.main?.sha) &&
      f.controlSha === f.main.sha &&
      HASH.test(f.lockfileSha256),
    "protected control/lockfile identity mismatch",
  );
  validateMainRules(f.rules, f.rulesets, policy);
  const checks = f.checks?.filter(
    (c) =>
      c.name === policy.workflow.check &&
      c.check_suite?.id === f.run.check_suite_id,
  );
  requireThat(
    checks?.length === 1 &&
      checks[0].head_sha === sourceSha &&
      checks[0].conclusion === "success" &&
      checks[0].status === "completed" &&
      checks[0].app?.id === policy.workflow.checkAppId,
    "mandatory exact-run check failed or ambiguous",
  );
  if (mode === "release")
    requireThat(
      f.run.event === "push" &&
        f.run.head_branch === "main" &&
        sourceSha === f.main.sha &&
        f.pr === null,
      "production source is not current successful main push",
    );
  else if (mode === "recovery") {
    requireThat(
      f.run.event === "push" &&
        f.run.head_branch === "main" &&
        f.pr === null &&
        f.comparison?.base_commit?.sha === sourceSha &&
        f.comparison.merge_base_commit?.sha === sourceSha &&
        ["ahead", "identical"].includes(f.comparison.status),
      "recovery source is not a successfully validated protected-main ancestor",
    );
    requireThat(
      Number.isSafeInteger(input.dispatchRunId) &&
        input.dispatchRunId > 0 &&
        f.dispatchRun?.id === input.dispatchRunId &&
        f.dispatchRun.repository?.full_name === policy.repository &&
        f.dispatchRun.head_repository?.full_name === policy.repository &&
        f.dispatchRun.event === "workflow_dispatch" &&
        f.dispatchRun.head_branch === "main" &&
        f.dispatchRun.head_sha === f.controlSha &&
        f.dispatchRun.status === "in_progress" &&
        f.dispatchWorkflow?.path === ".github/workflows/deploy.yml" &&
        f.dispatchWorkflow.state === "active" &&
        Number.isSafeInteger(f.dispatchWorkflow.id) &&
        f.dispatchWorkflow.id > 0 &&
        f.dispatchRun.workflow_id === f.dispatchWorkflow.id &&
        ["admin", "maintain", "write"].includes(f.dispatchPermission),
      "recovery requires a live write-authorized protected-main dispatch",
    );
  } else {
    requireThat(
      f.run.event === "pull_request" &&
        f.pr?.state === "open" &&
        f.pr.head?.repo?.full_name === policy.repository &&
        f.pr.base?.repo?.full_name === policy.repository &&
        f.pr.base.ref === "main" &&
        f.pr.head.sha === sourceSha &&
        SHA.test(f.pr.base.sha) &&
        ["admin", "maintain", "write"].includes(f.permission),
      "preview is closed, stale, forked or unauthorized",
    );
    requireThat(
      f.run.pull_requests?.some((p) => p.number === f.pr.number),
      "PR is not bound to authoritative run",
    );
  }
  return {
    repository: policy.repository,
    sourceSha,
    sourceRef: mode === "preview" ? f.pr.head.ref : "main",
    event: mode === "recovery" ? "workflow_dispatch" : f.run.event,
    pullRequest: f.pr?.number ?? null,
    baseSha: f.pr?.base.sha ?? null,
    controlSha: f.controlSha,
    validationRunId: runId,
    runAttempt,
    artifactId,
    nodeVersion: "24.21.0",
    npmVersion: "11.21.0",
    lockfileSha256: f.lockfileSha256,
    validationResult: "success",
    artifactDigest: f.artifact.digest,
  };
}

export function githubClient({
  token,
  fetch = globalThis.fetch,
  timeoutMs = 15000,
} = {}) {
  async function get(endpoint) {
    requireThat(
      typeof endpoint === "string" &&
        /^\/repos\/katpb\/katpb\.dev(?:\/|$)/.test(endpoint) &&
        !/[\r\n#]/.test(endpoint),
      "GitHub endpoint outside repository",
    );
    const response = await fetch(`https://api.github.com${endpoint}`, {
      redirect: "error",
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }).catch(() => {
      throw new Error(
        "GitHub lookup failed; retry authoritative metadata read",
      );
    });
    requireThat(
      response.ok,
      `GitHub lookup returned ${response.status}; authoritative metadata unavailable`,
    );
    const data = await response.text();
    requireThat(
      data.length <= 8 * 1024 * 1024,
      "GitHub response bound exceeded",
    );
    try {
      return JSON.parse(data);
    } catch {
      throw new Error("GitHub response schema invalid");
    }
  }
  async function pages(endpoint, key = null) {
    const all = [];
    for (let page = 1; page <= 100; page++) {
      const result = await get(
        `${endpoint}${endpoint.includes("?") ? "&" : "?"}per_page=100&page=${page}`,
      );
      const items = key ? result[key] : result;
      requireThat(Array.isArray(items), "GitHub pagination schema invalid");
      all.push(...items);
      if (items.length < 100) return all;
    }
    throw new Error("GitHub pagination bound exceeded");
  }
  return { get, pages };
}
export async function lookupSource(input, policy, { token, fetch } = {}) {
  validatePolicy(policy);
  strictFields(input, [
    "mode",
    "sourceSha",
    "runId",
    "runAttempt",
    "artifactId",
    ...(input.mode === "recovery" ? ["dispatchRunId"] : []),
  ]);
  requireThat(
    ["release", "preview", "recovery"].includes(input.mode),
    "source operation invalid",
  );
  if (input.mode === "recovery")
    requireThat(
      Number.isSafeInteger(input.dispatchRunId) && input.dispatchRunId > 0,
      "dispatch identifier invalid",
    );
  for (const id of [input.runId, input.runAttempt, input.artifactId])
    requireThat(
      Number.isSafeInteger(id) && id > 0,
      "GitHub identifier invalid",
    );
  requireThat(SHA.test(input.sourceSha), "source SHA invalid");
  const api = githubClient({ token, fetch });
  const root = "/repos/katpb/katpb.dev";
  const [repository, main, workflow, run, artifact] = await Promise.all([
    api.get(root),
    api.get(root + "/git/ref/heads/main"),
    api.get(root + "/actions/workflows/ci.yml"),
    api.get(`${root}/actions/runs/${input.runId}/attempts/${input.runAttempt}`),
    api.get(`${root}/actions/artifacts/${input.artifactId}`),
  ]);
  const { rules, rulesets } = await lookupProtections(policy, { token, fetch });
  const checks = await api.pages(
    `${root}/check-suites/${run.check_suite_id}/check-runs`,
    "check_runs",
  );
  let pr = null,
    permission = null;
  let dispatchRun = null,
    dispatchWorkflow = null,
    dispatchPermission = null,
    comparison = null;
  if (input.mode === "recovery") {
    [dispatchRun, dispatchWorkflow, comparison] = await Promise.all([
      api.get(`${root}/actions/runs/${input.dispatchRunId}`),
      api.get(`${root}/actions/workflows/deploy.yml`),
      api.get(`${root}/compare/${input.sourceSha}...${main.object.sha}`),
    ]);
    requireThat(
      /^[a-zA-Z0-9-]{1,39}$/.test(dispatchRun.triggering_actor?.login),
      "dispatch initiator invalid",
    );
    dispatchPermission = (
      await api.get(
        `${root}/collaborators/${dispatchRun.triggering_actor.login}/permission`,
      )
    ).permission;
  }
  if (input.mode === "preview") {
    requireThat(
      Array.isArray(run.pull_requests) && run.pull_requests.length === 1,
      "ambiguous PR/run authority",
    );
    const number = run.pull_requests[0].number;
    requireThat(
      Number.isSafeInteger(number) && number > 0,
      "invalid PR authority",
    );
    pr = await api.get(`${root}/pulls/${number}`);
    requireThat(
      /^[a-zA-Z0-9-]{1,39}$/.test(pr.user?.login),
      "PR author invalid",
    );
    permission = (
      await api.get(`${root}/collaborators/${pr.user.login}/permission`)
    ).permission;
  }
  const content = await api.get(
    `${root}/contents/package-lock.json?ref=${input.sourceSha}`,
  );
  requireThat(
    content.encoding === "base64" && typeof content.content === "string",
    "source lockfile unavailable",
  );
  const [sourceTree, controlTree] = await Promise.all([
    api.get(`${root}/git/trees/${input.sourceSha}?recursive=1`),
    api.get(`${root}/git/trees/${main.object.sha}?recursive=1`),
  ]);
  for (const tree of [sourceTree, controlTree])
    requireThat(
      tree.truncated === false && Array.isArray(tree.tree),
      "complete source/control tree readback required",
    );
  const controls = (p) =>
    /^\.github\/|^hosting\/|^scripts\/|^tests\//.test(p) ||
    [
      "package.json",
      "package-lock.json",
      "playwright.config.ts",
      ".nvmrc",
      ".npmrc",
    ].includes(p);
  const sourceEntries = new Map(sourceTree.tree.map((e) => [e.path, e]));
  const controlFilesMatch =
    controlTree.tree
      .filter((e) => e.type === "blob" && controls(e.path))
      .every((e) => sourceEntries.get(e.path)?.sha === e.sha) &&
    sourceTree.tree
      .filter((e) => e.type === "blob" && controls(e.path))
      .every((e) =>
        controlTree.tree.some((c) => c.path === e.path && c.sha === e.sha),
      );
  const publicAstroAbsent = !sourceTree.tree.some(
    (e) => e.path === "public/_astro" || e.path.startsWith("public/_astro/"),
  );
  return authorizeSource(
    {
      repository,
      main: { sha: main.object?.sha },
      workflow,
      run,
      artifact,
      rules,
      rulesets,
      checks,
      pr,
      permission,
      controlSha: main.object?.sha,
      lockfileSha256: digest(Buffer.from(content.content, "base64")),
      controlFilesMatch,
      publicAstroAbsent,
      dispatchRun,
      dispatchWorkflow,
      dispatchPermission,
      comparison,
    },
    input,
    policy,
  );
}

export async function lookupProtections(
  policy,
  { token, fetch, audit = readRulesetAudit() } = {},
) {
  validateOwnerAudit(audit, policy);
  const api = githubClient({ token, fetch });
  const root = "/repos/katpb/katpb.dev";
  const inventory = await api.pages(root + "/rulesets?includes_parents=true");
  requireThat(
    inventory.length === audit.rulesets.length &&
      new Set(inventory.map((s) => s.id)).size === inventory.length &&
      inventory.every((s) => audit.rulesets.some((a) => a.id === s.id)),
    "ruleset inventory changed/unknown; new owner audit required",
  );
  const [rulesets, rules] = await Promise.all([
    Promise.all(
      inventory.map((s) =>
        api.get(`${root}/rulesets/${s.id}?includes_parents=true`),
      ),
    ),
    api.pages(root + "/rules/branches/main"),
  ]);
  for (const listed of inventory) {
    const detail = rulesets.find((s) => s.id === listed.id);
    requireThat(
      detail &&
        ["id", "name", "target", "source_type", "source", "enforcement"].every(
          (k) => detail[k] === listed[k],
        ) &&
        revision(detail.updated_at) === revision(listed.updated_at),
      "ruleset changed during readback; new owner audit required",
    );
  }
  validateMainRules(rules, rulesets, policy, audit);
  return {
    rules,
    rulesets,
    observation: {
      schemaVersion: 1,
      status: "eligible",
      auditDigest: digest(audit),
      auditedAt: audit.auditedAt,
      rulesets: rulesets
        .map((s) => ({ id: s.id, updated_at: revision(s.updated_at) }))
        .sort((a, b) => a.id - b.id),
      bypassTrust: "owner-audited; live revision matched",
      access: "read-only Metadata",
    },
  };
}
