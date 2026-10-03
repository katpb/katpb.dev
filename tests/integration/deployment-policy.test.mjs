import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
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
} from "../../scripts/hosting/github.mjs";

const sha = "a".repeat(40);
const rules = [
  {
    type: "pull_request",
    parameters: {
      required_approving_review_count: 0,
      require_code_owner_review: false,
    },
  },
  { type: "deletion" },
  { type: "non_fast_forward" },
  {
    type: "required_status_checks",
    parameters: {
      required_status_checks: [
        { context: "repository-health", integration_id: 15368 },
      ],
      strict_required_status_checks_policy: true,
    },
  },
];
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
      verified: true,
    },
    preview: { workerName: "katpb-dev-preview", workerId: "v", verified: true },
    acceptance: {
      workerName: "katpb-dev-acceptance",
      workerId: "a",
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
  rulesets: [{ enforcement: "active", bypass_actors: [], rules }],
  lockfileSha256: "c".repeat(64),
  controlSha: sha,
  permission: "admin",
  pr: null,
});

test("unprovisioned live policy fails closed; strict target and URL validation", async () => {
  const live = JSON.parse(await fs.readFile("hosting/policy.json"));
  validatePolicy(live);
  assert.throws(
    () =>
      resolveTarget(live, {
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
  assert.equal(config.main, undefined);
  assert.equal(config.routes, undefined);
});

test("active main protection requires PR/check source/integrity and no bypass", () => {
  const p = fixturePolicy();
  validateMainRules(
    rules,
    [{ enforcement: "active", bypass_actors: [], rules }],
    p,
  );
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
