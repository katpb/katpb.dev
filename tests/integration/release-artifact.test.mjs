import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  digest,
  validateEntries,
  scanFiles,
  encodeArchive,
  decodeArchive,
  validatePackage,
  advanceAttempt,
  createAttempt,
  completeVerification,
} from "../../scripts/hosting/release-records.mjs";
import { prepareRelease } from "../../scripts/prepare-release.mjs";

const sha = "a".repeat(40);
const limits = { maxFiles: 20000, maxFileBytes: 25 * 1024 * 1024 };
const entry = (name, bytes = "ok") => ({
  path: name,
  size: Buffer.byteLength(bytes),
  sha256: digest(Buffer.from(bytes)),
});
const temp = async (t) => {
  const p = await fs.mkdtemp(path.join(os.tmpdir(), "r4-artifact-"));
  t.after(() => fs.rm(p, { recursive: true, force: true }));
  return p;
};

test("artifact boundary rejects controls, traversal, absolute and ambiguous paths", () => {
  for (const name of [
    "../x",
    "/x",
    "x/../y",
    "x//y",
    "./x",
    "x\\y",
    "C:/x",
    "x\n",
    "x\u0000",
    "_headers",
    "_redirects",
    "_worker.js",
    "__release.json",
    ".git/config",
    ".env.production",
    "wrangler.json",
    "x/package.json",
    "node_modules/a",
    "provenance.json",
  ]) {
    assert.throws(
      () => validateEntries([entry(name)], limits),
      /path|reserved|control/,
    );
  }
  for (const type of ["symlink", "hardlink", "device", "directory"])
    assert.throws(
      () => validateEntries([{ ...entry("x"), type }], limits),
      /regular/,
    );
  for (const entries of [
    [entry("x"), entry("x")],
    [entry("X"), entry("x")],
    [entry("x"), entry("x/y")],
  ])
    assert.throws(
      () => validateEntries(entries, limits),
      /collision|duplicate|sorted/,
    );
  assert.throws(
    () => validateEntries([{ ...entry("x"), unexpected: true }], limits),
    /field/,
  );
  assert.throws(
    () => validateEntries([{ ...entry("x"), sha256: "broken" }], limits),
    /hash/,
  );
  assert.throws(
    () => validateEntries([entry("x")], { ...limits, maxFileBytes: 1 }),
    /quota/,
  );
  assert.throws(
    () => validateEntries([entry("x"), entry("y")], { ...limits, maxFiles: 1 }),
    /quota/,
  );
});

test("filesystem links and executable artifact flags fail before copying", async (t) => {
  const p = await temp(t);
  await fs.writeFile(path.join(p, "real"), "x");
  await fs.symlink("real", path.join(p, "link"));
  await assert.rejects(scanFiles(p), /regular/);
  await fs.unlink(path.join(p, "link"));
  await fs.link(path.join(p, "real"), path.join(p, "hard"));
  await assert.rejects(scanFiles(p), /regular/);
  await fs.unlink(path.join(p, "hard"));
  await fs.chmod(path.join(p, "real"), 0o755);
  await assert.rejects(scanFiles(p), /executable/);
});

test("archive validation checks all entries and bytes before extraction", () => {
  const files = new Map([
    ["index.html", Buffer.from("hello")],
    ["nested/x.css", Buffer.from("body{}")],
  ]);
  const archive = encodeArchive(files);
  assert.deepEqual([...decodeArchive(archive)], [...files]);
  assert.deepEqual(encodeArchive(files), archive);
  const damaged = Buffer.from(archive);
  damaged[0] ^= 1;
  assert.throws(() => decodeArchive(damaged), /checksum/);
  for (const type of ["1", "2", "3", "5", "x", "L"]) {
    const bad = Buffer.from(archive);
    bad[156] = type.charCodeAt(0);
    bad.fill(32, 148, 156);
    const sum = bad.subarray(0, 512).reduce((a, b) => a + b, 0);
    bad.write(sum.toString(8).padStart(6, "0") + "\0 ", 148, "ascii");
    assert.throws(() => decodeArchive(bad), /regular/);
  }
  assert.throws(() => decodeArchive(archive.subarray(0, 100)), /archive/);
  assert.throws(
    () => decodeArchive(Buffer.concat([archive, Buffer.from("garbage")])),
    /archive/,
  );
});

test("deterministic raw/package separation and immutable retention preserve source bytes", async (t) => {
  const root = await temp(t);
  const raw = path.join(root, "dist");
  await fs.mkdir(path.join(raw, "_astro"), { recursive: true });
  await fs.writeFile(
    path.join(raw, "index.html"),
    "<html><body>R1</body></html>",
  );
  await fs.writeFile(path.join(raw, "_astro/app.Abc12345.css"), "body{}");
  const before = await scanFiles(raw);
  const retained = new Map([["_astro/old.Old12345.css", Buffer.from("old{}")]]);
  const evidence = {
    schemaVersion: 1,
    sourceSha: sha,
    rawDigest: digest(before.entries),
    lockfileSha256: "a".repeat(64),
    nodeVersion: "24.21.0",
    npmVersion: "11.21.0",
    validationResult: "success",
    clean: true,
    reproducibility: { rawEqual: true, trackedEqual: true },
  };
  const inputs = {
    rawDir: raw,
    sourceSha: sha,
    evidence,
    retained,
    predecessorArchiveId: "r4-attempt-1-1",
    expectedRetainedDigest: digest([entry("_astro/old.Old12345.css", "old{}")]),
    publicAstroPaths: [],
    headers: "/*\n  X-Robots-Tag: noindex\n",
    limits,
  };
  const a = await prepareRelease({
    ...inputs,
    outputDir: path.join(root, ".deploy/a"),
  });
  const b = await prepareRelease({
    ...inputs,
    outputDir: path.join(root, ".deploy/b"),
  });
  assert.equal(a.packageDigest, b.packageDigest);
  assert.equal(a.rawDigest, digest(before.entries));
  assert.deepEqual((await scanFiles(raw)).entries, before.entries);
  assert.equal(
    (
      await fs.readFile(path.join(root, ".deploy/a/assets/index.html"))
    ).toString(),
    "<html><body>R1</body></html>",
  );
  assert.deepEqual(
    JSON.parse(
      await fs.readFile(path.join(root, ".deploy/a/assets/__release.json")),
    ),
    { schemaVersion: 1, sourceSha: sha, rawDigest: a.rawDigest },
  );
  assert.equal(a.packageManifest.length, before.entries.length + 3);
  await validatePackage(path.join(root, ".deploy/a"));
  await fs.writeFile(path.join(root, ".deploy/a/assets/index.html"), "corrupt");
  await assert.rejects(
    validatePackage(path.join(root, ".deploy/a")),
    /digest|bytes/,
  );
  for (const override of [
    { evidence: { ...evidence, clean: false } },
    { evidence: { ...evidence, sourceSha: "b".repeat(40) } },
    { evidence: { ...evidence, rawDigest: "0".repeat(64) } },
    { evidence: { ...evidence, validationResult: "failure" } },
    { publicAstroPaths: ["app.Abc12345.css"] },
    { expectedRetainedDigest: "0".repeat(64) },
    { retained: new Map() },
    { limits: { ...limits, maxFiles: 2 } },
    { retained: new Map([["_astro/app.Abc12345.css", Buffer.from("other")]]) },
  ]) {
    await assert.rejects(
      prepareRelease({
        ...inputs,
        ...override,
        outputDir: path.join(root, ".deploy/rejected"),
      }),
    );
  }
  assert.deepEqual((await scanFiles(raw)).entries, before.entries);
  await assert.rejects(prepareRelease({ ...inputs, outputDir: raw }), /output/);
});

test("attempt state never becomes verified before smoke/browser and durable recording", () => {
  let a = createAttempt({
    attemptId: "1-1",
    mode: "release",
    initiator: "katpb",
    trigger: "push",
    sourceSha: sha,
    controlSha: sha,
  });
  assert.throws(() => advanceAttempt(a, "verified"), /transition/);
  for (const s of [
    "eligible",
    "validated",
    "prepared",
    "archived",
    "uploading",
    "uploaded",
    "verifying",
  ])
    a = advanceAttempt(a, s);
  assert.throws(() => advanceAttempt(a, "verified"), /receipt|verification/);
  a = advanceAttempt(a, "unresolved");
  assert.equal(a.servedState, "unknown");
  assert.throws(() => advanceAttempt(a, "uploading"), /transition/);
  assert.throws(
    () =>
      createAttempt({
        attemptId: "1-1",
        mode: "release",
        initiator: "katpb",
        trigger: "push",
        sourceSha: sha,
        controlSha: sha,
        token: "secret",
      }),
    /field/,
  );
});

test("verification receipt is append-only and failed persistence never returns success", async (t) => {
  const root = await temp(t);
  let a = createAttempt({
    attemptId: "2-1",
    mode: "release",
    initiator: "katpb",
    trigger: "push",
    sourceSha: sha,
    controlSha: sha,
  });
  for (const s of [
    "eligible",
    "validated",
    "prepared",
    "archived",
    "uploading",
    "uploaded",
    "verifying",
  ])
    a = advanceAttempt(a, s);
  a.archiveId = "r4-attempt-2-1";
  a.packageDigest = "b".repeat(64);
  a.stages = Object.fromEntries(
    Object.keys(a.stages).map((s) => [
      s,
      s === "recording" ? "pending" : "success",
    ]),
  );
  const file = path.join(root, "receipt.json");
  const done = await completeVerification(file, a);
  assert.equal(done.state, "verified");
  assert.equal(JSON.parse(await fs.readFile(file)).state, "verified");
  await assert.rejects(completeVerification(file, a));
  assert.equal(a.state, "verifying");
  const bad = { ...a, stages: { ...a.stages, browserChecks: "failure" } };
  await assert.rejects(
    completeVerification(path.join(root, "bad.json"), bad),
    /verification/,
  );
});
