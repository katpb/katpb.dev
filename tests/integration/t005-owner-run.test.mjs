import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import {
  approvedReferences,
  opInvocation,
  parseOwnerArguments,
  sanitizeResult,
  executeOperation,
  parseDiagnosticArguments,
  validateSecondAttempt,
  validateThirdAttempt,
  runTestSequence,
  runPreviewOnlySequence,
  validateProvenMatrix,
} from "../../scripts/hosting/t005-owner-run.mjs";
import {
  authorizationDenied,
  controlledPackage,
  runOperation,
  sanitizeDiagnostics,
  validatePreviewUrl,
  publicAsset,
} from "../../scripts/hosting/t005-provider.mjs";

test("owner runner accepts only the three approved references and isolates op environment", () => {
  const args = Object.entries(approvedReferences).flatMap(([kind, ref]) => [
    `--${kind}-ref`,
    ref,
  ]);
  assert.deepEqual(parseOwnerArguments(args), approvedReferences);
  for (const bad of ["raw-token-value", "op://another/item/credential"]) {
    assert.throws(() => parseOwnerArguments(["--production-ref", bad]));
  }
  assert.throws(() =>
    parseOwnerArguments([...args, "--preview-ref", approvedReferences.preview]),
  );
  const invocation = opInvocation(
    "preview",
    approvedReferences.preview,
    "baseline",
    {
      HOME: "/owner",
      USER: "owner",
      PATH: "/usr/bin",
      OTHER: "op://other/item/field",
      CLOUDFLARE_API_TOKEN: "must-not-be-inherited",
      OP_SERVICE_ACCOUNT_TOKEN: "must-not-be-inherited",
      OP_RUN_NO_MASKING: "true",
      NODE_OPTIONS: "--inspect",
      HTTPS_PROXY: "http://proxy",
    },
  );
  assert.deepEqual(invocation.args.slice(0, 3), [
    "run",
    "--no-masking=false",
    "--",
  ]);
  assert.equal(invocation.env.CLOUDFLARE_API_TOKEN, approvedReferences.preview);
  assert.equal(
    invocation.env.CLOUDFLARE_ACCOUNT_ID,
    "45dcbe7b47e04e1f41dc571ceb86b40e",
  );
  assert.equal(invocation.env.OP_RUN_NO_MASKING, "false");
  for (const key of [
    "OTHER",
    "NODE_OPTIONS",
    "HTTPS_PROXY",
    "OP_SERVICE_ACCOUNT_TOKEN",
  ])
    assert.equal(invocation.env[key], undefined);
  assert.equal(
    Object.values(invocation.env).filter((value) => value.startsWith("op://"))
      .length,
    1,
  );
  assert.equal(
    invocation.args.join(" ").includes("must-not-be-inherited"),
    false,
  );
});

test("production pre-mutation diagnostic accepts only its approved reference", () => {
  assert.equal(
    parseDiagnosticArguments([
      "--diagnose-production-ref",
      approvedReferences.production,
    ]),
    approvedReferences.production,
  );
  for (const ref of [
    "token-value",
    approvedReferences.preview,
    "op://other/item/field",
  ])
    assert.throws(() =>
      parseDiagnosticArguments(["--diagnose-production-ref", ref]),
    );
});

test("token diagnostic performs only account-owned verification and never emits token IDs/messages", async () => {
  const calls = [];
  const result = await runOperation(
    { operation: "diagnose-token", kind: "production" },
    {
      accountIdExplicit: true,
      request: async (url, method = "GET") => {
        calls.push({ url, method });
        return {
          status: 200,
          body: {
            success: true,
            result: {
              id: "fixture-secret-id",
              status: "active",
              expires_on: "2027-01-01T00:00:00Z",
            },
          },
        };
      },
    },
  );
  assert.deepEqual(calls, [
    {
      url: "/accounts/45dcbe7b47e04e1f41dc571ceb86b40e/tokens/verify",
      method: "GET",
    },
  ]);
  assert.equal(result.pass, true);
  assert.equal(result.diagnostics.tokenVerification.status, "active");
  assert.equal(result.diagnostics.accountIdExplicit, true);
  assert.equal(JSON.stringify(result).includes("fixture-secret-id"), false);
  assert.equal(result.diagnostics.phase, "before-deployment");
  assert.throws(() =>
    sanitizeDiagnostics({
      ...result.diagnostics,
      environment: { token: "fixture-secret" },
    }),
  );
  assert.throws(() =>
    sanitizeDiagnostics({ ...result.diagnostics, message: "fixture-secret" }),
  );
});

test("token verification failure blocks Worker deployment and preserves safe status/codes", async () => {
  const calls = [];
  const result = await runOperation(
    { operation: "own", kind: "production", target: "production", baseline },
    {
      accountIdExplicit: true,
      verifyToken: true,
      request: async (url, method = "GET") => {
        calls.push({ url, method });
        return {
          status: 403,
          body: {
            success: false,
            errors: [
              { code: 10000, message: "Authorization: Bearer fixture-secret" },
            ],
          },
        };
      },
    },
  );
  assert.equal(result.pass, false);
  assert.equal(result.stage, "token-verification");
  assert.equal(result.diagnostics.httpStatus, 403);
  assert.deepEqual(result.diagnostics.errorCodes, [10000]);
  assert.equal(result.diagnostics.category, "authentication");
  assert.equal(result.diagnostics.phase, "before-deployment");
  assert.equal(calls.length, 1);
  assert.equal(JSON.stringify(result).includes("fixture-secret"), false);
});

const accountId = "45dcbe7b47e04e1f41dc571ceb86b40e";
const denialContext = {
  operation: "cross",
  accountId,
  accountIdExplicit: true,
  tokenVerification: { succeeded: true, status: "active" },
  endpointFamily: "worker-deployments",
  method: "POST",
  phase: "during-deployment",
};
test("denial requires a valid 403 deployment envelope and independently active, explicit account context, without a numeric-code requirement", () => {
  const response = { status: 403, body: { success: false, errors: [] } };
  for (const errors of [
    [],
    [{ code: 10000 }],
    [{ code: 10021 }],
    [{ message: "fixture-secret" }],
  ])
    assert.equal(
      authorizationDenied(
        { ...response, body: { success: false, errors } },
        denialContext,
      ),
      true,
    );
  for (const status of [200, 400, 401, 404, 429, 500])
    assert.equal(
      authorizationDenied({ ...response, status }, denialContext),
      false,
    );
  for (const body of [
    null,
    {},
    { success: true, errors: [] },
    { success: false, errors: "invalid" },
    { success: false, errors: [null] },
  ])
    assert.equal(
      authorizationDenied({ ...response, body }, denialContext),
      false,
    );
  for (const context of [
    undefined,
    { ...denialContext, accountIdExplicit: false },
    { ...denialContext, accountId: "wrong" },
    { ...denialContext, method: "GET" },
    { ...denialContext, phase: "before-deployment" },
    { ...denialContext, endpointFamily: "account-token-verification" },
    {
      ...denialContext,
      tokenVerification: { succeeded: false, status: "inactive" },
    },
  ])
    assert.equal(authorizationDenied(response, context), false);
});

test("evidence rejects extra fields and never accepts raw diagnostics", () => {
  assert.throws(() =>
    sanitizeResult({ pass: false, stage: "unknown", token: "fixture" }),
  );
  assert.throws(() =>
    sanitizeResult({ pass: false, stage: "raw-provider-message" }),
  );
  assert.deepEqual(
    sanitizeResult({ pass: false, stage: "request", status: 403 }),
    {
      pass: false,
      stage: "request",
      status: 403,
    },
  );
});

const version = "0028456d-1234-1234-1234-123456789abc";
const baseline = {
  versionId: version,
  settingsDigest: "a".repeat(64),
  subdomainDigest: "b".repeat(64),
};
const versionPrefixes = JSON.parse(
  await fs.readFile(
    new URL("../../hosting/t005-baseline.json", import.meta.url),
  ),
).versionPrefixes;
const targetBaseline = (target) => ({
  ...baseline,
  versionId: versionPrefixes[target] + "-1234-1234-1234-123456789abc",
});
const activeResponse = {
  status: 200,
  body: { success: true, result: { status: "active" } },
};
async function crossMock(response, overrides = {}) {
  const calls = [];
  const result = await runOperation(
    {
      operation: "cross",
      kind: "production",
      target: "preview",
      baseline: targetBaseline("preview"),
      ...overrides.input,
    },
    {
      accountIdExplicit: true,
      ...overrides.options,
      request: async (url, method = "GET", body) => {
        calls.push({ url, method, body });
        if (url.endsWith("/tokens/verify"))
          return overrides.tokenResponse ?? activeResponse;
        if (response instanceof Error) throw response;
        return response;
      },
    },
  );
  return { result, calls };
}
test("all six real cross deployment probes accept expected 403 without numeric codes, after independent verification", async () => {
  for (const source of ["production", "preview", "acceptance"])
    for (const target of ["production", "preview", "acceptance"].filter(
      (kind) => kind !== source,
    )) {
      const { result, calls } = await crossMock(
        {
          status: 403,
          body: { success: false, errors: [{ message: "fixture-secret" }] },
        },
        { input: { kind: source, target, baseline: targetBaseline(target) } },
      );
      assert.equal(result.pass, true);
      assert.equal(result.stage, "complete");
      assert.equal(result.outcome, "denied-as-expected");
      assert.equal(result.diagnostics.providerSubprocessExitCode, 0);
      assert.equal(calls.length, 2);
      assert.equal(calls[0].url, "/accounts/" + accountId + "/tokens/verify");
      assert.equal(
        calls[1].url,
        "/accounts/" +
          accountId +
          "/workers/scripts/katpb-dev-" +
          target +
          "/deployments",
      );
      assert.equal(calls[1].method, "POST");
      assert.deepEqual(calls[1].body.versions, [
        { version_id: targetBaseline(target).versionId, percentage: 100 },
      ]);
      assert.equal(JSON.stringify(result).includes("fixture-secret"), false);
    }
});
test("cross 2xx fails SECURITY BOUNDARY; 400/404/network/malformed responses fail without isolation evidence", async () => {
  for (const status of [200, 201, 204, 400, 401, 404, 429, 500]) {
    const { result } = await crossMock({
      status,
      body: { success: status < 300, errors: [] },
    });
    assert.equal(result.pass, false);
    assert.equal(
      result.stage,
      status < 300 ? "security-boundary" : "authorization",
    );
    assert.equal(
      result.outcome,
      status < 300 ? "security-boundary-failed" : "unexpected-failure",
    );
    assert.equal(result.diagnostics.providerSubprocessExitCode, 1);
  }
  for (const response of [
    new Error("fixture-secret network"),
    { status: 403, body: null },
    { status: 403, body: { success: true, errors: [] } },
  ]) {
    const { result } = await crossMock(response);
    assert.equal(result.pass, false);
    assert.notEqual(result.outcome, "denied-as-expected");
    assert.equal(JSON.stringify(result).includes("fixture-secret"), false);
  }
});
test("wrong account/target/version, local validation and token-verification failure cannot pass cross isolation", async () => {
  for (const overrides of [
    { options: { accountIdExplicit: false } },
    { input: { target: "production" } },
    { input: { target: "unapproved" } },
    { input: { baseline: {} } },
    { input: { baseline: targetBaseline("production") } },
    { tokenResponse: { status: 403, body: { success: false, errors: [] } } },
    {
      tokenResponse: {
        status: 200,
        body: { success: true, result: { status: "expired" } },
      },
    },
  ]) {
    const { result, calls } = await crossMock(
      { status: 403, body: { success: false, errors: [] } },
      overrides,
    );
    assert.equal(result.pass, false);
    assert.notEqual(result.outcome, "denied-as-expected");
    assert.equal(calls.filter((c) => c.method === "POST").length, 0);
  }
});

test("preview packages are fixed assets only, distinct and bounded", () => {
  const a = controlledPackage("create"),
    b = controlledPackage("update");
  assert.notEqual(a.content.toString(), b.content.toString());
  assert.match(a.content.toString(), /T005/);
  assert.ok(a.content.length < 1024);
  assert.match(a.assetHash, /^[a-f0-9]{32}$/);
  assert.throws(() => controlledPackage("arbitrary-source"));
});

test("preview failure still deletes only the newly created named preview", async () => {
  const calls = [];
  let exists = false;
  const result = await runOperation(
    {
      operation: "preview-lifecycle",
      kind: "preview",
      previewName: "local-katpb-" + "c".repeat(40),
    },
    {
      request: async (url, method = "GET") => {
        calls.push({ url, method });
        if (url.endsWith("/subdomain"))
          return {
            status: 200,
            body: {
              success: true,
              result: { enabled: true, previews_enabled: true },
            },
          };
        if (method === "GET")
          return exists
            ? { status: 200, body: { success: true, result: {} } }
            : {
                status: 404,
                body: { success: false, errors: [{ code: 10025 }] },
              };
        if (method === "POST" && url.endsWith("ignore_base_config=true")) {
          exists = true;
          return {
            status: 200,
            body: {
              success: true,
              result: {
                name: "local-katpb-" + "c".repeat(40),
                slug: "local-katpb-" + "c".repeat(20),
                urls: [
                  "https://local-katpb-" +
                    "c".repeat(20) +
                    "-katpb-dev-preview.katpb.workers.dev",
                ],
              },
            },
          };
        }
        if (method === "DELETE") {
          exists = false;
          return { status: 200, body: { success: true } };
        }
        return {
          status: 500,
          body: { success: false, errors: [{ message: "fixture-secret" }] },
        };
      },
    },
  );
  assert.equal(result.pass, false);
  assert.equal(result.cleanup, true);
  assert.equal(calls.filter((call) => call.method === "DELETE").length, 1);
  const hostReads = calls.filter((call) =>
    /scripts\/.*\/subdomain/.test(call.url),
  );
  assert.equal(hostReads.length, 1);
  assert.equal(hostReads[0].method, "GET");
  assert.equal(JSON.stringify(result).includes("fixture-secret"), false);
});

test("masked subprocess diagnostics are discarded and malformed evidence fails closed", async () => {
  for (const output of [
    JSON.stringify({ pass: false, stage: "request", secret: "fixture-only" }),
    "fixture-only",
  ]) {
    let captured;
    const spawnProcess = (binary, args, options) => {
      captured = { binary, args, options };
      const child = new EventEmitter();
      child.stdin = new PassThrough();
      child.stdout = new PassThrough();
      child.stderr = new PassThrough();
      queueMicrotask(() => {
        child.stderr.write("fixture-only");
        child.stdout.write(output);
        child.emit("close", 1);
      });
      return child;
    };
    const result = await executeOperation(
      { operation: "baseline", kind: "preview" },
      approvedReferences.preview,
      { spawnProcess, env: { HOME: "/owner" } },
    );
    assert.equal(result.pass, false);
    assert.equal(result.stage, "owner-process");
    assert.equal(result.diagnostics.opExitCode, 1);
    assert.equal(result.diagnostics.providerSubprocessExitCode, null);
    assert.equal(JSON.stringify(result).includes("fixture-only"), false);
    assert.equal(captured.options.shell, false);
    assert.equal(
      captured.options.env.CLOUDFLARE_API_TOKEN,
      approvedReferences.preview,
    );
  }
});

function baseMock(kind = "production") {
  const scopedVersion = targetBaseline(kind).versionId;
  const calls = [];
  const request = async (url, method = "GET", body) => {
    calls.push({ url, method, body });
    const result = url.endsWith("/deployments")
      ? method === "POST"
        ? {
            id: "aaaaaaaa-1234-1234-1234-123456789abc",
            versions: [{ version_id: scopedVersion, percentage: 100 }],
          }
        : {
            deployments: [
              {
                id: "aaaaaaaa-1234-1234-1234-123456789abc",
                versions: [{ version_id: scopedVersion, percentage: 100 }],
              },
            ],
          }
      : url.endsWith("/settings")
        ? { compatibility_date: "2026-10-04", bindings: [] }
        : { enabled: true, previews_enabled: kind === "preview" };
    return { status: 200, body: { success: true, result } };
  };
  return { calls, request };
}
test("own update reuses the verified current package; drift prevents mutation", async () => {
  const f = baseMock();
  let resources = 0;
  const verify = async () => {
    resources++;
  };
  const readback = await runOperation(
    { operation: "baseline", kind: "production" },
    { request: f.request, verify },
  );
  assert.equal(readback.pass, true);
  const result = await runOperation(
    {
      operation: "own",
      kind: "production",
      target: "production",
      baseline: readback.baseline,
    },
    { request: f.request, verify },
  );
  assert.equal(result.pass, true);
  assert.equal(result.status, 200);
  assert.equal(resources, 21);
  const writes = f.calls.filter((call) => call.method !== "GET");
  assert.equal(writes.length, 1);
  assert.equal(writes[0].body.versions[0].version_id, version);
  const drift = { ...readback.baseline, settingsDigest: "d".repeat(64) };
  assert.equal(
    (
      await runOperation(
        {
          operation: "own",
          kind: "production",
          target: "production",
          baseline: drift,
        },
        { request: f.request, verify },
      )
    ).pass,
    false,
  );
  assert.equal(f.calls.filter((call) => call.method !== "GET").length, 1);
});

test("own 403 is a failure even when token is active and account explicit", async () => {
  const f = baseMock(),
    verify = async () => {};
  const initial = await runOperation(
    { operation: "baseline", kind: "production" },
    { request: f.request, verify },
  );
  const result = await runOperation(
    {
      operation: "own",
      kind: "production",
      target: "production",
      baseline: initial.baseline,
    },
    {
      verify,
      accountIdExplicit: true,
      verifyToken: true,
      request: async (url, method = "GET", body) =>
        url.endsWith("/tokens/verify")
          ? activeResponse
          : method === "POST"
            ? { status: 403, body: { success: false, errors: [] } }
            : f.request(url, method, body),
    },
  );
  assert.equal(result.pass, false);
  assert.equal(result.stage, "authorization");
  assert.equal(result.status, 403);
  assert.equal(result.diagnostics.providerSubprocessExitCode, 1);
});

test("cross target readback checks deployment identity, version, settings and served bytes using the target credential", async () => {
  const f = baseMock(),
    verify = async () => {};
  const initial = await runOperation(
    { operation: "baseline", kind: "production" },
    { request: f.request, verify },
  );
  const input = { kind: "production", baseline: initial.baseline };
  const before = await runOperation(
    { ...input, operation: "cross-before" },
    { request: f.request, verify },
  );
  assert.equal(before.pass, true);
  assert.equal(before.deploymentId, "aaaaaaaa-1234-1234-1234-123456789abc");
  for (const drift of [
    "none",
    "deployment-id",
    "version",
    "settings",
    "served",
  ]) {
    const after = await runOperation(
      { ...input, operation: "cross-after", deploymentId: before.deploymentId },
      {
        verify: async () => {
          if (drift === "served") throw new Error("fixture-secret");
        },
        request: async (url, method, body) => {
          const response = await f.request(url, method, body);
          if (url.endsWith("/deployments")) {
            if (drift === "deployment-id")
              response.body.result.deployments[0].id = "b".repeat(32);
            if (drift === "version")
              response.body.result.deployments[0].versions[0].version_id =
                "0028456d-9999-9999-9999-999999999999";
          }
          if (drift === "settings" && url.endsWith("/settings"))
            response.body.result.compatibility_date = "2026-10-03";
          return response;
        },
      },
    );
    assert.equal(after.pass, drift === "none", drift);
    assert.equal(JSON.stringify(after).includes("fixture-secret"), false);
  }
  assert.equal(
    f.calls.every((c) => c.method === "GET"),
    true,
  );
});

test("expected 403 exits the provider with zero and the masked parent accepts its sanitized pass result", async () => {
  const { result: providerResult } = await crossMock({
    status: 403,
    body: { success: false, errors: [] },
  });
  const spawnProcess = () => {
    const child = new EventEmitter();
    child.stdin = new PassThrough();
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    queueMicrotask(() => {
      child.stdout.write(JSON.stringify(providerResult));
      child.emit("close", 0);
    });
    return child;
  };
  const result = await executeOperation(
    {
      operation: "cross",
      kind: "production",
      target: "preview",
      baseline: targetBaseline("preview"),
    },
    approvedReferences.production,
    { spawnProcess, env: {} },
  );
  assert.equal(result.pass, true);
  assert.equal(result.status, 403);
  assert.equal(result.stage, "complete");
  assert.equal(result.outcome, "denied-as-expected");
  assert.equal(result.diagnostics.opExitCode, 0);
});

async function sequenceMock(failureOperation, failureAt = 1) {
  const calls = [],
    counts = {};
  const result = await runTestSequence({
    perform: async (operation, kind, target, deploymentId) => {
      calls.push({ operation, kind, target, deploymentId });
      counts[operation] = (counts[operation] ?? 0) + 1;
      if (operation === failureOperation && counts[operation] === failureAt)
        return { pass: false, stage: "request" };
      if (operation === "baseline")
        return { pass: true, baseline: targetBaseline(kind) };
      if (operation === "cross-before")
        return { pass: true, deploymentId: "a".repeat(32) };
      if (operation === "cross-after") {
        assert.equal(deploymentId, "a".repeat(32));
        return { pass: true };
      }
      if (operation === "cross")
        return { pass: true, outcome: "denied-as-expected", status: 403 };
      if (operation === "preview-lifecycle")
        return { pass: true, cleanup: true };
      return { pass: true };
    },
  });
  return { result, calls };
}
test("expected denial continues all six ordered cross probes; each target is verified before/after, lifecycle follows matrix, final verifies all bases", async () => {
  const { result, calls } = await sequenceMock();
  assert.equal(result.pass, true);
  assert.equal(result.matrixSucceeded, true);
  assert.equal(result.baseWorkersExpected, true);
  assert.equal(result.previewRemoved, true);
  assert.equal(calls.length, 28);
  const probes = calls.filter((c) => c.operation === "cross");
  assert.deepEqual(
    probes.map((c) => c.kind + ">" + c.target),
    [
      "production>preview",
      "production>acceptance",
      "preview>production",
      "preview>acceptance",
      "acceptance>production",
      "acceptance>preview",
    ],
  );
  for (let i = 0; i < calls.length; i++)
    if (calls[i].operation === "cross") {
      assert.equal(calls[i - 1].operation, "cross-before");
      assert.equal(calls[i + 1].operation, "cross-after");
      assert.equal(calls[i - 1].kind, calls[i].target);
      assert.equal(calls[i + 1].kind, calls[i].target);
    }
  const lifecycle = calls.findIndex((c) => c.operation === "preview-lifecycle");
  assert.equal(lifecycle, 24);
  assert.deepEqual(
    calls.slice(-3).map((c) => c.operation + " " + c.kind),
    ["final production", "final preview", "final acceptance"],
  );
});
test("own/cross/state failure blocks lifecycle, still verifies final bases; failed final blocks overall pass", async () => {
  for (const [operation, nth] of [
    ["own", 1],
    ["cross", 1],
    ["cross-before", 1],
    ["cross-after", 1],
    ["cross-after", 6],
    ["final", 1],
  ]) {
    const { result, calls } = await sequenceMock(operation, nth);
    assert.equal(result.pass, false);
    assert.equal(result.matrixSucceeded, operation === "final");
    assert.equal(
      calls.some((c) => c.operation === "preview-lifecycle"),
      operation === "final",
    );
    assert.equal(calls.filter((c) => c.operation === "final").length, 3);
    if (operation === "cross")
      assert.equal(
        calls.some((c) => c.operation === "cross-after"),
        true,
      );
  }
});
test("third attempt requires original second-run own successes and reconciled base state; historical failures stay failures", async () => {
  const second = JSON.parse(
    await fs.readFile(
      new URL(
        "../../specs/004-production-hosting/checklists/evidence/cloudflare-t005-owner-attempt-2-2026-10-04.json",
        import.meta.url,
      ),
    ),
  );
  assert.doesNotThrow(() => validateThirdAttempt(second));
  assert.equal(second.pass, false);
  assert.equal(second.results.find((r) => r.operation === "cross").pass, false);
  assert.throws(() =>
    validateThirdAttempt({ ...second, baseWorkersExpected: false }),
  );
  const altered = structuredClone(second);
  altered.results.find(
    (r) => r.operation === "cross",
  ).diagnostics.accountIdExplicit = false;
  assert.throws(() => validateThirdAttempt(altered));
});

test("successful deployment response shape is not mislabeled authorization and retains status", async () => {
  const f = baseMock(),
    verify = async () => {};
  const initial = await runOperation(
    { operation: "baseline", kind: "production" },
    { request: f.request, verify },
  );
  const calls = [];
  const result = await runOperation(
    {
      operation: "own",
      kind: "production",
      target: "production",
      baseline: initial.baseline,
    },
    {
      verify,
      verifyToken: true,
      accountIdExplicit: true,
      request: async (url, method = "GET", body) => {
        calls.push({ url, method });
        if (url.endsWith("/tokens/verify"))
          return {
            status: 200,
            body: { success: true, result: { status: "active" } },
          };
        if (method === "POST")
          return {
            status: 200,
            body: { success: true, result: { id: "fixture-secret-response" } },
          };
        return f.request(url, method, body);
      },
    },
  );
  assert.equal(result.pass, false);
  assert.equal(result.stage, "deployment-response");
  assert.equal(result.diagnostics.httpStatus, 200);
  assert.deepEqual(result.diagnostics.errorCodes, []);
  assert.equal(result.diagnostics.category, "response-shape");
  assert.equal(result.diagnostics.phase, "after-deployment");
  assert.equal(result.diagnostics.tokenVerification.succeeded, true);
  assert.equal(result.diagnostics.providerSubprocessExitCode, 1);
  assert.equal(result.diagnostics.targetWorkerName, "katpb-dev-production");
  assert.equal(
    result.diagnostics.workerPolicyId,
    "1fe57381f57848dbb722225ef8949ea2",
  );
  assert.equal(result.diagnostics.wranglerInvoked, false);
  assert.equal(
    JSON.stringify(result).includes("fixture-secret-response"),
    false,
  );
  assert.equal(calls.filter((call) => call.method === "POST").length, 1);
});

test("compact deployment ID and omitted response versions require authoritative matching readback", async () => {
  const f = baseMock(),
    verify = async () => {};
  const initial = await runOperation(
    { operation: "baseline", kind: "production" },
    { request: f.request, verify },
  );
  for (const matches of [true, false]) {
    let mutated = false;
    const result = await runOperation(
      {
        operation: "own",
        kind: "production",
        target: "production",
        baseline: initial.baseline,
      },
      {
        verify,
        request: async (url, method = "GET", body) => {
          if (method === "POST") {
            mutated = true;
            return {
              status: 200,
              body: { success: true, result: { id: "a".repeat(32) } },
            };
          }
          if (mutated && url.endsWith("/deployments"))
            return {
              status: 200,
              body: {
                success: true,
                result: {
                  deployments: [
                    {
                      id: (matches ? "a" : "b").repeat(32),
                      versions: [{ version_id: version, percentage: 100 }],
                    },
                  ],
                },
              },
            };
          return f.request(url, method, body);
        },
      },
    );
    assert.equal(result.pass, matches);
    assert.equal(result.diagnostics.responseShape.idFormat, "hex32");
    assert.equal(result.diagnostics.responseShape.versionsPresent, false);
    if (!matches) assert.equal(result.stage, "deployment-readback");
  }
});

test("missing/mis-set explicit account binding stops before all API requests", async () => {
  let calls = 0;
  const result = await runOperation(
    { operation: "diagnose-token", kind: "production" },
    {
      enforceAccountBinding: true,
      accountIdExplicit: false,
      request: async () => {
        calls++;
        throw new Error("should not execute");
      },
    },
  );
  assert.equal(result.pass, false);
  assert.equal(result.stage, "account-binding");
  assert.equal(result.diagnostics.accountIdExplicit, false);
  assert.equal(calls, 0);
});

test("second attempt requires preserved unchanged first-run evidence and active read-only diagnostic", async () => {
  const reference = "45dcbe7b47e04e1f41dc571ceb86b40e";
  const first = {
    task: "T005",
    accountId: reference,
    pass: false,
    baseWorkersExpected: true,
    t023Started: false,
    results: ["production", "preview", "acceptance"]
      .flatMap((credential) => [
        {
          operation: "baseline",
          credential,
          pass: true,
          stage: "complete",
          baseline,
        },
        {
          operation: "final",
          credential,
          pass: true,
          stage: "complete",
          baseline,
        },
      ])
      .concat([
        {
          operation: "own",
          credential: "production",
          target: "production",
          pass: false,
          stage: "authorization",
        },
      ]),
  };
  const result = await runOperation(
    { operation: "diagnose-token", kind: "production" },
    {
      accountIdExplicit: true,
      request: async () => ({
        status: 200,
        body: { success: true, result: { status: "active" } },
      }),
    },
  );
  const diagnostic = {
    mode: "pre-mutation-token-diagnostic",
    accountId: reference,
    workerMutationsAttempted: false,
    t023Started: false,
    result,
  };
  assert.doesNotThrow(() => validateSecondAttempt(first, diagnostic));
  assert.throws(() =>
    validateSecondAttempt(first, {
      ...diagnostic,
      result: { ...result, pass: false },
    }),
  );
  assert.throws(() =>
    validateSecondAttempt({ ...first, baseWorkersExpected: false }, diagnostic),
  );
  assert.throws(() =>
    validateSecondAttempt(first, {
      ...diagnostic,
      workerMutationsAttempted: true,
    }),
  );
});

test("preview lifecycle uploads only two fixed packages and deletes; cleanup failure is nonzero", async () => {
  for (const [failDelete, singleUpload] of [
    [false, false],
    [true, false],
    [false, true],
  ]) {
    const sessionToken = singleUpload
      ? "fixture." +
        Buffer.from(
          JSON.stringify({ wrangler_single_asset_uploads: true }),
        ).toString("base64url") +
        ".fixture"
      : "fixture-session";
    const name = "local-katpb-" + "e".repeat(40);
    const slug = "local-katpb-" + "e".repeat(20);
    const stableUrl =
      "https://" + slug + "-katpb-dev-preview.katpb.workers.dev";
    let exists = false,
      deploymentId,
      deploymentCount = 0;
    const calls = [],
      packages = [],
      verified = [];
    const result = await runOperation(
      { operation: "preview-lifecycle", kind: "preview", previewName: name },
      {
        request: async (url, method = "GET", body, uploadToken) => {
          calls.push({ url, method });
          if (url.endsWith("/subdomain"))
            return {
              status: 200,
              body: {
                success: true,
                result: { enabled: true, previews_enabled: true },
              },
            };
          let result = {};
          if (method === "GET" && !url.endsWith("/latest") && !exists)
            return {
              status: 404,
              body: { success: false, errors: [{ code: 10025 }] },
            };
          if (url.endsWith("ignore_base_config=true")) {
            exists = true;
            result = { name, slug, urls: [stableUrl] };
          } else if (url.endsWith("assets-upload-session"))
            result = {
              jwt: sessionToken,
              buckets: [[body.manifest["/index.html"].hash]],
            };
          else if (url.includes("/assets/upload")) {
            assert.equal(uploadToken, sessionToken);
            if (singleUpload) {
              assert.ok(body instanceof Blob);
              assert.equal(body.type, "text/html");
              assert.match(url, /\/upload\/[a-f0-9]{32}$/);
              packages.push(Buffer.from(await body.arrayBuffer()));
            } else {
              const values = [...body.values()];
              assert.equal(values.length, 1);
              packages.push(Buffer.from(await values[0].text(), "base64"));
            }
            result = { jwt: "fixture-completion" };
          } else if (method === "POST" && url.endsWith("/deployments")) {
            const metadata = JSON.parse(body.get("metadata"));
            assert.deepEqual(metadata.env, {});
            assert.equal(metadata.main_module, undefined);
            assert.equal(metadata.assets.jwt, "fixture-completion");
            assert.equal(body.getAll("files").length, 1);
            assert.equal(body.get("files").name, "_headers");
            deploymentId =
              (deploymentCount++ ? "bbbbbbbb" : "aaaaaaaa") +
              "-1234-1234-1234-123456789abc";
            result = {
              id: deploymentId,
              urls: [
                "https://" +
                  deploymentId +
                  "-katpb-dev-preview.katpb.workers.dev",
              ],
            };
          } else if (url.endsWith("/latest")) result = { id: deploymentId };
          else if (method === "DELETE") {
            if (failDelete)
              return {
                status: 403,
                body: { success: false, errors: [{ code: 10000 }] },
              };
            exists = false;
          }
          return { status: 200, body: { success: true, result } };
        },
        verify: async (url, expected, retry, observe) => {
          verified.push(url);
          observe(200, true);
          const bytes = packages.at(-1);
          assert.equal(
            expected.sha256,
            crypto.createHash("sha256").update(bytes).digest("hex"),
          );
        },
      },
    );
    assert.equal(result.pass, !failDelete);
    assert.equal(result.cleanup, !failDelete);
    assert.equal(result.created, true);
    assert.equal(result.updated, true);
    assert.equal(packages.length, 2);
    assert.notEqual(packages[0].toString(), packages[1].toString());
    assert.equal(verified.length, 4);
    assert.equal(verified[0], stableUrl);
    assert.equal(verified[2], stableUrl);
    assert.equal(result.previewEvidence.resourceCreated, true);
    assert.deepEqual(result.previewEvidence.stableUrls, [stableUrl]);
    assert.equal(result.previewEvidence.deployments.length, 2);
    assert.deepEqual(
      result.previewEvidence.servedRequests.map((r) => r.httpStatus),
      [200, 200, 200, 200],
    );
    assert.ok(
      calls
        .filter((call) => call.method === "DELETE")
        .every((call) => call.url.endsWith("/previews/" + name)),
    );
    assert.equal(JSON.stringify(result).includes("fixture-session"), false);
    assert.equal(JSON.stringify(result).includes("fixture-completion"), false);
  }
});

test("an existing named preview or uncertain absence blocks all preview mutations", async () => {
  for (const status of [200, 403, 404, 500]) {
    let writes = 0;
    const result = await runOperation(
      {
        operation: "preview-lifecycle",
        kind: "preview",
        previewName: "local-katpb-" + "f".repeat(40),
      },
      {
        request: async (_url, method = "GET") => {
          if (_url.endsWith("/subdomain"))
            return {
              status: 200,
              body: {
                success: true,
                result: { enabled: true, previews_enabled: true },
              },
            };
          if (method !== "GET") writes++;
          return {
            status,
            body: {
              success: status === 200,
              result: {},
              errors: [{ code: 10000 }],
            },
          };
        },
      },
    );
    assert.equal(result.pass, false);
    assert.equal(writes, 0);
  }
});

function previewFixture({
  enabled = true,
  previewsEnabled = true,
  noUrls = false,
  unsafeUrl = null,
} = {}) {
  const name = "local-katpb-" + "d".repeat(40),
    slug = "local-katpb-" + "d".repeat(20);
  const stable = "https://" + slug + "-katpb-dev-preview.katpb.workers.dev";
  const calls = [];
  let exists = false,
    deploymentId,
    count = 0;
  const request = async (url, method = "GET", body) => {
    calls.push({ url, method });
    if (url.endsWith("/subdomain"))
      return {
        status: 200,
        body: {
          success: true,
          result: { enabled, previews_enabled: previewsEnabled },
        },
      };
    if (method === "GET" && url.endsWith("/latest"))
      return {
        status: 200,
        body: { success: true, result: { id: deploymentId } },
      };
    if (method === "GET")
      return exists
        ? { status: 200, body: { success: true, result: {} } }
        : { status: 404, body: { success: false, errors: [{ code: 10025 }] } };
    let result = {};
    if (url.endsWith("ignore_base_config=true")) {
      exists = true;
      result = { name, slug, urls: noUrls ? [] : [unsafeUrl ?? stable] };
    } else if (url.endsWith("assets-upload-session")) {
      result = { jwt: "fixture-secret-completion", buckets: [] };
    } else if (method === "POST" && url.endsWith("/deployments")) {
      deploymentId =
        (count++ ? "bbbbbbbb" : "aaaaaaaa") + "-1234-1234-1234-123456789abc";
      result = {
        id: deploymentId,
        urls: [
          "https://" + deploymentId + "-katpb-dev-preview.katpb.workers.dev",
        ],
      };
    } else if (method === "DELETE") exists = false;
    return { status: 200, body: { success: true, result } };
  };
  return {
    input: {
      operation: "preview-lifecycle",
      kind: "preview",
      previewName: name,
    },
    request,
    calls,
    stable,
    slug,
  };
}

test("preview host disabled/unknown or normal workers.dev disabled fails before any mutation", async () => {
  for (const options of [
    { previewsEnabled: false },
    { previewsEnabled: null },
    { enabled: false },
  ]) {
    const fixture = previewFixture(options);
    const result = await runOperation(fixture.input, {
      request: fixture.request,
      verify: async () => {
        assert.fail("unexpected served read");
      },
    });
    assert.equal(result.pass, false);
    assert.equal(result.stage, "preview-host");
    assert.equal(fixture.calls.filter((r) => r.method !== "GET").length, 0);
  }
});
test("preview-parent baseline requires Preview URLs, while production/acceptance must keep them disabled", async () => {
  for (const kind of ["production", "preview", "acceptance"]) {
    const fixture = baseMock(kind),
      verify = async () => {};
    assert.equal(
      (
        await runOperation(
          { operation: "baseline", kind },
          { request: fixture.request, verify },
        )
      ).pass,
      true,
    );
    const result = await runOperation(
      { operation: "baseline", kind },
      {
        verify,
        request: async (url, method, body) =>
          url.endsWith("/subdomain")
            ? {
                status: 200,
                body: {
                  success: true,
                  result: {
                    enabled: true,
                    previews_enabled: kind !== "preview",
                  },
                },
              }
            : fixture.request(url, method, body),
      },
    );
    assert.equal(result.pass, false);
    assert.equal(result.stage, "settings");
  }
});
test("only provider-returned stable/deployment URLs are fetched, preserving shortened slug and exact URL strings", async () => {
  const fixture = previewFixture(),
    reads = [];
  const result = await runOperation(fixture.input, {
    request: fixture.request,
    verify: async (url, expected, retry, observe) => {
      reads.push(url);
      observe(200, true);
    },
  });
  assert.equal(result.pass, true);
  assert.equal(result.previewEvidence.resourceCreated, true);
  assert.equal(result.previewEvidence.previewSlug, fixture.slug);
  assert.equal(reads[0], fixture.stable);
  assert.deepEqual(reads, [
    fixture.stable,
    ...result.previewEvidence.deployments[0].urls,
    fixture.stable,
    ...result.previewEvidence.deployments[1].urls,
  ]);
  assert.equal(
    reads.some((url) => url.includes(fixture.input.previewName)),
    false,
  );
  assert.deepEqual(
    result.previewEvidence.servedRequests.map((r) => r.httpStatus),
    [200, 200, 200, 200],
  );
  assert.doesNotThrow(() => sanitizeResult(result));
  assert.equal(JSON.stringify(result).includes("fixture-secret"), false);
});
test("missing URLs fail closed after resource creation and cleanup; unsafe provider URLs are never fetched or retained", async () => {
  for (const options of [
    { noUrls: true },
    { unsafeUrl: "https://evil.example/?token=fixture-secret" },
    {
      unsafeUrl:
        "https://fixture-secret@local-katpb-d-katpb-dev-preview.katpb.workers.dev",
    },
  ]) {
    const fixture = previewFixture(options);
    const result = await runOperation(fixture.input, {
      request: fixture.request,
      verify: async () => {
        assert.fail("unsafe URL fetched");
      },
    });
    assert.equal(result.pass, false);
    assert.equal(result.stage, "preview-url");
    assert.equal(result.previewEvidence.resourceCreated, true);
    assert.equal(result.created, false);
    assert.equal(result.cleanup, true);
    assert.deepEqual(result.previewEvidence.stableUrls, []);
    assert.equal(JSON.stringify(result).includes("fixture-secret"), false);
  }
});
test("URL validation rejects inferred overlong DNS labels, wrong Worker/deployment, paths, auth and query strings", () => {
  const slug = "local-katpb-" + "a".repeat(20);
  const stable = "https://" + slug + "-katpb-dev-preview.katpb.workers.dev";
  assert.equal(validatePreviewUrl(stable, slug), stable);
  const id = "aaaaaaaa-1234-1234-1234-123456789abc";
  for (const url of [
    "http://" + slug + "-katpb-dev-preview.katpb.workers.dev",
    stable + "/path",
    stable + "?token=fixture",
    stable.replace("katpb-dev-preview", "katpb-dev-production"),
    "https://local-katpb-" +
      "a".repeat(40) +
      "-katpb-dev-preview.katpb.workers.dev",
  ])
    assert.throws(() => validatePreviewUrl(url, slug));
  assert.throws(() =>
    validatePreviewUrl(
      "https://bbbbbbbb-katpb-dev-preview.katpb.workers.dev",
      slug,
      id,
    ),
  );
});
test("served-package HTTP 404 is retained separately from successful resource/deployment creation and cleanup absence", async () => {
  const fixture = previewFixture(),
    originalFetch = globalThis.fetch;
  const reads = [];
  globalThis.fetch = async (url) => {
    reads.push(url);
    return new Response("Not found", { status: 404 });
  };
  try {
    const result = await runOperation(fixture.input, {
      request: fixture.request,
      verify: (url, expected, retry, observe) =>
        publicAsset(url, expected, false, observe),
    });
    assert.equal(result.pass, false);
    assert.equal(result.stage, "served-package");
    assert.equal(result.status, 404);
    assert.equal(result.previewEvidence.resourceCreated, true);
    assert.equal(result.previewEvidence.deployments.length, 1);
    assert.equal(result.previewEvidence.deployments[0].servedVerified, false);
    assert.equal(result.previewEvidence.servedRequests[0].httpStatus, 404);
    assert.equal(result.cleanup, true);
    assert.deepEqual(reads, [fixture.stable]);
    assert.equal(result.diagnostics.requests.at(-1).httpStatus, 404);
    assert.equal(
      result.diagnostics.requests.at(-1).endpointFamily,
      "worker-preview",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
test("focused lifecycle gates on the complete historical matrix, does not replay authorization mutations and checks all bases", async () => {
  const third = JSON.parse(
    await fs.readFile(
      new URL(
        "../../specs/004-production-hosting/checklists/evidence/cloudflare-t005-owner-attempt-3-2026-10-04.json",
        import.meta.url,
      ),
    ),
  );
  assert.doesNotThrow(() => validateProvenMatrix(third));
  const invalid = structuredClone(third);
  invalid.results.find((r) => r.operation === "cross").pass = false;
  assert.throws(() => validateProvenMatrix(invalid));
  assert.throws(() =>
    validateProvenMatrix({ ...third, previewRemoved: false }),
  );
  const calls = [];
  const sequence = await runPreviewOnlySequence({
    perform: async (operation, kind) => {
      calls.push(operation + " " + kind);
      return { pass: true, baseline: targetBaseline(kind), cleanup: true };
    },
  });
  assert.equal(sequence.pass, true);
  assert.deepEqual(calls, [
    "baseline production",
    "baseline preview",
    "baseline acceptance",
    "preview-lifecycle preview",
    "final production",
    "final preview",
    "final acceptance",
  ]);
});
test("focused lifecycle baseline/cleanup/final failure remains nonzero and known base state is always checked", async () => {
  for (const failing of [
    "baseline-preview",
    "lifecycle",
    "cleanup",
    "final-acceptance",
  ]) {
    const calls = [];
    const sequence = await runPreviewOnlySequence({
      perform: async (operation, kind) => {
        calls.push(operation + " " + kind);
        return {
          pass:
            !(
              failing === "baseline-preview" &&
              operation === "baseline" &&
              kind === "preview"
            ) &&
            !(failing === "lifecycle" && operation === "preview-lifecycle") &&
            !(
              failing === "final-acceptance" &&
              operation === "final" &&
              kind === "acceptance"
            ),
          baseline: targetBaseline(kind),
          cleanup: failing !== "cleanup",
        };
      },
    });
    assert.equal(sequence.pass, false);
    assert.equal(
      calls.some((c) => c.startsWith("own ") || c.startsWith("cross ")),
      false,
    );
    assert.equal(
      calls.some((c) => c === "preview-lifecycle preview"),
      failing !== "baseline-preview",
    );
    assert.equal(
      calls.filter((c) => c.startsWith("final ")).length,
      failing === "baseline-preview" ? 1 : 3,
    );
  }
});
