import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  canonical,
  digest,
  decodeArchive,
  manifestFor,
} from "../../scripts/hosting/release-records.mjs";
import { prepareRelease } from "../../scripts/prepare-release.mjs";
import { credentialFreeEnvironment } from "../../scripts/hosting/validate-local.mjs";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
test(
  "actual hosted browser suite covers R1/current fixtures without credentials or live requests",
  { timeout: 180000 },
  async (t) => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "r4-browser-"));
    t.after(() => fs.rm(temporary, { recursive: true, force: true }));
    for (const kind of ["r1", "current"]) {
      const folder = path.join(temporary, kind);
      const raw = path.join(folder, "dist");
      const files = decodeArchive(
        await fs.readFile(
          path.join(root, `tests/fixtures/hosting/${kind}-raw.tar`),
        ),
      );
      await fs.mkdir(folder, { recursive: true });
      await fs.writeFile(
        path.join(folder, "package.json"),
        '{"type":"module"}',
      );
      for (const [p, b] of files) {
        await fs.mkdir(path.dirname(path.join(raw, p)), { recursive: true });
        await fs.writeFile(path.join(raw, p), b);
      }
      const evidence = {
        schemaVersion: 1,
        sourceSha: "a".repeat(40),
        rawDigest: digest(manifestFor(files)),
        lockfileSha256: "b".repeat(64),
        nodeVersion: "24.21.0",
        npmVersion: "11.21.0",
        validationResult: "success",
        clean: true,
        reproducibility: { rawEqual: true, trackedEqual: true },
      };
      const output = path.join(folder, ".deploy/package");
      const manifest = await prepareRelease({
        rawDir: raw,
        outputDir: output,
        sourceSha: evidence.sourceSha,
        evidence,
        retained: new Map(),
        predecessorArchiveId: null,
        expectedRetainedDigest: digest([]),
        publicAstroPaths: [],
        headers: await fs.readFile(path.join(root, "hosting/headers"), "utf8"),
      });
      const policy = JSON.parse(
        await fs.readFile(path.join(root, "hosting/policy.json")),
      );
      policy.subdomain = "fixture";
      for (const [name, p] of Object.entries(policy.targets)) {
        p.workerId = "fixture-" + name;
        p.verified = true;
      }
      await fs.mkdir(path.join(folder, "hosting"));
      await fs.writeFile(
        path.join(folder, "hosting/policy.json"),
        canonical(policy),
      );
      // The synthetic policy is confined to this temp fixture process. Every request is intercepted;
      // it is not live provisioning, a TLS acceptance claim, or a normal invocation policy override.
      await fs.writeFile(
        path.join(folder, "fixture.spec.ts"),
        `import { test } from ${JSON.stringify(path.join(root, "node_modules/@playwright/test/index.mjs"))};
import fs from "node:fs/promises";
import path from "node:path";
test.beforeEach(async ({context}) => {
 await context.route("**/*", async r => {
  const u=new URL(r.request().url());if(u.origin!=="https://katpb-dev-acceptance.fixture.workers.dev")throw new Error("Unexpected fixture network request");
  const p=u.pathname.endsWith("/")?u.pathname.slice(1)+"index.html":u.pathname.slice(1);
  const b=await fs.readFile(path.join(${JSON.stringify(path.join(output, "assets"))},p));
  const contentType=p.endsWith(".html")?"text/html":p.endsWith(".css")?"text/css":p.endsWith(".svg")?"image/svg+xml":"application/json";
  await r.fulfill({status:200,contentType,body:b,headers:{"x-robots-tag":"noindex","x-content-type-options":"nosniff"}});
 });
});
await import(${JSON.stringify(path.join(root, "tests/e2e/hosted-foundation.spec.ts"))});
`,
      );
      await fs.writeFile(
        path.join(folder, "playwright.config.ts"),
        `import config from ${JSON.stringify(path.join(root, "playwright.config.ts"))};export default {...config,testDir:${JSON.stringify(folder)},testMatch:"fixture.spec.ts",testIgnore:[],reporter:"dot",workers:4,outputDir:${JSON.stringify(path.join(folder, "results"))}};`,
      );
      const env = {
        ...credentialFreeEnvironment(),
        R4_HOSTED_URL: "https://katpb-dev-acceptance.fixture.workers.dev",
        R4_HOSTED_MANIFEST: path.join(output, "package-manifest.json"),
      };
      const result = spawnSync(
        process.execPath,
        [
          path.join(root, "node_modules/@playwright/test/cli.js"),
          "test",
          "--config",
          path.join(folder, "playwright.config.ts"),
        ],
        {
          cwd: folder,
          env,
          encoding: "utf8",
          timeout: 120000,
          maxBuffer: 2 * 1024 * 1024,
        },
      );
      assert.equal(
        result.status,
        0,
        `${kind} fixture browser failed:\n${result.stdout.slice(0, 5000)}\n${result.stderr.slice(0, 1500)}`,
      );
      assert.match(
        result.stdout,
        new RegExp(`${kind === "r1" ? 16 : 64} passed`),
      );
      assert.equal(manifest.sourceSha, evidence.sourceSha);
    }
  },
);
