import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  priorVerified,
  validatePriorProof,
  createDeployment,
  markInactive,
  validateContext,
  runCredentialFree,
} from "../../scripts/hosting/preview-runtime.mjs";
import { deleteNamedPreview } from "../../scripts/hosting/preview-delete-provider.mjs";
const policy = JSON.parse(await fs.readFile("hosting/policy.json"));
const sourceSha = "a".repeat(40),
  controlSha = "b".repeat(40);
const uniqueUrl = "https://aaaaaaaa-katpb-dev-preview.katpb.workers.dev/";
const context = () => ({
  schemaVersion: 1,
  sourceSha,
  controlSha,
  pullRequest: 12,
  source: {
    repository: policy.repository,
    sourceSha,
    controlSha,
    pullRequest: 12,
    sourceRef: "review/example",
    event: "pull_request",
    baseSha: "c".repeat(40),
    validationRunId: 10,
    runAttempt: 2,
    artifactId: 9,
    nodeVersion: "24.21.0",
    npmVersion: "11.21.0",
    lockfileSha256: "e".repeat(64),
    validationResult: "success",
    artifactDigest: "sha256:" + "d".repeat(64),
  },
  orchestrationRunId: 20,
  orchestrationRunAttempt: 1,
  state: "prepared-metadata",
  logUrl: "https://github.com/katpb/katpb.dev/actions/runs/20",
});
const bot = { login: "github-actions[bot]" };

test("explicit GitHub Deployment binds head SHA rather than control and keeps prior deployments active", async () => {
  const seen = [];
  const id = await createDeployment(context(), {
    post: async (endpoint, body) => {
      seen.push({ endpoint, body });
      return { id: 42, sha: sourceSha, environment: "preview-pr-12" };
    },
  });
  assert.equal(id, 42);
  assert.equal(seen[0].endpoint, "/repos/katpb/katpb.dev/deployments");
  assert.equal(seen[0].body.ref, sourceSha);
  assert.equal(seen[0].body.auto_merge, false);
  assert.equal(seen[0].body.production_environment, false);
  assert.equal(seen[0].body.payload.context.controlSha, controlSha);
  assert.equal(seen[1].body.state, "in_progress");
  assert.equal(seen[1].body.auto_inactive, false);
});

test("inactive reporting is confined to bot-created previews for the exact closed PR", async () => {
  const good = {
    id: 1,
    environment: "preview-pr-12",
    creator: bot,
    payload: { r4Preview: 1, context: { pullRequest: 12 } },
  };
  const seen = [];
  await markInactive(12, {
    pages: async () => [
      good,
      { ...good, id: 2, environment: "production" },
      { ...good, id: 3, creator: { login: "unknown" } },
      {
        ...good,
        id: 4,
        payload: { r4Preview: 1, context: { pullRequest: 13 } },
      },
    ],
    post: async (endpoint, body) => {
      seen.push(endpoint);
      assert.equal(body.state, "inactive");
    },
  });
  assert.deepEqual(seen, ["/repos/katpb/katpb.dev/deployments/1/statuses"]);
});

function history() {
  const c = context();
  const d = {
    id: 1,
    sha: sourceSha,
    environment: "preview-pr-12",
    creator: bot,
    payload: { r4Preview: 1, context: c },
  };
  const status = { state: "success", creator: bot, environment_url: uniqueUrl };
  const run = {
    workflow_id: 100,
    event: "workflow_run",
    head_branch: "main",
    head_sha: controlSha,
    status: "completed",
    conclusion: "success",
    repository: { full_name: policy.repository },
    head_repository: { full_name: policy.repository },
  };
  const artifact = {
    id: 30,
    expired: false,
    name: "r4-preview-final-20-1",
    workflow_run: { id: 20 },
    digest: "sha256:" + "c".repeat(64),
  };
  const f = { d, status, run, artifact };
  f.api = {
    pages: async (endpoint) =>
      endpoint.includes("/statuses")
        ? [f.status]
        : endpoint.includes("/artifacts")
          ? [f.artifact]
          : [f.d],
    get: async (endpoint) =>
      endpoint.endsWith("deploy.yml")
        ? { id: 100, path: ".github/workflows/deploy.yml" }
        : endpoint.includes("/compare/")
          ? {
              base_commit: { sha: controlSha },
              merge_base_commit: { sha: controlSha },
              status: "identical",
            }
          : f.run,
  };
  return f;
}

test("prior verified identity needs a successful trusted-main run and its immutable exact-attempt receipt", async () => {
  const f = history();
  const proof = await priorVerified(policy, 12, f.api);
  assert.equal(proof.artifactId, 30);
  const record = {
    ...context(),
    state: "verified",
    stableVerified: true,
    uniqueUrl,
  };
  assert.deepEqual(validatePriorProof(proof, record, 12, policy), {
    sourceSha,
    uniqueUrl,
  });
  for (const changed of [
    { ...record, sourceSha: controlSha },
    { ...record, state: "uploaded" },
    { ...record, orchestrationRunAttempt: 2 },
    {
      ...record,
      uniqueUrl: "https://bbbbbbbb-katpb-dev-preview.katpb.workers.dev/",
    },
  ])
    assert.throws(() => validatePriorProof(proof, changed, 12, policy));
});

test("forged prior success, expired receipt and non-main workflow cannot grant previous verified identity", async () => {
  for (const kind of ["workflow", "branch", "expiry", "digest", "url"]) {
    const f = history();
    if (kind === "workflow") f.run.workflow_id = 101;
    if (kind === "branch") f.run.head_branch = "review/evil";
    if (kind === "expiry") f.artifact.expired = true;
    if (kind === "digest") f.artifact.digest = null;
    if (kind === "url")
      f.status.environment_url =
        "https://pr-12-katpb-dev-preview.katpb.workers.dev/";
    await assert.rejects(priorVerified(policy, 12, f.api));
  }
});

test("workflow handoff binds the pinned control and current orchestration run attempt", () => {
  const env = { GITHUB_RUN_ID: "20", GITHUB_RUN_ATTEMPT: "1" };
  assert.equal(
    validateContext(context(), controlSha, env).sourceSha,
    sourceSha,
  );
  for (const c of [
    { ...context(), controlSha: sourceSha },
    { ...context(), orchestrationRunId: 21 },
    { ...context(), orchestrationRunAttempt: 2 },
    { ...context(), source: { ...context().source, sourceSha: controlSha } },
  ])
    assert.throws(() => validateContext(c, controlSha, env));
});

test("cleanup provider emits only scoped named-preview arguments and verifies absence without copying credentials", async () => {
  let gets = 0,
    mutations = 0,
    reads = 0;
  const result = await deleteNamedPreview(
    {
      policy,
      name: "pr-12",
      controlSha,
      credential: {
        workerId: policy.targets.preview.workerId,
        token: "non-secret-canary-1234567890",
      },
      recheck: async () => {
        reads++;
      },
    },
    {
      execute: async ({ args, target, env }) => {
        mutations++;
        assert.deepEqual(args.slice(0, 2), ["preview", "delete"]);
        assert.equal(
          args[args.indexOf("--worker-name") + 1],
          "katpb-dev-preview",
        );
        assert.equal(args[args.indexOf("--name") + 1], "pr-12");
        assert.equal(target.kind, "preview");
        assert.equal(env.NODE_OPTIONS, undefined);
        assert.equal(env.GH_TOKEN, undefined);
      },
      fetch: async (url, options) => {
        assert.equal(
          new URL(url).pathname,
          `/client/v4/accounts/${policy.accountId}/workers/workers/katpb-dev-preview/previews/pr-12`,
        );
        assert.equal(options.redirect, "error");
        gets++;
        return gets === 1
          ? Response.json({ success: true, result: { name: "pr-12" } })
          : Response.json(
              { success: false, errors: [{ code: 10025 }] },
              { status: 404 },
            );
      },
    },
  );
  assert.equal(result.absenceVerified, true);
  assert.equal(mutations, 1);
  assert.equal(reads, 2);
  assert.doesNotMatch(JSON.stringify(result), /canary/);
});

test("cleanup absence retry is idempotent; target spoofing and reopened closure cause zero mutations", async () => {
  let mutations = 0;
  const credential = {
    workerId: policy.targets.preview.workerId,
    token: "non-secret-canary-1234567890",
  };
  const dependencies = {
    execute: async () => {
      mutations++;
    },
    fetch: async () =>
      Response.json(
        { success: false, errors: [{ code: 10025 }] },
        { status: 404 },
      ),
  };
  const result = await deleteNamedPreview(
    { policy, name: "pr-12", controlSha, credential, recheck: async () => {} },
    dependencies,
  );
  assert.equal(result.absenceVerified, true);
  assert.equal(mutations, 0);
  for (const name of ["katpb-dev-preview", "katpb-dev-production", "../pr-12"])
    await assert.rejects(
      deleteNamedPreview(
        { policy, name, controlSha, credential, recheck: async () => {} },
        dependencies,
      ),
    );
  await assert.rejects(
    deleteNamedPreview(
      {
        policy,
        name: "pr-12",
        controlSha,
        credential,
        recheck: async () => {
          throw Error("reopened");
        },
      },
      dependencies,
    ),
  );
  assert.equal(mutations, 0);
});

test("hosted subprocess strips all credentials and injected Node/npm settings", () => {
  const keys = [
    "CLOUDFLARE_API_TOKEN",
    "GH_TOKEN",
    "NODE_OPTIONS",
    "npm_config_userconfig",
  ];
  const before = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  try {
    process.env.CLOUDFLARE_API_TOKEN = "canary";
    process.env.GH_TOKEN = "canary";
    process.env.NODE_OPTIONS = "--import /absent-candidate.mjs";
    process.env.npm_config_userconfig = "/absent";
    runCredentialFree([
      "--input-type=module",
      "-e",
      "if (Object.keys(process.env).some(k => /TOKEN|SECRET|NODE_OPTIONS|userconfig/.test(k))) process.exit(1)",
    ]);
  } finally {
    for (const k of keys)
      before[k] === undefined
        ? delete process.env[k]
        : (process.env[k] = before[k]);
  }
});
