import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  canonical,
  digest,
  encodeArchive,
  manifestFor,
} from "../../scripts/hosting/release-records.mjs";
const module = () => import("../../scripts/release-orchestrator.mjs");
const sha = "a".repeat(40),
  controlSha = "b".repeat(40);
const policy = JSON.parse(await fs.readFile("hosting/policy.json"));
const pr = () => ({
  number: 12,
  state: "open",
  user: { login: "katpb" },
  head: { sha, ref: "review/example", repo: { full_name: policy.repository } },
  base: {
    sha: "c".repeat(40),
    ref: "main",
    repo: { full_name: policy.repository },
  },
});
const run = () => ({
  id: 10,
  run_attempt: 2,
  workflow_id: policy.workflow.id,
  event: "pull_request",
  name: "CI",
  head_sha: sha,
  head_branch: "review/example",
  status: "completed",
  conclusion: "success",
  repository: { full_name: policy.repository },
  head_repository: { full_name: policy.repository },
  pull_requests: [{ number: 12 }],
});
const artifact = () => ({
  id: 9,
  name: `r4-raw-${sha}-10-2`,
  expired: false,
  size_in_bytes: 1000,
  digest: "sha256:" + "d".repeat(64),
  workflow_run: { id: 10, head_sha: sha },
});
const source = () => ({
  repository: policy.repository,
  sourceSha: sha,
  controlSha,
  sourceRef: "review/example",
  event: "pull_request",
  pullRequest: 12,
  baseSha: "c".repeat(40),
  validationRunId: 10,
  runAttempt: 2,
  artifactId: 9,
  nodeVersion: "24.21.0",
  npmVersion: "11.21.0",
  lockfileSha256: "e".repeat(64),
  validationResult: "success",
  artifactDigest: artifact().digest,
});
function dependencies() {
  const seen = [];
  const f = {
    pr: pr(),
    run: run(),
    artifacts: [artifact()],
    permission: "write",
    seen,
    authorizations: 0,
  };
  f.api = {
    get: async (endpoint) => {
      seen.push(endpoint);
      if (endpoint.endsWith("/attempts/2")) return f.run;
      if (endpoint.endsWith("/pulls/12")) return f.pr;
      if (endpoint.endsWith("/permission")) return { permission: f.permission };
      throw Error("unexpected endpoint " + endpoint);
    },
    pages: async (endpoint) => {
      seen.push(endpoint);
      return f.artifacts;
    },
  };
  f.authorize = async (input) => {
    f.authorizations++;
    assert.deepEqual(input, {
      mode: "preview",
      sourceSha: sha,
      runId: 10,
      runAttempt: 2,
      artifactId: 9,
    });
    return source();
  };
  f.controlSha = controlSha;
  f.orchestrationRunId = 20;
  f.orchestrationRunAttempt = 1;
  return f;
}
const event = () => ({
  repository: { full_name: policy.repository, default_branch: "main" },
  workflow_run: run(),
});

test("preview resolution derives live PR, writer, exact attempt/artifact and separate control identity", async () => {
  const { resolvePreview } = await module();
  const f = dependencies();
  const c = await resolvePreview(event(), policy, f);
  assert.equal(c.state, "prepared-metadata");
  assert.equal(c.source.sourceSha, sha);
  assert.equal(c.source.controlSha, controlSha);
  assert.equal(c.source.pullRequest, 12);
  assert.equal(c.source.artifactId, 9);
  assert.equal(f.authorizations, 1);
  assert.ok(f.seen.some((s) => s.endsWith("/actions/runs/10/attempts/2")));
  assert.ok(
    f.seen.some((s) =>
      s.startsWith("/repos/katpb/katpb.dev/actions/runs/10/artifacts"),
    ),
  );
  assert.ok(!f.seen.includes("/repos/katpb/katpb.dev/actions/artifacts"));
});

test("stale, closed, forked, non-main and read-only PRs record skips without artifact consumption", async (t) => {
  const { resolvePreview } = await module();
  for (const kind of ["stale", "closed", "fork", "base", "permission"])
    await t.test(kind, async () => {
      const f = dependencies();
      if (kind === "stale") f.pr.head.sha = "f".repeat(40);
      if (kind === "closed") f.pr.state = "closed";
      if (kind === "fork") f.pr.head.repo.full_name = "foreign/repo";
      if (kind === "base") f.pr.base.ref = "other";
      if (kind === "permission") f.permission = "read";
      const c = await resolvePreview(event(), policy, f);
      assert.equal(
        c.state,
        kind === "closed"
          ? "skipped-closed"
          : kind === "stale"
            ? "skipped-stale"
            : "skipped-authorization",
      );
      assert.equal(f.authorizations, 0);
      assert.ok(!f.seen.some((s) => s.includes("/artifacts")));
    });
});

test("invalid CI identity, ambiguous exact artifacts and pinned-control mismatch fail closed", async (t) => {
  const { resolvePreview } = await module();
  for (const kind of [
    "workflow",
    "failure",
    "attempt",
    "duplicate",
    "expired",
    "digest",
    "oversize",
    "control",
  ])
    await t.test(kind, async () => {
      const f = dependencies();
      if (kind === "workflow") f.run.workflow_id = 1;
      if (kind === "failure") f.run.conclusion = "failure";
      if (kind === "attempt") f.run.run_attempt = 3;
      if (kind === "duplicate") f.artifacts.push(artifact());
      if (kind === "expired") f.artifacts[0].expired = true;
      if (kind === "digest") f.artifacts[0].digest = null;
      if (kind === "oversize") f.artifacts[0].size_in_bytes = 1024 ** 3;
      if (kind === "control") f.controlSha = "c".repeat(40);
      await assert.rejects(resolvePreview(event(), policy, f));
    });
});

test("mutation rechecks live authority immediately before upload and after upload; failed update retains prior URL", async () => {
  const { resolvePreview, mutatePreview } = await module();
  const c = await resolvePreview(event(), policy, dependencies());
  c.packageDigest = "d".repeat(64);
  c.previousVerified = {
    sourceSha: "c".repeat(40),
    uniqueUrl: "https://cccccccc-katpb-dev-preview.katpb.workers.dev/",
  };
  for (const skip of [
    "skipped-stale",
    "skipped-closed",
    "skipped-authorization",
  ]) {
    let mutations = 0;
    const result = await mutatePreview(c, {
      recheck: async () => skip,
      upload: async () => {
        mutations++;
      },
      persist: async () => {},
    });
    assert.equal(result.state, skip);
    assert.equal(mutations, 0);
    assert.equal(
      result.previousVerified.uniqueUrl,
      c.previousVerified.uniqueUrl,
    );
  }
  const calls = [];
  const failed = await mutatePreview(c, {
    recheck: async () => {
      calls.push("read");
      return null;
    },
    upload: async () => {
      calls.push("upload");
      throw Error("secret-canary");
    },
    persist: async (r) => calls.push("persist:" + r.state),
  });
  assert.deepEqual(calls.slice(0, 3), ["persist:uploading", "read", "upload"]);
  assert.equal(failed.state, "unresolved");
  assert.equal(failed.stableVerified, false);
  assert.doesNotMatch(JSON.stringify(failed), /secret-canary/);
  assert.equal(failed.previousVerified.uniqueUrl, c.previousVerified.uniqueUrl);
});

test("raw handoff must match independently authorized source and lockfile; candidate controls cannot be served", async (t) => {
  const { resolvePreview, packagePreview } = await module();
  const c = await resolvePreview(event(), policy, dependencies());
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "r4-preview-handoff-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const input = path.join(root, "input");
  await fs.mkdir(input);
  const files = new Map([
    ["index.html", Buffer.from("<!doctype html><h1>Fixture</h1>")],
  ]);
  const entries = manifestFor(files);
  const evidence = {
    schemaVersion: 1,
    sourceSha: sha,
    rawDigest: digest(entries),
    lockfileSha256: c.source.lockfileSha256,
    nodeVersion: "24.21.0",
    npmVersion: "11.21.0",
    validationResult: "success",
    clean: true,
    reproducibility: { rawEqual: true, trackedEqual: true },
  };
  await fs.writeFile(path.join(input, "raw.tar"), encodeArchive(files));
  await fs.writeFile(path.join(input, "raw-manifest.json"), canonical(entries));
  await fs.writeFile(path.join(input, "provenance.json"), canonical(evidence));
  const manifest = await packagePreview(
    c,
    input,
    path.join(root, ".deploy/good"),
    policy,
  );
  assert.equal(manifest.sourceSha, sha);
  assert.ok(manifest.packageManifest.some((e) => e.path === "_headers"));
  await fs.writeFile(
    path.join(input, "provenance.json"),
    canonical({ ...evidence, lockfileSha256: "f".repeat(64) }),
  );
  await assert.rejects(
    packagePreview(c, input, path.join(root, ".deploy/bad"), policy),
  );
  await fs.writeFile(
    path.join(input, "wrangler.json"),
    '{"name":"katpb-dev-production"}',
  );
  await assert.rejects(
    packagePreview(c, input, path.join(root, ".deploy/controls"), policy),
  );
});

test("verification checks both URLs without provider credentials and result persistence precedes success", async () => {
  const { verifyPreview, publishPreview } = await module();
  const c = await (
    await module()
  ).resolvePreview(event(), policy, dependencies());
  const uploaded = {
    ...c,
    state: "uploaded",
    providerDeploymentId: "aaaaaaaa",
    stableVerified: false,
    stableUrl: "https://pr-12-katpb-dev-preview.katpb.workers.dev/",
    uniqueUrl: "https://aaaaaaaa-katpb-dev-preview.katpb.workers.dev/",
  };
  const checks = [];
  const verified = await verifyPreview(uploaded, {
    https: async (u) => checks.push("https:" + u),
    browser: async (u) => checks.push("browser:" + u),
  });
  assert.equal(verified.state, "checks-passed");
  assert.equal(checks.length, 4);
  const calls = [];
  const final = await publishPreview(verified, {
    recheck: async () => null,
    persist: async (r) => calls.push("persist:" + r.state),
    status: async (_r, s) => calls.push("status:" + s),
  });
  assert.equal(final.state, "verified");
  assert.deepEqual(calls, ["persist:verified", "status:success"]);
  const closed = await publishPreview(verified, {
    recheck: async () => "skipped-closed",
    persist: async () => {},
    status: async (_r, s) => assert.equal(s, "inactive"),
  });
  assert.equal(closed.state, "skipped-closed");
  assert.equal(closed.cleanupRequired, true);
  await assert.rejects(
    publishPreview(verified, {
      recheck: async () => null,
      persist: async () => {
        throw Error("storage");
      },
      status: async () => assert.fail("must not report success"),
    }),
  );
});

test("fork runs without PR bindings explicitly skip without resolving or downloading an artifact", async () => {
  const { resolvePreview } = await module();
  const f = dependencies();
  f.run.head_repository.full_name = "foreign/repo";
  f.run.pull_requests = [];
  const c = await resolvePreview(event(), policy, f);
  assert.equal(c.state, "skipped-authorization");
  assert.equal(c.pullRequest, null);
  assert.equal(c.ci.runId, 10);
  assert.equal(c.ci.runAttempt, 2);
  assert.equal(c.ci.artifactId, null);
  assert.equal(f.authorizations, 0);
  assert.equal(f.seen.length, 1);
});
