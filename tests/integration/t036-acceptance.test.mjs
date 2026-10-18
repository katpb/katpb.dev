import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  runAcceptanceMatrix,
  scenarios,
  concurrentOutOfOrder,
  fixturePackage,
} from "../../scripts/hosting/t036-acceptance.mjs";
import {
  acceptanceInvocation,
  acceptanceReference,
  sanitizedProviderResult,
  archiveStillAbsent,
  noHostedMutationInFlight,
} from "../../scripts/hosting/t036-owner-run.mjs";
import { acceptanceProvider } from "../../scripts/hosting/t036-provider.mjs";

test("T036 controlled matrix exercises real archive bytes and shared transaction functions without live-provider claims", async (t) => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), "r4-t036-"));
  t.after(() => fs.rm(folder, { recursive: true, force: true }));
  await fs.mkdir(path.join(folder, ".deploy"));
  let served,
    uploads = 0,
    https = 0,
    browser = 0;
  const observed = [];
  const evidence = await runAcceptanceMatrix({
    root: path.join(folder, ".deploy/run"),
    sourceSha: "a".repeat(40),
    driver: {
      live: false,
      upload: async (pkg) => {
        served = pkg.c.packageDigest;
        uploads++;
        return {
          providerDeploymentId: "12345678-1234-1234-1234-123456789abc",
          stableUrl: "https://katpb-dev-acceptance.katpb.workers.dev/",
        };
      },
      reject: async () => {
        return { state: "rejected", status: 400 };
      },
      https: async (pkg) => {
        assert.equal(served, pkg.c.packageDigest);
        https++;
      },
      browser: async (pkg) => {
        assert.equal(served, pkg.c.packageDigest);
        browser++;
      },
    },
    persist: async (e) => observed.push(structuredClone(e)),
  });
  assert.equal(evidence.complete, true);
  assert.equal(evidence.liveProvider, false);
  assert.equal(evidence.fixtureOnly, true);
  assert.equal(evidence.cases.length, scenarios.length + 1);
  assert.ok(uploads > 4 && https > uploads && browser > 3);
  assert.ok(evidence.cases.every((c) => c.falseVerifiedSuccess !== true));
  const order = evidence.cases.find((c) => c.name === "out-of-order");
  assert.equal(order.outOfOrder.providerCalls, 0);
  assert.equal(order.outOfOrder.currentVerified, "r4-attempt-2-1");
  assert.equal(order.outOfOrder.previousVerified, "r4-attempt-1-1");
  assert.equal(order.outOfOrder.newestPrepared, "r4-attempt-3-1");
  for (const c of evidence.cases.slice(1)) {
    assert.equal(c.previousKnownGoodReceiptUnchanged, true);
    assert.equal(c.previousKnownGoodArchiveBytesUnchanged, true);
  }
  for (const name of [
    "archive-quota",
    "archive-integrity",
    "prepared-receipt-integrity",
    "stale",
  ])
    assert.equal(evidence.cases.find((c) => c.name === name).providerCalls, 0);
  for (const name of ["receipt-append", "receipt-readback"])
    assert.equal(
      evidence.cases.find((c) => c.name === name).recordingRejected,
      true,
    );
  assert.equal(observed.at(-1).complete, true);
});
test("overlapping acceptance requests finish newer first and serialize provider authority", async () => {
  const calls = [];
  const result = await concurrentOutOfOrder(
    async () => {
      calls.push("newer-start");
      await Promise.resolve();
      calls.push("newer-end");
      return 2;
    },
    async () => {
      calls.push("older");
      return 1;
    },
  );
  assert.deepEqual(calls, ["newer-start", "newer-end", "older"]);
  assert.deepEqual(result.events, [
    "older-request-arrived",
    "newer-lock-acquired",
    "newer-lock-released",
    "older-lock-acquired",
  ]);
});
test("unexpected provider-probe failure cannot count as the observed controlled rejection", async (t) => {
  const folder = await fs.mkdtemp(
    path.join(os.tmpdir(), "r4-t036-failed-probe-"),
  );
  t.after(() => fs.rm(folder, { recursive: true, force: true }));
  await fs.mkdir(path.join(folder, ".deploy"));
  let served;
  await assert.rejects(
    runAcceptanceMatrix({
      root: path.join(folder, ".deploy/run"),
      sourceSha: "a".repeat(40),
      driver: {
        live: false,
        upload: async (pkg) => {
          served = pkg.c.packageDigest;
          return {
            providerDeploymentId: "12345678-1234-1234-1234-123456789abc",
            stableUrl: "https://katpb-dev-acceptance.katpb.workers.dev/",
          };
        },
        reject: async () => {
          throw Error("unexpected authentication/network/process failure");
        },
        https: async (pkg) => assert.equal(served, pkg.c.packageDigest),
        browser: async (pkg) => assert.equal(served, pkg.c.packageDigest),
      },
    }),
  );
});
test("T036 owner subprocess accepts only the fixed masked acceptance reference and discards inherited credentials", () => {
  const call = acceptanceInvocation("upload", "/tmp/.deploy/package", {
    HOME: "/owner",
    GH_TOKEN: "discard",
    R4_ARCHIVE_APP_PRIVATE_KEY: "discard",
    CLOUDFLARE_API_TOKEN: "discard",
    NODE_OPTIONS: "discard",
    HTTPS_PROXY: "discard",
  });
  assert.equal(call.env.CLOUDFLARE_API_TOKEN, acceptanceReference);
  assert.deepEqual(
    Object.keys(call.env).sort(),
    [
      "CLOUDFLARE_API_TOKEN",
      "HOME",
      "OP_RUN_NO_MASKING",
      "PATH",
      "T036_OWNER_SUBPROCESS",
    ].sort(),
  );
  assert.ok(call.args.includes("--no-masking=false"));
  assert.throws(() => acceptanceInvocation("production", "/tmp/.deploy/pkg"));
  assert.throws(() => acceptanceInvocation("upload", "/tmp/pkg"));
  assert.throws(() =>
    sanitizedProviderResult({ state: "uploaded", token: "discard" }, "upload"),
  );
  assert.throws(() =>
    sanitizedProviderResult(
      {
        state: "uploaded",
        providerDeploymentId: "12345678-1234-1234-1234-123456789abc",
        stableUrl: "https://katpb-dev-production.katpb.workers.dev/",
      },
      "upload",
    ),
  );
  assert.throws(() =>
    sanitizedProviderResult({ state: "rejected", status: 403 }, "reject"),
  );
});
test("T036 provider rejects missing owner guard, arbitrary operation and paths before touching credentials or provider", async () => {
  await assert.rejects(
    acceptanceProvider("upload", "/tmp/.deploy/package", {}),
  );
  await assert.rejects(
    acceptanceProvider("production", "/tmp/.deploy/package", {
      T036_OWNER_SUBPROCESS: "1",
    }),
  );
  await assert.rejects(
    acceptanceProvider("upload", "/tmp/package", {
      T036_OWNER_SUBPROCESS: "1",
    }),
  );
});
test("acceptance rejection probe can contact only the fixed isolated deployment endpoint and cannot turn unexpected status into success", async (t) => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), "r4-t036-provider-"));
  t.after(() => fs.rm(folder, { recursive: true, force: true }));
  const root = path.join(folder, ".deploy/fixture");
  await fs.mkdir(root, { recursive: true });
  const pkg = await fixturePackage(root, "rejection", "a".repeat(40));
  const env = {
    T036_OWNER_SUBPROCESS: "1",
    CLOUDFLARE_API_TOKEN: "test_" + "x".repeat(30),
  };
  let calls = 0;
  const fetch = async (url, options) => {
    calls++;
    assert.equal(
      url,
      "https://api.cloudflare.com/client/v4/accounts/45dcbe7b47e04e1f41dc571ceb86b40e/workers/scripts/katpb-dev-acceptance/deployments",
    );
    assert.equal(options.method, "POST");
    assert.equal(options.redirect, "error");
    assert.equal(
      JSON.parse(options.body).versions[0].version_id,
      "00000000-0000-0000-0000-000000000000",
    );
    return Response.json(
      { success: false, errors: [{ code: 10000 }] },
      { status: 400 },
    );
  };
  assert.deepEqual(
    await acceptanceProvider("reject", pkg.outputDir, env, { fetch }),
    { state: "rejected", status: 400 },
  );
  assert.equal(calls, 1);
  for (const status of [200, 403, 404, 500])
    await assert.rejects(
      acceptanceProvider("reject", pkg.outputDir, env, {
        fetch: async () =>
          Response.json(
            { success: false, errors: [{ code: 10000 }] },
            { status },
          ),
      }),
    );
  await assert.rejects(
    acceptanceProvider(
      "reject",
      pkg.outputDir,
      { ...env, GH_TOKEN: "discard" },
      { fetch },
    ),
  );
  assert.equal(calls, 1);
});
test("owner preflight distinguishes an absent archive environment from unavailable environment visibility", async () => {
  const calls = [];
  await archiveStillAbsent(true, {
    fetch: async (url) => {
      calls.push(url);
      return url.endsWith("/production")
        ? Response.json({ name: "production" })
        : Response.json({}, { status: 404 });
    },
  });
  assert.equal(calls.length, 2);
  for (const status of [200, 403, 500])
    await assert.rejects(
      archiveStillAbsent(false, {
        fetch: async () => Response.json({}, { status }),
      }),
    );
  await assert.rejects(
    archiveStillAbsent(true, {
      fetch: async () => Response.json({}, { status: 404 }),
    }),
  );
});
test("owner coordination preflight reads complete pages and blocks every non-completed hosting state", async () => {
  const page = Array.from({ length: 100 }, (_, id) => ({
    id,
    path: ".github/workflows/ci.yml",
    status: "completed",
  }));
  for (const status of [
    "queued",
    "in_progress",
    "waiting",
    "pending",
    "requested",
  ]) {
    await assert.rejects(
      noHostedMutationInFlight({
        fetch: async (url) =>
          Response.json({
            total_count: 101,
            workflow_runs: url.endsWith("page=1")
              ? page
              : [{ id: 100, path: ".github/workflows/deploy.yml", status }],
          }),
      }),
    );
  }
  await noHostedMutationInFlight({
    fetch: async () =>
      Response.json({
        total_count: 1,
        workflow_runs: [
          { id: 1, path: ".github/workflows/deploy.yml", status: "completed" },
        ],
      }),
  });
  await assert.rejects(
    noHostedMutationInFlight({
      fetch: async () =>
        Response.json({ total_count: 1001, workflow_runs: [] }),
    }),
  );
});
