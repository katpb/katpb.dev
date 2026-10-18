import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { prepareRelease } from "../../scripts/prepare-release.mjs";
import {
  archiveBundle,
  createProductionArchive,
  readProductionArchive,
  appendArchiveAsset,
  prepareProduction,
} from "../../scripts/hosting/production-runtime.mjs";
import {
  digest,
  manifestFor,
  canonical,
  encodeArchive,
} from "../../scripts/hosting/release-records.mjs";

const sha = "a".repeat(40);
export function archiveFixture() {
  const assets = [];
  const bytes = new Map();
  const calls = [];
  let tag = null,
    release = null;
  return {
    calls,
    assets,
    bytes,
    api: {
      get: async (endpoint) => {
        calls.push("get:" + endpoint);
        return { object: { type: "commit", sha: tag } };
      },
      pages: async () => assets,
      post: async (endpoint, body) => {
        calls.push("post:" + endpoint);
        if (endpoint.endsWith("/git/refs")) {
          assert.equal(tag, null);
          tag = body.sha;
          return {};
        }
        assert.equal(release, null);
        release = { id: 5, tag_name: body.tag_name, draft: body.draft };
        return release;
      },
      upload: async (id, name, b) => {
        calls.push("upload:" + name);
        assert.equal(id, 5);
        assert.ok(!assets.some((a) => a.name === name));
        const asset = {
          id: assets.length + 1,
          name,
          state: "uploaded",
          size: b.length,
          digest: `sha256:${digest(b)}`,
        };
        assets.push(asset);
        bytes.set(asset.id, b);
        return asset;
      },
      download: async (id) => {
        calls.push("download:" + id);
        return bytes.get(id);
      },
    },
  };
}
async function packageFixture(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "r4-production-"));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const rawDir = path.join(dir, "dist");
  await fs.mkdir(rawDir);
  await fs.writeFile(path.join(rawDir, "index.html"), "<html>fixture</html>");
  const raw = new Map([["index.html", Buffer.from("<html>fixture</html>")]]);
  const evidence = {
    schemaVersion: 1,
    sourceSha: sha,
    rawDigest: digest(manifestFor(raw)),
    lockfileSha256: "b".repeat(64),
    nodeVersion: "24.21.0",
    npmVersion: "11.21.0",
    validationResult: "success",
    clean: true,
    reproducibility: { rawEqual: true, trackedEqual: true },
  };
  const source = {
    sourceSha: sha,
    controlSha: sha,
    lockfileSha256: evidence.lockfileSha256,
    nodeVersion: evidence.nodeVersion,
    npmVersion: evidence.npmVersion,
    validationResult: "success",
  };
  const outputDir = path.join(dir, ".deploy/package");
  const envelope = await prepareRelease({
    rawDir,
    outputDir,
    sourceSha: sha,
    evidence,
    retained: new Map(),
    predecessorArchiveId: null,
    expectedRetainedDigest: digest([]),
    publicAstroPaths: [],
    headers: "/*\n  X-Robots-Tag: noindex\n",
  });
  const c = {
    schemaVersion: 1,
    attemptId: "10-1",
    archiveId: "r4-attempt-10-1",
    sourceSha: sha,
    controlSha: sha,
    source,
    state: "prepared",
    packageDigest: envelope.packageDigest,
    predecessorArchiveId: null,
    previousKnownGoodArchiveId: null,
    retainedInputDigest: digest([]),
  };
  return { dir, outputDir, c, raw, evidence };
}
test("durable archive creates exact protected tag and draft, re-downloads every byte, and refuses evidence overwrite", async (t) => {
  const { outputDir, c } = await packageFixture(t);
  const f = archiveFixture();
  const bundle = await archiveBundle(outputDir, c);
  const release = await createProductionArchive(f.api, c, bundle);
  assert.equal(f.calls.filter((c) => c.startsWith("upload:")).length, 8);
  assert.ok(f.calls.filter((c) => c.startsWith("download:")).length >= 8);
  const result = await readProductionArchive(f.api, release);
  assert.equal(result.outcome, null);
  assert.equal(result.predecessorArchiveId, null);
  assert.equal(result.packageDigest, c.packageDigest);
  await assert.rejects(
    appendArchiveAsset(
      f.api,
      release,
      "prepared-receipt.json",
      Buffer.from("overwrite"),
    ),
    /never overwrite/,
  );
  assert.equal(
    f.calls.some((c) => /PATCH|DELETE/.test(c)),
    false,
  );
  const entry = f.assets.find((a) => a.name === "prepared.tar");
  f.bytes.set(entry.id, Buffer.from("corrupt"));
  await assert.rejects(readProductionArchive(f.api, release), /integrity/);
});
test("archive write and re-download failures cannot authorize provider work", async (t) => {
  for (const failure of ["upload", "download"])
    await t.test(failure, async (t) => {
      const { outputDir, c } = await packageFixture(t);
      const f = archiveFixture();
      let provider = 0;
      f.api[failure] = async () => {
        throw Error("controlled archive failure");
      };
      await assert.rejects(
        (async () => {
          await createProductionArchive(
            f.api,
            c,
            await archiveBundle(outputDir, c),
          );
          provider++;
        })(),
      );
      assert.equal(provider, 0);
    });
});
test("candidate validation and retained quota fail before archive or upload", async (t) => {
  const { dir, c, raw, evidence } = await packageFixture(t);
  const input = path.join(dir, "candidate");
  await fs.mkdir(input);
  await fs.writeFile(path.join(input, "raw.tar"), encodeArchive(raw));
  await fs.writeFile(
    path.join(input, "raw-manifest.json"),
    canonical(manifestFor(raw)),
  );
  await fs.writeFile(path.join(input, "provenance.json"), canonical(evidence));
  const history = {
    retained: new Map([["_astro/old.Abc12345.css", Buffer.from("old")]]),
    newestPrepared: "r4-attempt-9-1",
  };
  await assert.rejects(
    prepareProduction(c, input, path.join(dir, ".deploy/over-quota"), history, {
      quotas: { maxFiles: 2, maxFileBytes: 26214400 },
    }),
    /quota/,
  );
  await fs.writeFile(
    path.join(input, "provenance.json"),
    canonical({ ...evidence, lockfileSha256: "c".repeat(64) }),
  );
  await assert.rejects(
    prepareProduction(c, input, path.join(dir, ".deploy/corrupt"), history, {
      quotas: { maxFiles: 20000, maxFileBytes: 26214400 },
    }),
    /independently/,
  );
});

test("verified retry requires a distinct archive attempt and cannot overwrite a prior receipt", async (t) => {
  const { outputDir, c } = await packageFixture(t);
  const f = archiveFixture();
  const release = await createProductionArchive(
    f.api,
    c,
    await archiveBundle(outputDir, c),
  );
  const verified = {
    ...c,
    state: "verified",
    stages: Object.fromEntries(
      [
        "eligibility",
        "validation",
        "packaging",
        "archive",
        "upload",
        "httpsSmoke",
        "browserChecks",
        "recording",
      ].map((s) => [s, "success"]),
    ),
    servedState: sha,
    checks: { https: true, browser: true },
    providerDeploymentId: "12345678-1234-1234-1234-123456789abc",
  };
  await appendArchiveAsset(
    f.api,
    release,
    "outcome-10-1.json",
    Buffer.from(canonical(verified) + "\n"),
  );
  assert.equal(
    (await readProductionArchive(f.api, release)).outcome,
    "verified",
  );
  const original = f.bytes.get(
    f.assets.find((a) => a.name === "outcome-10-1.json").id,
  );
  await assert.rejects(
    appendArchiveAsset(
      f.api,
      release,
      "outcome-10-1.json",
      Buffer.from("replacement"),
    ),
  );
  assert.ok(
    f.bytes
      .get(f.assets.find((a) => a.name === "outcome-10-1.json").id)
      .equals(original),
  );
  await assert.rejects(
    createProductionArchive(f.api, c, await archiveBundle(outputDir, c)),
  );
  const retry = { ...c, attemptId: "10-2", archiveId: "r4-attempt-10-2" };
  const fresh = archiveFixture();
  assert.equal(
    (
      await createProductionArchive(
        fresh.api,
        retry,
        await archiveBundle(outputDir, retry),
      )
    ).tag_name,
    "r4-attempt-10-2",
  );
});
