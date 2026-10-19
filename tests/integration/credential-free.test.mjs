import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { isCredentialFreeEnvironment } from "../../scripts/hosting/credential-free.mjs";
import { credentialFreeEnvironment } from "../../scripts/hosting/validate-local.mjs";
import { hostedMode } from "../../scripts/hosting/hosted-mode.mjs";

for (const [name, value, allowed] of [
  ["SSH_AUTH_SOCK", "/tmp/agent.sock", true],
  ["CLOUDFLARE_API_KEY", "fixture", false],
  ["CF_API_KEY", "fixture", false],
  ["SERVICE_APIKEY", "fixture", false],
  ["CLOUDFLARE_EMAIL", "fixture", false],
  ["GH_TOKEN", "fixture", false],
  ["CLOUDFLARE_API_TOKEN", "fixture", false],
  ["SERVICE_SECRET", "fixture", false],
  ["R4_ARCHIVE_APP_PRIVATE_KEY", "fixture", false],
  ["PRIVATEKEY", "fixture", false],
  ["PASSWORD", "fixture", false],
  ["AUTHORIZATION", "fixture", false],
  ["AWS_ACCESS_KEY_ID", "fixture", false],
  ["CREDENTIAL", "fixture", false],
  ["OP_SESSION", "fixture", false],
  ["SSH_AUTH_SOCK_TOKEN", "fixture", false],
  ["NODE_TLS_REJECT_UNAUTHORIZED", "0", false],
])
  test(`credential-free policy: ${name} ${allowed ? "allowed" : "rejected"}`, () => {
    const env = { [name]: value };
    assert.equal(isCredentialFreeEnvironment(env), allowed);
    const inputs = {
      R4_HOSTED_URL: "https://katpb-dev-acceptance.katpb.workers.dev",
      R4_HOSTED_MANIFEST: "/missing-policy-regression-manifest",
      ...env,
    };
    assert.throws(
      () => hostedMode(inputs),
      allowed ? /ENOENT/ : /credential-free/,
    );
    const cli = spawnSync(
      process.execPath,
      [
        "scripts/verify-hosted.mjs",
        "--url",
        inputs.R4_HOSTED_URL,
        "--manifest",
        inputs.R4_HOSTED_MANIFEST,
      ],
      { env, encoding: "utf8" },
    );
    assert.notEqual(cli.status, 0);
    assert.match(
      cli.stderr,
      allowed ? /ENOENT/ : /credential-free environment/,
    );
  });

test("credential-free child preserves only the approved socket exception", () => {
  const child = credentialFreeEnvironment({
    SSH_AUTH_SOCK: "/tmp/agent.sock",
    GH_TOKEN: "fixture",
    CLOUDFLARE_API_TOKEN: "fixture",
    SERVICE_SECRET: "fixture",
    PRIVATE_KEY: "fixture",
    NODE_TLS_REJECT_UNAUTHORIZED: "0",
  });
  assert.deepEqual(child, {
    SSH_AUTH_SOCK: "/tmp/agent.sock",
    ASTRO_TELEMETRY_DISABLED: "1",
  });
  assert.ok(isCredentialFreeEnvironment(child));
});
