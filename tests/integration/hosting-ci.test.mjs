import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse } from "yaml";

test("CI covers every PR/main push with a read-only stable exact-source full gate", () => {
  const ci = parse(readFileSync(".github/workflows/ci.yml", "utf8"));
  assert.equal(ci.name, "CI");
  assert.deepEqual(ci.on.pull_request.branches, ["main"]);
  assert.deepEqual(ci.on.push.branches, ["main"]);
  assert.equal(ci.on.pull_request.paths, undefined);
  assert.equal(ci.on.push.paths, undefined);
  assert.deepEqual(ci.permissions, { contents: "read" });
  assert.deepEqual(Object.keys(ci.jobs), ["repository-health"]);
  const job = ci.jobs["repository-health"];
  assert.equal(job.environment, undefined);
  assert.equal(job.name, "repository-health");
  for (const s of job.steps.filter((s) => s.uses))
    assert.match(s.uses, /^actions\/[a-z-]+@[a-f0-9]{40}$/);
  const checkout = job.steps.find((s) =>
    s.uses?.startsWith("actions/checkout@"),
  );
  assert.equal(checkout.with["persist-credentials"], false);
  assert.match(checkout.with.ref, /pull_request.head.sha/);
  const node = job.steps.find((s) => s.uses?.startsWith("actions/setup-node@"));
  assert.equal(node.with["node-version"], "24.21.0");
  assert.equal(node.with["package-manager-cache"], false);
  const shell = job.steps
    .filter((s) => s.run)
    .map((s) => s.run)
    .join("\n");
  assert.match(shell, /npm ci --ignore-scripts/);
  assert.match(
    shell,
    /@playwright\/test\/cli.js install --with-deps chromium webkit/,
  );
  assert.match(shell, /release:prepare/);
  assert.match(shell, /archive-raw/);
  assert.doesNotMatch(shell, /npx|CLOUDFLARE|secrets\./);
  const upload = job.steps.find((s) =>
    s.uses?.startsWith("actions/upload-artifact@"),
  );
  assert.match(upload.with.name, /github.run_attempt/);
  assert.equal(upload.with["if-no-files-found"], "error");
  assert.equal(upload.with.path, ".deploy/handoff/");
});
