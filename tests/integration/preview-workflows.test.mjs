import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { parse } from "yaml";
const load = async (p) => parse(await fs.readFile(p, "utf8"));

test("preview deployment jobs use pinned main control and serialize all credential boundaries", async () => {
  const w = await load(".github/workflows/deploy.yml");
  assert.deepEqual(w.on.workflow_run, {
    workflows: ["CI"],
    types: ["completed"],
  });
  assert.ok(w.on.workflow_dispatch.inputs.source_sha);
  assert.deepEqual(w.permissions, {});
  assert.deepEqual(w.concurrency, {
    group: "r4-hosting",
    "cancel-in-progress": false,
    queue: "max",
  });
  assert.match(w["run-name"], /workflow_run.head_sha/);
  assert.deepEqual(
    Object.keys(w.jobs).filter((n) => !n.startsWith("production_")),
    ["prepare", "announce", "provider", "verify", "report"],
  );
  assert.match(w.jobs.prepare.if, /workflow_run.conclusion == 'success'/);
  assert.match(w.jobs.prepare.if, /workflow_run.workflow_id == 374100170/);
  assert.deepEqual(w.jobs.prepare.permissions, {
    contents: "read",
    actions: "read",
    "pull-requests": "read",
    deployments: "read",
  });
  assert.deepEqual(w.jobs.provider.environment, {
    name: "preview",
    deployment: false,
  });
  for (const [name, job] of Object.entries(w.jobs).filter(
    ([n]) => !n.startsWith("production_"),
  )) {
    if (name !== "provider") assert.equal(job.environment, undefined);
    const checkout = job.steps.find((s) =>
      s.uses?.startsWith("actions/checkout@"),
    );
    assert.equal(checkout.with["persist-credentials"], false);
    assert.equal(
      checkout.with.ref,
      name === "prepare"
        ? "refs/heads/main"
        : "${{ needs.prepare.outputs.control_sha }}",
    );
    for (const s of job.steps.filter((s) => s.uses))
      assert.match(s.uses, /^actions\/[a-z-]+@[a-f0-9]{40}$/);
    const text = JSON.stringify(job);
    assert.doesNotMatch(
      text,
      /pull_request.head|npx|\/issues\/|secrets\.(?!CLOUDFLARE_API_TOKEN)/,
    );
    if (name !== "provider")
      assert.doesNotMatch(text, /secrets\.|CLOUDFLARE_API_TOKEN/);
  }
  const provider = w.jobs.provider;
  const secretSteps = provider.steps.filter((s) =>
    JSON.stringify(s).includes("secrets."),
  );
  assert.equal(secretSteps.length, 1);
  assert.equal(
    secretSteps[0].env.CLOUDFLARE_API_TOKEN,
    "${{ secrets.CLOUDFLARE_API_TOKEN }}",
  );
  assert.match(secretSteps[0].run, /--stage provider/);
  const candidate = w.jobs.prepare.steps.find(
    (s) => s.name === "Download exact validated CI artifact",
  );
  assert.equal(
    candidate.with["artifact-ids"],
    "${{ steps.resolve.outputs.artifact_id }}",
  );
  assert.equal(candidate.with["run-id"], "${{ github.event.workflow_run.id }}");
  assert.equal(candidate.with.path, ".deploy/candidate");
  assert.equal(w.jobs.verify.permissions.deployments, undefined);
  assert.match(w.jobs.report.if, /always\(\)/);
  assert.equal(w.jobs.report.permissions.deployments, "write");
});

test("cleanup uses default-main closed-PR metadata, the shared lock, preview-only secret and inactive reporting", async () => {
  const w = await load(".github/workflows/preview-cleanup.yml");
  assert.deepEqual(w.on.pull_request_target, {
    types: ["closed"],
    branches: ["main"],
  });
  assert.ok(w.on.workflow_dispatch.inputs.pr_number);
  assert.deepEqual(w.permissions, {});
  assert.deepEqual(w.concurrency, {
    group: "r4-hosting",
    "cancel-in-progress": false,
    queue: "max",
  });
  assert.deepEqual(Object.keys(w.jobs), [
    "prepare",
    "inactive",
    "provider",
    "report",
  ]);
  assert.deepEqual(w.jobs.provider.environment, {
    name: "preview",
    deployment: false,
  });
  assert.ok(w.jobs.provider.needs.includes("inactive"));
  for (const [name, job] of Object.entries(w.jobs)) {
    const checkout = job.steps.find((s) =>
      s.uses?.startsWith("actions/checkout@"),
    );
    assert.equal(checkout.with["persist-credentials"], false);
    assert.equal(
      checkout.with.ref,
      name === "prepare"
        ? "refs/heads/main"
        : "${{ needs.prepare.outputs.control_sha }}",
    );
    assert.doesNotMatch(
      JSON.stringify(job),
      /pull_request.head|npx|production|acceptance|\/issues\//,
    );
    if (name !== "provider") assert.equal(job.environment, undefined);
  }
  assert.equal(w.jobs.inactive.permissions.deployments, "write");
  assert.match(w.jobs.report.if, /always\(\)/);
  assert.equal(w.jobs.report.permissions.deployments, "write");
});
