import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { spawnSync } from "node:child_process";
import {
  digest,
  decodeArchive,
  manifestFor,
} from "../../scripts/hosting/release-records.mjs";
import { prepareRelease } from "../../scripts/prepare-release.mjs";
import {
  writeConfig,
  invokeProvider,
} from "../../scripts/hosting/provider.mjs";

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "r4-provider-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const raw = path.join(root, "dist");
  const files = decodeArchive(
    await fs.readFile("tests/fixtures/hosting/r1-raw.tar"),
  );
  for (const [p, b] of files) {
    await fs.mkdir(path.dirname(path.join(raw, p)), { recursive: true });
    await fs.writeFile(path.join(raw, p), b);
  }
  const sourceSha = "a".repeat(40),
    evidence = {
      schemaVersion: 1,
      sourceSha,
      rawDigest: digest(manifestFor(files)),
      lockfileSha256: "b".repeat(64),
      nodeVersion: "24.21.0",
      npmVersion: "11.21.0",
      validationResult: "success",
      clean: true,
      reproducibility: { rawEqual: true, trackedEqual: true },
    };
  const output = path.join(root, ".deploy/package");
  await prepareRelease({
    rawDir: raw,
    outputDir: output,
    sourceSha,
    evidence,
    retained: new Map(),
    predecessorArchiveId: null,
    expectedRetainedDigest: digest([]),
    publicAstroPaths: [],
    headers: await fs.readFile("hosting/headers", "utf8"),
  });
  const policy = JSON.parse(await fs.readFile("hosting/policy.json"));
  policy.subdomain = "fixture";
  for (const [name, p] of Object.entries(policy.targets)) {
    p.workerId = "fixture-" + name;
    p.verified = true;
  }
  const { target, configPath } = await writeConfig(
    policy,
    {
      kind: "acceptance",
      environment: "production",
      workflowRef: "refs/heads/main",
    },
    output,
  );
  return { root, output, policy, sourceSha, target, configPath };
}
test("trusted upload process uses array args, minimal env and typed result; captured credentials never escape", async (t) => {
  const f = await fixture(t);
  const token = "fixture-credential-123456789012";
  let captured;
  const spawn = (binary, args, options) => {
    captured = { binary, args, options };
    const child = new EventEmitter();
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    child.kill = () => true;
    queueMicrotask(async () => {
      await fs.writeFile(
        options.env.WRANGLER_OUTPUT_FILE_PATH,
        JSON.stringify({
          type: "deploy",
          version: 1,
          worker_name: f.target.workerName,
          version_id: "12345678-1234-1234-1234-123456789abc",
          targets: ["katpb-dev-acceptance.fixture.workers.dev"],
        }) + "\n",
      );
      child.stdout.end(token);
      child.emit("close", 0);
    });
    return child;
  };
  const result = await invokeProvider(
    {
      ...f,
      operation: "deploy",
      attemptId: "10-1",
      credential: { token, workerId: f.target.workerId },
      authorization: {
        sourceSha: f.sourceSha,
        controlSha: f.sourceSha,
        validationResult: "success",
      },
    },
    { spawn },
  );
  assert.equal(result.state, "uploaded");
  assert.equal(captured.options.shell, false);
  assert.equal(captured.options.env.CLOUDFLARE_API_TOKEN, token);
  assert.ok(captured.args.includes("--autoconfig=false"));
  assert.equal(captured.options.env.GH_TOKEN, undefined);
  assert.equal(captured.options.env.NODE_OPTIONS, undefined);
  assert.ok(!JSON.stringify(result).includes(token));
  assert.ok(!captured.args.includes(token));
  await assert.rejects(fs.stat(captured.options.cwd), /ENOENT/);
});
test("pinned Wrangler accepts trusted assets-only config in credential-free offline dry-run", async (t) => {
  const f = await fixture(t);
  const home = path.join(f.root, "empty-home");
  await fs.mkdir(home);
  const result = spawnSync(
    process.execPath,
    [
      path.resolve("node_modules/wrangler/bin/wrangler.js"),
      "deploy",
      "--config",
      f.configPath,
      "--dry-run",
      "--autoconfig=false",
    ],
    {
      cwd: home,
      env: {
        PATH: path.dirname(process.execPath) + ":/usr/bin:/bin",
        HOME: home,
        XDG_CONFIG_HOME: home,
        CI: "true",
        WRANGLER_SEND_METRICS: "false",
        WRANGLER_LOG_PATH: path.join(home, "wrangler.log"),
        HTTP_PROXY: "http://127.0.0.1:9",
        HTTPS_PROXY: "http://127.0.0.1:9",
      },
      encoding: "utf8",
      timeout: 30000,
    },
  );
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /--dry-run: exiting now/);
});
