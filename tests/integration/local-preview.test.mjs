import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { prepareRelease } from "../../scripts/prepare-release.mjs";
import { prepareLocalPreview } from "../../scripts/deploy-preview.mjs";
import { digest, manifestFor } from "../../scripts/hosting/release-records.mjs";

const sha = "a".repeat(40),
  controlSha = "b".repeat(40);
async function fixture(t, { headers, clean = true } = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "r4-local-preview-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const rawDir = path.join(root, "dist");
  await fs.mkdir(rawDir);
  const bytes = Buffer.from(
    "<!doctype html><title>Fixture</title><h1>Fixture</h1>",
  );
  await fs.writeFile(path.join(rawDir, "index.html"), bytes);
  const evidence = {
    schemaVersion: 1,
    sourceSha: sha,
    rawDigest: digest(manifestFor(new Map([["index.html", bytes]]))),
    lockfileSha256: "c".repeat(64),
    nodeVersion: "24.21.0",
    npmVersion: "11.21.0",
    validationResult: "success",
    clean,
    reproducibility: { rawEqual: true, trackedEqual: true },
  };
  const packageDir = path.join(root, ".deploy/candidate");
  await prepareRelease({
    rawDir,
    outputDir: packageDir,
    sourceSha: sha,
    evidence,
    retained: new Map(),
    predecessorArchiveId: null,
    expectedRetainedDigest: digest([]),
    publicAstroPaths: [],
    headers: headers ?? (await fs.readFile("hosting/headers", "utf8")),
  });
  const policy = JSON.parse(await fs.readFile("hosting/policy.json"));
  return {
    root,
    packageDir,
    policy,
    name: "local-katpb-" + sha.slice(0, 32),
    outputDir: path.join(root, ".deploy/trusted"),
    controlSha,
  };
}

test("local preview repackages only validated raw bytes using trusted headers and source-bound names", async (t) => {
  const input = await fixture(t);
  // A candidate's config is irrelevant, including one attempting to select production.
  await fs.writeFile(
    path.join(input.packageDir, "wrangler.json"),
    '{"name":"katpb-dev-production"}',
  );
  const prepared = await prepareLocalPreview(input);
  assert.equal(prepared.target.kind, "preview");
  assert.equal(prepared.target.workerName, "katpb-dev-preview");
  assert.equal(prepared.manifest.sourceSha, sha);
  assert.equal(prepared.authorization.controlSha, controlSha);
  const config = JSON.parse(await fs.readFile(prepared.configPath));
  assert.equal(config.name, "katpb-dev-preview");
  assert.equal(config.main, undefined);
  assert.equal(config.routes, undefined);
  assert.notEqual(
    prepared.configPath,
    path.join(input.packageDir, "wrangler.json"),
  );
});

test("local preview rejects forged validation, unbound names, changed raw and candidate delivery policy", async (t) => {
  for (const kind of ["validation", "name", "raw", "policy", "control"])
    await t.test(kind, async (t) => {
      const input = await fixture(
        t,
        kind === "policy" ? { headers: "/*\n  X-Robots-Tag: all\n" } : {},
      );
      if (kind === "validation") {
        const file = path.join(input.packageDir, "provenance.json");
        const value = JSON.parse(await fs.readFile(file));
        value.validation.clean = false;
        await fs.writeFile(file, JSON.stringify(value));
      }
      if (kind === "name") input.name = "local-katpb-" + "b".repeat(32);
      if (kind === "raw")
        await fs.writeFile(
          path.join(input.packageDir, "raw/index.html"),
          "changed",
        );
      if (kind === "control") input.controlSha = "not-a-control-sha";
      await assert.rejects(prepareLocalPreview(input));
    });
});

test("local preview help and invalid inputs never start owner authentication or candidate code", () => {
  const script = "scripts/deploy-preview.mjs";
  const help = spawnSync(process.execPath, [script, "--help"], {
    encoding: "utf8",
  });
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /32-source-sha|first-32/);
  assert.match(help.stdout, /protected-main/);
  for (const args of [
    [],
    ["--name"],
    ["--bogus", "x"],
    ["--name", "x", "--name", "y"],
    ["--name", "pr-12", "--package", "/absent"],
  ]) {
    const result = spawnSync(process.execPath, [script, ...args], {
      encoding: "utf8",
      env: { PATH: "/usr/bin:/bin" },
    });
    assert.notEqual(result.status, 0);
    assert.doesNotMatch(result.stderr, /spawn op|token value|ENOENT/);
  }
});
