import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { readFileSync } from "node:fs";
import {
  validatePolicy,
  resolveTarget,
  validateProviderUrl,
  generatedConfig,
  invokeProvider,
} from "../../scripts/hosting/provider.mjs";
import {
  authorizeSource,
  validateMainRules,
  lookupSource,
} from "../../scripts/hosting/github.mjs";

const sha = "a".repeat(40);
const audit = JSON.parse(readFileSync("hosting/github-ruleset-audit.json"));
const mainAudit = audit.rulesets.find((s) => s.purpose === "main");
const rules = structuredClone(mainAudit.rules).map((r) => ({
  ...r,
  ruleset_id: mainAudit.id,
}));
const fixtureRulesets = () =>
  audit.rulesets.map(({ purpose, bypass_actors, ...s }) => structuredClone(s));
export const fixturePolicy = () => ({
  schemaVersion: 1,
  repository: "katpb/katpb.dev",
  accountId: "a".repeat(32),
  subdomain: "test",
  workflow: {
    id: 1,
    path: ".github/workflows/ci.yml",
    name: "CI",
    check: "repository-health",
    checkAppId: 15368,
  },
  quotas: {
    maxFiles: 20000,
    maxFileBytes: 26214400,
    maxPreviews: 100,
    maxPreviewDeployments: 100,
  },
  targets: {
    production: {
      workerName: "katpb-dev-production",
      workerId: "p",
      workersDev: true,
      previewUrls: false,
      verified: true,
    },
    preview: {
      workerName: "katpb-dev-preview",
      workerId: "v",
      verified: true,
      workersDev: true,
      previewUrls: true,
    },
    acceptance: {
      workerName: "katpb-dev-acceptance",
      workerId: "a",
      workersDev: true,
      previewUrls: false,
      verified: true,
    },
  },
  owner: "katpb",
  maintainerCount: 1,
});
const facts = () => ({
  controlFilesMatch: true,
  publicAstroAbsent: true,
  repository: { full_name: "katpb/katpb.dev", default_branch: "main" },
  main: { sha },
  workflow: {
    id: 1,
    path: ".github/workflows/ci.yml",
    name: "CI",
    state: "active",
  },
  run: {
    id: 10,
    run_attempt: 1,
    workflow_id: 1,
    head_sha: sha,
    head_branch: "main",
    event: "push",
    status: "completed",
    conclusion: "success",
    repository: { full_name: "katpb/katpb.dev" },
    head_repository: { full_name: "katpb/katpb.dev" },
    check_suite_id: 7,
  },
  artifact: {
    id: 9,
    workflow_run: { id: 10, head_sha: sha },
    expired: false,
    name: `r4-raw-${sha}-10-1`,
    digest: `sha256:${"b".repeat(64)}`,
  },
  checks: [
    {
      name: "repository-health",
      conclusion: "success",
      status: "completed",
      head_sha: sha,
      check_suite: { id: 7 },
      app: { id: 15368 },
    },
  ],
  rules,
  rulesets: fixtureRulesets(),
  lockfileSha256: "c".repeat(64),
  controlSha: sha,
  permission: "admin",
  pr: null,
});

test("owner-pinned live policy validates; unprovisioned targets fail closed and URL boundaries remain strict", async () => {
  const live = JSON.parse(await fs.readFile("hosting/policy.json"));
  validatePolicy(live);
  assert.equal(live.accountId, "45dcbe7b47e04e1f41dc571ceb86b40e");
  assert.equal(live.subdomain, "katpb");
  const unprovisioned = structuredClone(live);
  unprovisioned.targets.production = {
    ...live.targets.production,
    workerId: null,
    verified: false,
  };
  assert.throws(
    () =>
      resolveTarget(unprovisioned, {
        kind: "production",
        environment: "production",
        workflowRef: "refs/heads/main",
      }),
    /unverified|provision/,
  );
  const p = fixturePolicy();
  const t = resolveTarget(p, {
    kind: "preview",
    environment: "preview",
    workflowRef: "refs/heads/main",
    previewName: "pr-12",
  });
  assert.equal(
    new URL(
      validateProviderUrl(
        t,
        "https://pr-12-katpb-dev-preview.test.workers.dev/",
      ),
    ).protocol,
    "https:",
  );
  for (const u of [
    "http://pr-12-katpb-dev-preview.test.workers.dev",
    "https://evil.test",
    "https://katpb-dev-production.test.workers.dev",
    "https://u:p@pr-12-katpb-dev-preview.test.workers.dev",
    "https://pr-12-katpb-dev-preview.test.workers.dev:444/",
    "https://pr-12-katpb-dev-preview.test.workers.dev/?token=x",
  ])
    assert.throws(() => validateProviderUrl(t, u));
  for (const opts of [
    {
      kind: "production",
      environment: "preview",
      workflowRef: "refs/heads/main",
    },
    {
      kind: "preview",
      environment: "preview",
      workflowRef: "refs/heads/pull/1",
      previewName: "pr-12",
    },
    {
      kind: "preview",
      environment: "preview",
      workflowRef: "refs/heads/main",
      previewName: "pr-1;echo bad",
    },
  ])
    assert.throws(() => resolveTarget(p, opts));
  assert.throws(() => validatePolicy({ ...p, token: "secret" }), /field/);
  const config = generatedConfig(t, "/tmp/.deploy/assets");
  assert.equal(config.assets.not_found_handling, "none");
  assert.deepEqual(config.previews, {});
  assert.equal(config.preview_urls, true);
  assert.equal(config.workers_dev, true);
  for (const change of [
    { workersDev: false },
    { previewUrls: false },
    { previewUrls: undefined },
  ]) {
    const invalid = structuredClone(p);
    Object.assign(invalid.targets.preview, change);
    assert.throws(() => validatePolicy(invalid));
  }
  assert.throws(() =>
    generatedConfig({ ...t, previewUrls: false }, "/tmp/.deploy/assets"),
  );
  assert.equal(config.main, undefined);
  assert.equal(config.routes, undefined);
  const shortLocal = resolveTarget(p, {
    kind: "preview",
    environment: "preview",
    workflowRef: "refs/heads/main",
    previewName: "local-katpb-" + "a".repeat(32),
  });
  assert.doesNotThrow(() =>
    validateProviderUrl(
      shortLocal,
      "https://" +
        shortLocal.previewName +
        "-katpb-dev-preview.test.workers.dev/",
    ),
  );
  const overlong = {
    ...shortLocal,
    previewName: "local-katpb-" + "a".repeat(40),
  };
  assert.throws(() =>
    validateProviderUrl(
      overlong,
      "https://" +
        overlong.previewName +
        "-katpb-dev-preview.test.workers.dev/",
    ),
  );
});

test("active main protection requires PR/check source/integrity and no bypass", () => {
  const p = fixturePolicy();
  validateMainRules(rules, fixtureRulesets(), p);
  for (const defective of [
    rules.filter((r) => r.type !== "pull_request"),
    rules.filter((r) => r.type !== "deletion"),
    rules.filter((r) => r.type !== "non_fast_forward"),
    rules.filter((r) => r.type !== "required_status_checks"),
    rules.map((r) =>
      r.type === "required_status_checks"
        ? {
            ...r,
            parameters: {
              required_status_checks: [
                { context: "repository-health", integration_id: 1 },
              ],
            },
          }
        : r,
    ),
  ])
    assert.throws(() =>
      validateMainRules(
        defective,
        [{ enforcement: "active", bypass_actors: [], rules: defective }],
        p,
      ),
    );
  for (const set of [
    {
      enforcement: "active",
      bypass_actors: [{ actor_type: "RepositoryRole" }],
      rules,
    },
    { enforcement: "active", rules },
    { enforcement: "disabled", bypass_actors: [], rules },
  ])
    assert.throws(() => validateMainRules(rules, [set], p));
});

test("source authority binds exact workflow/run attempt/artifact/checks and current main", () => {
  const p = fixturePolicy();
  assert.equal(
    authorizeSource(
      facts(),
      {
        mode: "release",
        sourceSha: sha,
        runId: 10,
        runAttempt: 1,
        artifactId: 9,
      },
      p,
    ).sourceSha,
    sha,
  );
  for (const mutate of [
    (f) => (f.repository.full_name = "evil/repo"),
    (f) => (f.main.sha = "b".repeat(40)),
    (f) => (f.workflow.path = "evil.yml"),
    (f) => (f.run.head_sha = "b".repeat(40)),
    (f) => (f.run.run_attempt = 2),
    (f) => (f.run.conclusion = "failure"),
    (f) => (f.run.event = "workflow_dispatch"),
    (f) => (f.artifact.expired = true),
    (f) => (f.artifact.workflow_run.id = 11),
    (f) => (f.artifact.name = "latest"),
    (f) => (f.checks[0].app.id = 1),
    (f) => (f.checks[0].conclusion = "failure"),
    (f) => (f.controlSha = "b".repeat(40)),
  ]) {
    const f = facts();
    mutate(f);
    assert.throws(() =>
      authorizeSource(
        f,
        {
          mode: "release",
          sourceSha: sha,
          runId: 10,
          runAttempt: 1,
          artifactId: 9,
        },
        p,
      ),
    );
  }
});

test("recovery source requires successful main CI, live authorized main dispatch and protected ancestry", () => {
  const p = fixturePolicy();
  const input = {
    mode: "recovery",
    sourceSha: sha,
    runId: 10,
    runAttempt: 1,
    artifactId: 9,
    dispatchRunId: 20,
  };
  const recoveryFacts = () => ({
    ...facts(),
    controlFilesMatch: false,
    main: { sha: "b".repeat(40) },
    controlSha: "b".repeat(40),
    comparison: {
      base_commit: { sha },
      merge_base_commit: { sha },
      status: "ahead",
    },
    dispatchWorkflow: {
      id: 33,
      path: ".github/workflows/deploy.yml",
      state: "active",
    },
    dispatchRun: {
      id: 20,
      workflow_id: 33,
      head_branch: "main",
      head_sha: "b".repeat(40),
      event: "workflow_dispatch",
      status: "in_progress",
      repository: { full_name: p.repository },
      head_repository: { full_name: p.repository },
    },
    dispatchPermission: "write",
  });
  const result = authorizeSource(recoveryFacts(), input, p);
  assert.equal(result.event, "workflow_dispatch");
  assert.equal(result.sourceRef, "main");
  assert.equal(result.sourceSha, sha);
  assert.equal(result.controlSha, "b".repeat(40));
  assert.equal(result.pullRequest, null);
  assert.equal(result.baseSha, null);
  for (const mutate of [
    (f) => (f.comparison.merge_base_commit.sha = "c".repeat(40)),
    (f) => (f.comparison.base_commit.sha = "c".repeat(40)),
    (f) => (f.comparison.status = "diverged"),
    (f) => (f.dispatchRun.head_branch = "other"),
    (f) => (f.dispatchRun.head_sha = sha),
    (f) => (f.dispatchRun.event = "push"),
    (f) => (f.dispatchRun.status = "completed"),
    (f) => (f.dispatchRun.id = 21),
    (f) => (f.dispatchRun.workflow_id = 34),
    (f) => (f.dispatchRun.repository.full_name = "evil/repo"),
    (f) => (f.dispatchWorkflow.path = ".github/workflows/ci.yml"),
    (f) => (f.dispatchWorkflow.state = "disabled_manually"),
    (f) => (f.dispatchPermission = "read"),
    (f) => (f.run.event = "pull_request"),
    (f) => (f.run.head_branch = "feature"),
    (f) => (f.publicAstroAbsent = false),
    (f) => (f.rulesets[0] = { enforcement: "active" }),
  ]) {
    const f = recoveryFacts();
    mutate(f);
    assert.throws(() => authorizeSource(f, input, p));
  }
  assert.throws(() =>
    authorizeSource(recoveryFacts(), { ...input, dispatchRunId: 0 }, p),
  );
});

test("recovery lookup independently resolves dispatch actor, source ancestry and exact-run checks", async () => {
  const p = fixturePolicy(),
    f = facts();
  const current = "b".repeat(40);
  const seen = [];
  let unchanged = true;
  const fetch = async (url) => {
    const u = new URL(url);
    seen.push(u.pathname);
    assert.equal(u.origin, "https://api.github.com");
    const root = "/repos/katpb/katpb.dev";
    const values = {
      [root]: f.repository,
      [root + "/git/ref/heads/main"]: { object: { sha: current } },
      [root + "/actions/workflows/ci.yml"]: f.workflow,
      [root + "/actions/runs/10/attempts/1"]: f.run,
      [root + "/actions/artifacts/9"]: f.artifact,
      [root + "/rules/branches/main"]: rules.map((r) => ({
        ...r,
        ruleset_id: mainAudit.id,
      })),
      [root + "/rulesets"]: fixtureRulesets(),
      ...Object.fromEntries(
        fixtureRulesets().map((s) => [
          root + `/rulesets/${s.id}`,
          {
            ...s,
            ...(!unchanged && s.id === mainAudit.id
              ? { updated_at: "2099-01-01T00:00:00Z" }
              : {}),
          },
        ]),
      ),
      [root + "/check-suites/7/check-runs"]: { check_runs: f.checks },
      [root + "/actions/runs/20"]: {
        id: 20,
        workflow_id: 33,
        head_branch: "main",
        head_sha: current,
        event: "workflow_dispatch",
        status: "in_progress",
        repository: f.repository,
        head_repository: f.repository,
        triggering_actor: { login: "katpb" },
      },
      [root + "/actions/workflows/deploy.yml"]: {
        id: 33,
        path: ".github/workflows/deploy.yml",
        state: "active",
      },
      [root + `/compare/${sha}...${current}`]: {
        base_commit: { sha },
        merge_base_commit: { sha },
        status: "ahead",
      },
      [root + "/collaborators/katpb/permission"]: { permission: "write" },
      [root + "/contents/package-lock.json"]: {
        encoding: "base64",
        content: Buffer.from("locked bytes").toString("base64"),
      },
      [root + `/git/trees/${sha}`]: { truncated: false, tree: [] },
      [root + `/git/trees/${current}`]: { truncated: false, tree: [] },
    };
    assert.ok(Object.hasOwn(values, u.pathname), u.pathname);
    return new Response(JSON.stringify(values[u.pathname]), { status: 200 });
  };
  const input = {
    mode: "recovery",
    sourceSha: sha,
    runId: 10,
    runAttempt: 1,
    artifactId: 9,
    dispatchRunId: 20,
  };
  const result = await lookupSource(input, p, { fetch });
  assert.equal(result.event, "workflow_dispatch");
  assert.equal(result.controlSha, current);
  assert.ok(
    seen.includes(`/repos/katpb/katpb.dev/compare/${sha}...${current}`),
  );
  assert.ok(
    seen.includes("/repos/katpb/katpb.dev/collaborators/katpb/permission"),
  );
  unchanged = false;
  await assert.rejects(
    lookupSource(input, p, { fetch }),
    /revision|readback|audit/,
  );
});

test("rejected provider requests invoke no process and redact credential diagnostics", async () => {
  let calls = 0;
  const spawn = () => {
    calls++;
    throw Error("must not invoke");
  };
  const p = fixturePolicy();
  const target = resolveTarget(p, {
    kind: "production",
    environment: "production",
    workflowRef: "refs/heads/main",
  });
  for (const change of [
    {
      target: {
        ...target,
        accountId: "a20534600ae6a611d09360bbc2340c6f",
      },
    },
    { target: { ...target, subdomain: "another-account" } },
    { credential: null },
    { credential: { token: "do-not-print-123456789012345", workerId: "v" } },
    { operation: "evil" },
    { sourceSha: "bad; command" },
    { authorization: null },
  ]) {
    await assert.rejects(
      invokeProvider(
        {
          policy: p,
          target,
          operation: "deploy",
          sourceSha: sha,
          attemptId: "10-1",
          configPath: "/tmp/.deploy/wrangler.json",
          credential: { token: "do-not-print-123456789012345", workerId: "p" },
          authorization: {
            sourceSha: sha,
            controlSha: sha,
            validationResult: "success",
          },
          ...change,
        },
        { spawn },
      ),
      (e) => !e.message.includes("do-not-print"),
    );
  }
  assert.equal(calls, 0);
});
