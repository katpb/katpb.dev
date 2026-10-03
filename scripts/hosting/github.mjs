import {
  SHA,
  HASH,
  requireThat,
  strictFields,
  digest,
} from "./release-records.mjs";
import { validatePolicy } from "./provider.mjs";

export function validateMainRules(rules, rulesets, policy) {
  validatePolicy(policy);
  requireThat(
    Array.isArray(rules) && Array.isArray(rulesets) && rulesets.length > 0,
    "active main rules missing",
  );
  for (const set of rulesets)
    requireThat(
      set.enforcement === "active" &&
        Array.isArray(set.bypass_actors) &&
        set.bypass_actors.length === 0,
      "main bypass actors absent/unreadable or present; owner-authorized live readback required",
    );
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
  requireThat(
    f.controlFilesMatch === true && f.publicAstroAbsent === true,
    "source changed trusted validation controls or contains public/_astro inputs",
  );
  strictFields(input, [
    "mode",
    "sourceSha",
    "runId",
    "runAttempt",
    "artifactId",
  ]);
  const { sourceSha, runId, runAttempt, artifactId, mode } = input;
  requireThat(
    SHA.test(sourceSha) &&
      [runId, runAttempt, artifactId].every(
        (n) => Number.isSafeInteger(n) && n > 0,
      ),
    "source/run/artifact identifier invalid",
  );
  requireThat(
    ["release", "preview"].includes(mode),
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
  else {
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
    sourceRef: mode === "release" ? "main" : f.pr.head.ref,
    event: f.run.event,
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
  for (const id of [input.runId, input.runAttempt, input.artifactId])
    requireThat(
      Number.isSafeInteger(id) && id > 0,
      "GitHub identifier invalid",
    );
  requireThat(SHA.test(input.sourceSha), "source SHA invalid");
  const api = githubClient({ token, fetch });
  const root = "/repos/katpb/katpb.dev";
  const [repository, main, workflow, run, artifact, rules] = await Promise.all([
    api.get(root),
    api.get(root + "/git/ref/heads/main"),
    api.get(root + "/actions/workflows/ci.yml"),
    api.get(`${root}/actions/runs/${input.runId}/attempts/${input.runAttempt}`),
    api.get(`${root}/actions/artifacts/${input.artifactId}`),
    api.pages(root + "/rules/branches/main"),
  ]);
  const ids = [...new Set(rules.map((r) => r.ruleset_id))];
  requireThat(
    ids.length > 0 && ids.every(Number.isSafeInteger),
    "active ruleset authority missing",
  );
  const rulesets = await Promise.all(
    ids.map((id) => api.get(`${root}/rulesets/${id}`)),
  );
  const checks = await api.pages(
    `${root}/check-suites/${run.check_suite_id}/check-runs`,
    "check_runs",
  );
  let pr = null,
    permission = null;
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
    },
    input,
    policy,
  );
}
