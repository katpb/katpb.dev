import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { hostedMode } from "../../scripts/hosting/hosted-mode.mjs";
import { credentialFreeEnvironment } from "../../scripts/hosting/validate-local.mjs";
import {
  parseDeployResult,
  parsePreviewResult,
} from "../../scripts/hosting/provider.mjs";

test("commands support help and reject unknown/duplicate/missing inputs without mutation", () => {
  for (const script of [
    "scripts/prepare-release.mjs",
    "scripts/verify-hosted.mjs",
  ]) {
    const help = spawnSync(process.execPath, [script, "--help"], {
      encoding: "utf8",
    });
    assert.equal(help.status, 0, help.stderr);
    assert.match(help.stdout, /source|manifest/);
    for (const args of [
      ["--unknown", "x"],
      ["--url"],
      ["--help", "--unknown"],
      ["--url", "x", "--url", "y"],
    ]) {
      const result = spawnSync(process.execPath, [script, ...args], {
        encoding: "utf8",
      });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /input|help|required/);
    }
  }
});
test("hosted opt-in fails closed before browser creation and excludes credential material", () => {
  assert.equal(hostedMode({}), null);
  assert.throws(
    () => hostedMode({ R4_HOSTED_URL: "https://evil.test" }),
    /both/,
  );
  assert.throws(
    () =>
      hostedMode({
        R4_HOSTED_URL: "https://evil.test",
        R4_HOSTED_MANIFEST: "not-read",
        CLOUDFLARE_API_TOKEN: "never-print",
      }),
    /credential/,
  );
  const env = credentialFreeEnvironment({
    PATH: "/bin",
    HOME: "/tmp",
    CLOUDFLARE_API_TOKEN: "secret",
    GH_TOKEN: "secret",
    NODE_OPTIONS: "--import evil",
    npm_config_userconfig: "secret",
  });
  assert.deepEqual(Object.keys(env).sort(), [
    "ASTRO_TELEMETRY_DISABLED",
    "HOME",
    "PATH",
  ]);
  const config = readFileSync("playwright.config.ts", "utf8");
  assert.match(config, /reuseExistingServer: false/);
  for (const project of [
    "chromium-mobile",
    "chromium-desktop",
    "webkit-mobile",
    "webkit-desktop",
  ])
    assert.ok(config.includes(project));
});
test("pinned Wrangler typed schemas bind actual IDs and both allowlisted URLs", () => {
  const target = {
    kind: "production",
    workerName: "katpb-dev-production",
    subdomain: "test",
    previewName: null,
  };
  const id = "12345678-1234-1234-1234-123456789abc";
  assert.equal(
    parseDeployResult(
      {
        type: "deploy",
        version: 1,
        worker_name: target.workerName,
        version_id: id,
        targets: ["katpb-dev-production.test.workers.dev"],
      },
      target,
    ).providerDeploymentId,
    id,
  );
  assert.throws(() =>
    parseDeployResult(
      {
        type: "deploy",
        version: 1,
        worker_name: target.workerName,
        version_id: id,
        targets: ["evil.test"],
      },
      target,
    ),
  );
  const preview = {
    ...target,
    kind: "preview",
    workerName: "katpb-dev-preview",
    previewName: "pr-1",
  };
  assert.equal(
    parsePreviewResult(
      {
        preview: {
          name: "pr-1",
          urls: ["https://pr-1-katpb-dev-preview.test.workers.dev"],
        },
        deployment: {
          id,
          urls: [`https://${id}-katpb-dev-preview.test.workers.dev`],
        },
      },
      preview,
    ).providerDeploymentId,
    id,
  );
  assert.throws(() =>
    parsePreviewResult(
      {
        preview: { name: "pr-1", urls: ["https://evil.test"] },
        deployment: {
          id,
          urls: [`https://${id}-katpb-dev-preview.test.workers.dev`],
        },
      },
      preview,
    ),
  );
});
