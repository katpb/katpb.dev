import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { spawnSync } from "node:child_process";
const module = () => import("../../scripts/cleanup-preview.mjs");
const policy = JSON.parse(await fs.readFile("hosting/policy.json"));
const sha = "a".repeat(40);
const pr = () => ({
  number: 12,
  state: "closed",
  user: { login: "katpb" },
  head: { sha, repo: { full_name: policy.repository } },
  base: { ref: "main", repo: { full_name: policy.repository } },
});

test("cleanup derives only authoritative closed same-repository main-target PR names", async () => {
  const { resolveCleanup } = await module();
  const c = await resolveCleanup(12, policy, {
    read: async () => pr(),
    controlSha: sha,
  });
  assert.equal(c.previewName, "pr-12");
  assert.equal(c.sourceSha, sha);
  for (const kind of ["open", "foreign", "base", "number"])
    await assert.rejects(
      resolveCleanup(12, policy, {
        controlSha: sha,
        read: async () => {
          const p = pr();
          if (kind === "open") p.state = "open";
          if (kind === "foreign") p.head.repo.full_name = "foreign/repo";
          if (kind === "base") p.base.ref = "other";
          if (kind === "number") p.number = 13;
          return p;
        },
      }),
    );
});

test("cleanup marks inactive, retains failed-deletion quota accounting, and reports a retry", async () => {
  const { resolveCleanup, performCleanup } = await module();
  const c = await resolveCleanup(12, policy, {
    read: async () => pr(),
    controlSha: sha,
  });
  const calls = [];
  const result = await performCleanup(c, policy, {
    read: async () => pr(),
    inactive: async () => calls.push("inactive"),
    remove: async (target) => {
      assert.equal(target.kind, "preview");
      assert.equal(target.previewName, "pr-12");
      calls.push("remove");
      throw Error("secret-canary");
    },
    persist: async (r) => calls.push("persist:" + r.state),
  });
  assert.ok(calls.indexOf("inactive") < calls.indexOf("remove"));
  assert.equal(result.state, "failed-deletion");
  assert.equal(result.inactive, true);
  assert.equal(result.capacityReleased, false);
  assert.equal(result.retryRequired, true);
  assert.doesNotMatch(JSON.stringify(result), /secret-canary/);
  const retry = await performCleanup(c, policy, {
    read: async () => pr(),
    inactive: async () => {},
    remove: async () => ({ absenceVerified: true }),
    persist: async () => {},
  });
  assert.equal(retry.state, "deleted");
  assert.equal(retry.capacityReleased, true);
});

test("reopened PR and invalid local names cannot cause removal", async () => {
  const { resolveCleanup, resolveLocalCleanup, performCleanup } =
    await module();
  for (const name of [
    "pr-12",
    "katpb-dev-preview",
    "katpb-dev-production",
    "local-other-" + "a".repeat(32),
    "../x",
    "local-katpb-" + "a".repeat(40),
  ])
    assert.throws(() => resolveLocalCleanup(name, policy, sha));
  const local = resolveLocalCleanup(
    "local-katpb-" + "a".repeat(32),
    policy,
    sha,
  );
  assert.equal(local.previewName, "local-katpb-" + "a".repeat(32));
  const c = await resolveCleanup(12, policy, {
    read: async () => pr(),
    controlSha: sha,
  });
  let reads = 0,
    removals = 0;
  const result = await performCleanup(c, policy, {
    read: async () => ({ ...pr(), state: ++reads === 1 ? "closed" : "open" }),
    inactive: async () => {},
    remove: async () => {
      removals++;
    },
    persist: async () => {},
  });
  assert.equal(removals, 0);
  assert.equal(result.capacityReleased, false);
  assert.notEqual(result.state, "deleted");
});

test("preview and cleanup npm commands have executable help and strict failing arguments", async () => {
  const pkg = JSON.parse(await fs.readFile("package.json"));
  assert.equal(
    pkg.scripts["deploy:preview"],
    "node scripts/deploy-preview.mjs",
  );
  assert.equal(
    pkg.scripts["deploy:cleanup"],
    "node scripts/cleanup-preview.mjs",
  );
  for (const script of [
    "scripts/deploy-preview.mjs",
    "scripts/cleanup-preview.mjs",
  ]) {
    const help = spawnSync(process.execPath, [script, "--help"], {
      encoding: "utf8",
    });
    assert.equal(help.status, 0, help.stderr);
    for (const args of [
      [],
      ["--unknown", "x"],
      ["--name"],
      ["--name", "x", "--name", "y"],
    ])
      assert.notEqual(
        spawnSync(process.execPath, [script, ...args], {
          env: { PATH: "/usr/bin:/bin" },
        }).status,
        0,
      );
  }
});

test("cleanup does not release quota based on command completion without confirmed absence", async () => {
  const { resolveCleanup, performCleanup } = await module();
  const c = await resolveCleanup(12, policy, {
    read: async () => pr(),
    controlSha: sha,
  });
  const result = await performCleanup(c, policy, {
    read: async () => pr(),
    inactive: async () => {},
    remove: async () => ({ state: "deleted", absenceVerified: false }),
    persist: async () => {},
  });
  assert.equal(result.state, "failed-deletion");
  assert.equal(result.capacityReleased, false);
});
