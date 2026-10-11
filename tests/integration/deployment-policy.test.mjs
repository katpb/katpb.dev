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

const previewInput = {
  mode: "preview",
  sourceSha: sha,
  runId: 10,
  runAttempt: 1,
  artifactId: 9,
};
const previewFacts = () => ({
  ...facts(),
  run: {
    ...facts().run,
    event: "pull_request",
    head_branch: "review/preview",
    pull_requests: [{ number: 12 }],
  },
  pr: {
    number: 12,
    state: "open",
    user: { login: "katpb" },
    head: {
      sha,
      ref: "review/preview",
      repo: { full_name: "katpb/katpb.dev" },
    },
    base: {
      sha: "d".repeat(40),
      ref: "main",
      repo: { full_name: "katpb/katpb.dev" },
    },
  },
});

test("preview authorization records the exact PR head and its separate main base", () => {
  for (const permission of ["write", "maintain", "admin"]) {
    const f = previewFacts();
    f.permission = permission;
    const source = authorizeSource(f, previewInput, fixturePolicy());
    assert.equal(source.sourceSha, sha);
    assert.equal(source.sourceRef, "review/preview");
    assert.equal(source.pullRequest, 12);
    assert.equal(source.baseSha, "d".repeat(40));
    assert.equal(source.controlSha, sha);
    assert.equal(source.event, "pull_request");
    assert.equal(source.artifactId, 9);
    assert.equal(source.validationRunId, 10);
    assert.equal(source.runAttempt, 1);
  }
});

test("preview authorization rejects untrusted, stale, closed and ambiguous source identities", async (t) => {
  const cases = {
    "fork PR": (f) => (f.pr.head.repo.full_name = "contributor/katpb.dev"),
    "fork validation run": (f) =>
      (f.run.head_repository.full_name = "contributor/katpb.dev"),
    "foreign PR base": (f) => (f.pr.base.repo.full_name = "other/repo"),
    "non-main target": (f) => (f.pr.base.ref = "another-branch"),
    "closed PR": (f) => (f.pr.state = "closed"),
    "updated PR head": (f) => (f.pr.head.sha = "e".repeat(40)),
    "unvalidated head": (f) => (f.run.head_sha = "e".repeat(40)),
    "read-only author": (f) => (f.permission = "read"),
    "triage author": (f) => (f.permission = "triage"),
    "missing writer permission": (f) => (f.permission = null),
    "association is not permission": (f) => {
      f.permission = "read";
      f.pr.author_association = "OWNER";
    },
    "PR-authored trusted controls": (f) => (f.controlFilesMatch = false),
    "public immutable asset impersonation": (f) =>
      (f.publicAstroAbsent = false),
    "push run masquerading as PR": (f) => (f.run.event = "push"),
    "unbound PR number": (f) => (f.run.pull_requests = [{ number: 13 }]),
    "ambiguous run PRs": (f) =>
      (f.run.pull_requests = [{ number: 12 }, { number: 13 }]),
    "duplicate run PRs": (f) =>
      (f.run.pull_requests = [{ number: 12 }, { number: 12 }]),
    "invalid PR number": (f) => {
      f.pr.number = 0;
      f.run.pull_requests = [{ number: 0 }];
    },
    "missing PR head ref": (f) => delete f.pr.head.ref,
    "run and PR branch mismatch": (f) => (f.run.head_branch = "other"),
  };
  for (const [name, mutate] of Object.entries(cases))
    await t.test(name, () => {
      const f = previewFacts();
      mutate(f);
      assert.throws(() => authorizeSource(f, previewInput, fixturePolicy()));
    });
});

test("preview artifacts must belong to the selected successful run and attempt", async (t) => {
  const cases = {
    "different artifact ID": (f) => (f.artifact.id = 11),
    "different producing run": (f) => (f.artifact.workflow_run.id = 11),
    "different producing source": (f) =>
      (f.artifact.workflow_run.head_sha = "e".repeat(40)),
    "global latest name": (f) => (f.artifact.name = "latest"),
    "other attempt name": (f) => (f.artifact.name = `r4-raw-${sha}-10-2`),
    "expired artifact": (f) => (f.artifact.expired = true),
    "missing artifact digest": (f) => delete f.artifact.digest,
    "failed CI": (f) => (f.run.conclusion = "failure"),
    "unfinished CI": (f) => (f.run.status = "in_progress"),
    "other run attempt": (f) => (f.run.run_attempt = 2),
    "unapproved workflow": (f) => (f.run.workflow_id = 2),
    "wrong check app": (f) => (f.checks[0].app.id = 1),
    "wrong run check suite": (f) => (f.checks[0].check_suite.id = 8),
    "ambiguous exact-run checks": (f) =>
      f.checks.push(structuredClone(f.checks[0])),
  };
  for (const [name, mutate] of Object.entries(cases))
    await t.test(name, () => {
      const f = previewFacts();
      mutate(f);
      assert.throws(() => authorizeSource(f, previewInput, fixturePolicy()));
    });
});

test("preview lookup resolves exact-run authority and rechecks live PR state on each invocation", async () => {
  const p = fixturePolicy();
  const f = previewFacts();
  const root = "/repos/katpb/katpb.dev";
  const seen = [];
  const fetch = async (url) => {
    const u = new URL(url);
    assert.equal(u.origin, "https://api.github.com");
    seen.push(u.pathname);
    const values = {
      [root]: f.repository,
      [root + "/git/ref/heads/main"]: { object: { sha } },
      [root + "/actions/workflows/ci.yml"]: f.workflow,
      [root + "/actions/runs/10/attempts/1"]: f.run,
      [root + "/actions/artifacts/9"]: f.artifact,
      [root + "/rules/branches/main"]: rules,
      [root + "/rulesets"]: fixtureRulesets(),
      ...Object.fromEntries(
        fixtureRulesets().map((s) => [root + `/rulesets/${s.id}`, s]),
      ),
      [root + "/check-suites/7/check-runs"]: { check_runs: f.checks },
      [root + "/pulls/12"]: f.pr,
      [root + "/collaborators/katpb/permission"]: {
        permission: f.permission,
      },
      [root + "/contents/package-lock.json"]: {
        encoding: "base64",
        content: Buffer.from("locked bytes").toString("base64"),
      },
      [root + `/git/trees/${sha}`]: { truncated: false, tree: [] },
    };
    assert.ok(Object.hasOwn(values, u.pathname), u.pathname);
    return new Response(JSON.stringify(values[u.pathname]), { status: 200 });
  };

  const source = await lookupSource(previewInput, p, { fetch });
  assert.equal(source.pullRequest, 12);
  assert.equal(source.sourceSha, sha);
  assert.equal(source.sourceRef, f.pr.head.ref);
  for (const endpoint of [
    "/actions/runs/10/attempts/1",
    "/actions/artifacts/9",
    "/check-suites/7/check-runs",
    "/pulls/12",
    "/collaborators/katpb/permission",
  ])
    assert.ok(seen.includes(root + endpoint), endpoint);
  assert.ok(!seen.some((s) => s.endsWith("/actions/artifacts")));

  f.pr.head.sha = "e".repeat(40);
  await assert.rejects(lookupSource(previewInput, p, { fetch }), /stale/);
  f.pr.head.sha = sha;
  f.pr.state = "closed";
  await assert.rejects(lookupSource(previewInput, p, { fetch }), /closed/);
  f.pr.state = "open";
  f.permission = "read";
  await assert.rejects(
    lookupSource(previewInput, p, { fetch }),
    /unauthorized/,
  );
  f.permission = "write";
  f.run.pull_requests.push({ number: 13 });
  await assert.rejects(lookupSource(previewInput, p, { fetch }), /ambiguous/);
  assert.equal(seen.filter((s) => s === root + "/pulls/12").length, 4);
});

test("preview provider rejects PR-ref environment access and parent-Worker operations without spawning", async () => {
  const policy = fixturePolicy();
  const target = resolveTarget(policy, {
    kind: "preview",
    environment: "preview",
    workflowRef: "refs/heads/main",
    previewName: "pr-12",
  });
  let calls = 0;
  const spawn = () => {
    calls++;
    throw Error("must not invoke provider");
  };
  for (const [change, message] of [
    [
      { target: { ...target, workflowRef: "refs/pull/12/merge" } },
      /main authorization/,
    ],
    [{ target: { ...target, environment: "production" } }, /isolation/],
    [
      { target: { ...target, workerName: "katpb-dev-production" } },
      /trusted policy/,
    ],
    [{ operation: "deploy" }, /cannot deploy parent/],
    [{ target: { ...target, previewName: null } }, /preview name/],
    [{ target: { ...target, previewName: "../pr-12" } }, /preview name/],
  ])
    await assert.rejects(
      invokeProvider(
        {
          policy,
          target,
          operation: "preview",
          sourceSha: sha,
          attemptId: "10-1",
          configPath: "/tmp/.deploy/wrangler.json",
          credential: {
            token: "non-secret-canary-1234567890",
            workerId: target.workerId,
          },
          authorization: authorizeSource(previewFacts(), previewInput, policy),
          ...change,
        },
        { spawn },
      ),
      message,
    );
  assert.equal(calls, 0);
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

// Lifecycle callbacks stand in for separate trusted workflow jobs; no provider/network access.
const lifecycle = () => import("../../scripts/hosting/preview-lifecycle.mjs");
const oldSha = "b".repeat(40);
const oldUnique = "https://bbbbbbbb-katpb-dev-preview.test.workers.dev/";
const stable = "https://pr-12-katpb-dev-preview.test.workers.dev/";
function lifecycleFixture(overrides = {}) {
  const calls = [];
  let reads = 0;
  const input = {
    policy: fixturePolicy(),
    source: authorizeSource(previewFacts(), previewInput, fixturePolicy()),
    prior: { sourceSha: oldSha, uniqueUrl: oldUnique },
  };
  const dependencies = {
    readCurrent: async () => {
      calls.push("read");
      reads++;
      return { pr: previewFacts().pr, permission: "write" };
    },
    prepare: async () => {
      calls.push("prepare");
    },
    upload: async () => {
      calls.push("upload");
      return {
        providerDeploymentId: "aaaaaaaa",
        stableUrl: stable,
        uniqueUrl: "https://aaaaaaaa-katpb-dev-preview.test.workers.dev/",
      };
    },
    verifyHttps: async (url) => {
      calls.push("https:" + url);
    },
    verifyBrowser: async (url) => {
      calls.push("browser:" + url);
    },
    persist: async (record) => {
      calls.push("persist:" + record.state);
    },
    report: async (record) => {
      calls.push("report:" + record.state);
    },
    ...overrides,
  };
  return {
    input,
    dependencies,
    calls,
    get reads() {
      return reads;
    },
  };
}

test("preview lifecycle verifies both URLs and persists evidence before success reporting", async () => {
  const { executePreview } = await lifecycle();
  const f = lifecycleFixture();
  const result = await executePreview(f.input, f.dependencies);
  assert.equal(result.state, "verified");
  assert.equal(result.sourceSha, sha);
  assert.equal(result.previousVerified.uniqueUrl, oldUnique);
  assert.equal(result.stableVerified, true);
  assert.equal(
    f.reads,
    4,
    "initial, immediately before upload, after upload and before success",
  );
  for (const url of [result.stableUrl, result.uniqueUrl]) {
    assert.ok(f.calls.includes("https:" + url));
    assert.ok(f.calls.includes("browser:" + url));
  }
  assert.ok(f.calls.indexOf("persist:uploading") < f.calls.indexOf("upload"));
  assert.ok(
    f.calls.indexOf("persist:verified") < f.calls.indexOf("report:verified"),
  );
});

test("stale, closed and unauthorized PRs skip before upload without a success status", async (t) => {
  const { executePreview } = await lifecycle();
  for (const when of [1, 2])
    for (const disposition of ["stale", "closed", "authorization"])
      await t.test(`${disposition} at read ${when}`, async () => {
        let reads = 0;
        const f = lifecycleFixture({
          readCurrent: async () => {
            const pr = previewFacts().pr;
            reads++;
            if (reads === when) {
              if (disposition === "stale") pr.head.sha = oldSha;
              if (disposition === "closed") pr.state = "closed";
            }
            return {
              pr,
              permission:
                disposition === "authorization" && reads === when
                  ? "read"
                  : "write",
            };
          },
        });
        const result = await executePreview(f.input, f.dependencies);
        assert.equal(result.state, "skipped-" + disposition);
        assert.equal(result.stableVerified, false);
        assert.equal(result.previousVerified.uniqueUrl, oldUnique);
        assert.ok(!f.calls.includes("upload"));
        assert.ok(!f.calls.includes("report:verified"));
      });
});

test("PR changes during upload or verification never publish verified success", async (t) => {
  const { executePreview } = await lifecycle();
  for (const when of [3, 4])
    for (const disposition of ["stale", "closed"])
      await t.test(`${disposition} at read ${when}`, async () => {
        let reads = 0;
        const f = lifecycleFixture({
          readCurrent: async () => {
            const pr = previewFacts().pr;
            if (++reads >= when) {
              if (disposition === "stale") pr.head.sha = oldSha;
              else pr.state = "closed";
            }
            return { pr, permission: "write" };
          },
        });
        const result = await executePreview(f.input, f.dependencies);
        assert.equal(result.state, "skipped-" + disposition);
        assert.equal(result.inactive, disposition === "closed");
        assert.equal(result.cleanupRequired, disposition === "closed");
        assert.equal(result.stableVerified, false);
        assert.equal(result.previousVerified.uniqueUrl, oldUnique);
        assert.ok(f.calls.includes("upload"));
        assert.ok(!f.calls.includes("report:verified"));
      });
});

test("failed updates retain only prior verified unique identity; provider errors are redacted", async (t) => {
  const { executePreview } = await lifecycle();
  for (const stage of [
    "prepare",
    "upload",
    "verifyHttps",
    "verifyBrowser",
    "persist",
  ])
    await t.test(stage, async () => {
      const f = lifecycleFixture({
        [stage]: async () => {
          throw Error("secret-canary-do-not-copy");
        },
      });
      const result = await executePreview(f.input, f.dependencies);
      assert.notEqual(result.state, "verified");
      assert.equal(result.stableVerified, false);
      assert.equal(result.previousVerified.sourceSha, oldSha);
      assert.equal(result.previousVerified.uniqueUrl, oldUnique);
      assert.doesNotMatch(JSON.stringify(result), /secret-canary/);
      assert.ok(!f.calls.includes("report:verified"));
    });
});

test("preview reporting rejects forged or stable previous verified URLs before callbacks", async () => {
  const { executePreview } = await lifecycle();
  for (const prior of [
    { sourceSha: oldSha, uniqueUrl: stable },
    { sourceSha: oldSha, uniqueUrl: "https://evil.test/" },
    { sourceSha: "bad", uniqueUrl: oldUnique },
  ]) {
    const f = lifecycleFixture();
    f.input.prior = prior;
    await assert.rejects(executePreview(f.input, f.dependencies));
    assert.deepEqual(f.calls, []);
  }
});

test("cleanup rechecks closed authority, marks inactive on failed deletion and permits retry", async () => {
  const { cleanupPreview } = await lifecycle();
  const policy = fixturePolicy();
  const calls = [];
  const input = { policy, name: "pr-12", sourceSha: sha };
  const dependencies = {
    readCurrent: async () => ({
      pr: { ...previewFacts().pr, state: "closed" },
    }),
    remove: async () => {
      calls.push("remove");
      throw Error("secret-canary");
    },
    persist: async (record) => {
      calls.push("persist:" + record.state);
    },
    report: async (record) => {
      calls.push("report:" + record.inactive);
    },
  };
  const failed = await cleanupPreview(input, dependencies);
  assert.equal(failed.inactive, true);
  assert.equal(failed.state, "failed-deletion");
  assert.equal(failed.retryRequired, true);
  assert.doesNotMatch(JSON.stringify(failed), /secret-canary/);
  assert.ok(calls.includes("report:true"));
  const retried = await cleanupPreview(input, {
    ...dependencies,
    remove: async () => {},
  });
  assert.equal(retried.state, "deleted");
  assert.equal(retried.retryRequired, false);
});

test("cleanup rejects open/foreign PRs, parent Workers and unbound local names without removal", async () => {
  const { cleanupPreview, localPreviewName } = await lifecycle();
  let removals = 0;
  const dependencies = {
    readCurrent: async () => ({ pr: previewFacts().pr }),
    remove: async () => {
      removals++;
    },
    persist: async () => {},
    report: async () => {},
  };
  for (const name of [
    "pr-12",
    "pr-13",
    "katpb-dev-preview",
    "katpb-dev-production",
    "../pr-12",
    "local-other-" + sha.slice(0, 32),
    "local-katpb-" + oldSha.slice(0, 32),
  ])
    await assert.rejects(
      cleanupPreview(
        { policy: fixturePolicy(), name, sourceSha: sha },
        dependencies,
      ),
    );
  assert.equal(removals, 0);
  assert.equal(
    localPreviewName("katpb", sha),
    "local-katpb-" + sha.slice(0, 32),
  );
  await assert.rejects(
    cleanupPreview(
      { policy: fixturePolicy(), name: "pr-12", sourceSha: sha },
      {
        ...dependencies,
        readCurrent: async () => ({
          pr: {
            ...previewFacts().pr,
            state: "closed",
            head: {
              ...previewFacts().pr.head,
              repo: { full_name: "foreign/repo" },
            },
          },
        }),
      },
    ),
  );
  assert.equal(removals, 0);
  const local = await cleanupPreview(
    {
      policy: fixturePolicy(),
      name: localPreviewName("katpb", sha),
      sourceSha: sha,
    },
    {
      ...dependencies,
      readCurrent: async () => {
        throw Error("local cleanup must not look up a PR");
      },
    },
  );
  assert.equal(local.state, "deleted");
  assert.equal(removals, 1);
});

test("post-upload recording failures and metadata outages cannot become verified success", async (t) => {
  const { executePreview } = await lifecycle();
  for (const state of ["uploaded", "verified"])
    await t.test("persist " + state, async () => {
      const f = lifecycleFixture({
        persist: async (record) => {
          if (record.state === state) throw Error("storage unavailable");
        },
      });
      const result = await executePreview(f.input, f.dependencies);
      assert.equal(result.state, "unresolved");
      assert.equal(result.stableVerified, false);
      assert.equal(result.previousVerified.uniqueUrl, oldUnique);
      assert.ok(!f.calls.includes("report:verified"));
    });
  let reads = 0;
  const f = lifecycleFixture({
    readCurrent: async () => {
      if (++reads === 3) throw Error("metadata unavailable");
      return { pr: previewFacts().pr, permission: "write" };
    },
  });
  const result = await executePreview(f.input, f.dependencies);
  assert.equal(result.state, "unresolved");
  assert.equal(result.stableVerified, false);
  assert.ok(!f.calls.includes("report:verified"));
});

test("cleanup rechecks closure immediately before deletion after reporting", async () => {
  const { cleanupPreview } = await lifecycle();
  let reads = 0,
    removals = 0;
  const result = await cleanupPreview(
    { policy: fixturePolicy(), name: "pr-12", sourceSha: sha },
    {
      readCurrent: async () => ({
        pr: { ...previewFacts().pr, state: ++reads === 1 ? "closed" : "open" },
      }),
      remove: async () => {
        removals++;
      },
      persist: async () => {},
      report: async () => {},
    },
  );
  assert.equal(removals, 0);
  assert.equal(result.state, "failed-deletion");
  assert.equal(result.retryRequired, true);
});
