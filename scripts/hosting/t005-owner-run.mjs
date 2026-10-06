// Credential-free orchestrator. Run manually from the owner's VS Code terminal.
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { kinds, sanitizePreviewEvidence } from "./t005-provider.mjs";
import {
  accountId,
  workerIds,
  sanitizeDiagnostics,
  newDiagnostics,
  setCategory,
} from "./t005-diagnostics.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const provider = path.join(root, "scripts/hosting/t005-provider.mjs");
const op = "/opt/homebrew/bin/op";
const firstOutput = path.join(root, ".deploy/evidence/t005-owner-run.json");
const lock = path.join(root, ".deploy/r4-hosting.lock");
export const approvedReferences = Object.freeze({
  production: "op://katpb-dev/katpb-r4-production/credential",
  preview: "op://katpb-dev/katpb-r4-preview/credential",
  acceptance: "op://katpb-dev/katpb-r4-acceptance/credential",
});
function check(value) {
  if (!value) throw new Error("T005 owner input or result rejected");
}
export function parseOwnerArguments(args) {
  check(args.length === 6);
  const refs = {};
  for (let i = 0; i < args.length; i += 2) {
    const kind = kinds.find((kind) => args[i] === "--" + kind + "-ref");
    check(
      kind &&
        !Object.hasOwn(refs, kind) &&
        args[i + 1] === approvedReferences[kind],
    );
    refs[kind] = args[i + 1];
  }
  check(kinds.every((kind) => refs[kind] === approvedReferences[kind]));
  return refs;
}
export function parseDiagnosticArguments(args) {
  check(
    args.length === 2 &&
      args[0] === "--diagnose-production-ref" &&
      args[1] === approvedReferences.production,
  );
  return args[1];
}
export function opInvocation(
  kind,
  reference,
  operation,
  sourceEnv = process.env,
) {
  check(kinds.includes(kind) && reference === approvedReferences[kind]);
  // No other references, auth variables, dotenv discovery, injection hooks or proxies.
  const env = Object.fromEntries(
    ["HOME", "USER", "LOGNAME", "TMPDIR"]
      .filter(
        (key) =>
          typeof sourceEnv[key] === "string" &&
          !sourceEnv[key].includes("op://"),
      )
      .map((key) => [key, sourceEnv[key]]),
  );
  env.PATH =
    path.dirname(process.execPath) + ":/opt/homebrew/bin:/usr/bin:/bin";
  env.OP_RUN_NO_MASKING = "false";
  env.CLOUDFLARE_API_TOKEN = reference;
  // Explicit non-secret account binding, never inherited or inferred.
  env.CLOUDFLARE_ACCOUNT_ID = accountId;
  env.T005_OWNER_SUBPROCESS = "1";
  return {
    binary: op,
    args: ["run", "--no-masking=false", "--", process.execPath, provider],
    env,
    operation,
  };
}
const stages = new Set([
  "input",
  "credential",
  "policy",
  "response",
  "request",
  "baseline",
  "settings",
  "served-package",
  "base-state",
  "asset-upload",
  "authorization",
  "preview-preflight",
  "preview-create",
  "preview-update",
  "preview-delete",
  "complete",
  "owner-process",
  "account-binding",
  "token-verification",
  "deployment-response",
  "deployment-readback",
  "security-boundary",
  "preview-host",
  "preview-url",
]);
export function sanitizeResult(value) {
  check(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).every((key) =>
        [
          "pass",
          "stage",
          "status",
          "baseline",
          "created",
          "updated",
          "cleanup",
          "diagnostics",
          "outcome",
          "deploymentId",
          "previewEvidence",
        ].includes(key),
      ),
  );
  check(typeof value.pass === "boolean" && stages.has(value.stage));
  if (Object.hasOwn(value, "outcome"))
    check(
      [
        "denied-as-expected",
        "security-boundary-failed",
        "unexpected-failure",
      ].includes(value.outcome),
    );
  if (Object.hasOwn(value, "deploymentId"))
    check(
      typeof value.deploymentId === "string" &&
        /^(?:[a-f0-9]{32}|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})$/.test(
          value.deploymentId,
        ),
    );
  if (Object.hasOwn(value, "status"))
    check(
      Number.isInteger(value.status) &&
        value.status >= 100 &&
        value.status <= 599,
    );
  for (const key of ["created", "updated", "cleanup"])
    if (Object.hasOwn(value, key)) check(typeof value[key] === "boolean");
  if (Object.hasOwn(value, "baseline")) {
    const baseline = value.baseline;
    check(
      baseline &&
        Object.keys(baseline).sort().join(",") ===
          "settingsDigest,subdomainDigest,versionId" &&
        /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(
          baseline.versionId,
        ) &&
        /^[a-f0-9]{64}$/.test(baseline.settingsDigest) &&
        /^[a-f0-9]{64}$/.test(baseline.subdomainDigest),
    );
  }
  if (Object.hasOwn(value, "diagnostics"))
    sanitizeDiagnostics(value.diagnostics);
  if (Object.hasOwn(value, "previewEvidence"))
    sanitizePreviewEvidence(value.previewEvidence);
  // Copy only the verified schema; no raw op/provider stdout/stderr ever escapes.
  return JSON.parse(JSON.stringify(value));
}
export function executeOperation(
  input,
  reference,
  { spawnProcess = spawn, env = process.env } = {},
) {
  const invocation = opInvocation(input.kind, reference, input.operation, env);
  return new Promise((resolve) => {
    let child,
      text = "",
      overflow = false,
      timedOut = false;
    const failed = (code = null) => {
      const diagnostics = newDiagnostics(
        input,
        invocation.env.CLOUDFLARE_ACCOUNT_ID === accountId,
      );
      diagnostics.phase = "unknown";
      diagnostics.opExitCode =
        Number.isInteger(code) && code >= 0 && code <= 255 ? code : null;
      setCategory(diagnostics, "transport");
      return {
        pass: false,
        stage: "owner-process",
        diagnostics: sanitizeDiagnostics(diagnostics),
      };
    };
    const timer = setTimeout(
      () => {
        timedOut = true;
        try {
          process.kill(-child.pid, "SIGTERM");
        } catch {}
        setTimeout(() => {
          try {
            process.kill(-child.pid, "SIGKILL");
          } catch {}
        }, 5000).unref();
      },
      12 * 60 * 1000,
    );
    try {
      child = spawnProcess(invocation.binary, invocation.args, {
        cwd: root,
        env: invocation.env,
        shell: false,
        // Ctrl-C stops further tests while the current subprocess can finish cleanup.
        detached: true,
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch {
      clearTimeout(timer);
      resolve(failed());
      return;
    }
    child.stdout.on("data", (chunk) => {
      if (text.length + chunk.length > 32768) {
        overflow = true;
        text = "";
      } else if (!overflow) text += chunk;
    });
    child.stderr.on("data", () => {
      /* Discard, never print or persist diagnostics. */
    });
    child.stdin.on("error", () => {});
    child.on("error", () => {
      clearTimeout(timer);
      resolve(failed());
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      try {
        check(!overflow && !timedOut);
        const result = sanitizeResult(JSON.parse(text));
        check(code === (result.pass ? 0 : 1));
        if (result.diagnostics) {
          check(result.diagnostics.providerSubprocessExitCode === code);
          result.diagnostics.opExitCode = code;
        }
        resolve(result);
      } catch {
        resolve(failed(code));
      }
    });
    child.stdin.end(JSON.stringify(input));
  });
}
export function validateSecondAttempt(first, diagnostic) {
  check(
    first?.task === "T005" &&
      first.accountId === accountId &&
      first.pass === false &&
      first.baseWorkersExpected === true &&
      first.t023Started === false &&
      Array.isArray(first.results),
  );
  check(
    first.results.some(
      (r) =>
        r.operation === "own" &&
        r.credential === "production" &&
        r.target === "production" &&
        r.pass === false,
    ),
  );
  check(!first.results.some((r) => r.operation === "preview-lifecycle"));
  for (const kind of kinds) {
    const initial = first.results.find(
      (r) => r.operation === "baseline" && r.credential === kind,
    );
    const final = first.results.find(
      (r) => r.operation === "final" && r.credential === kind,
    );
    check(
      initial?.pass === true &&
        final?.pass === true &&
        JSON.stringify(initial.baseline) === JSON.stringify(final.baseline),
    );
    sanitizeResult({
      pass: initial.pass,
      stage: initial.stage,
      baseline: initial.baseline,
    });
  }
  check(
    diagnostic?.mode === "pre-mutation-token-diagnostic" &&
      diagnostic.accountId === accountId &&
      diagnostic.workerMutationsAttempted === false &&
      diagnostic.t023Started === false,
  );
  const result = sanitizeResult(diagnostic.result);
  check(
    result.pass === true &&
      result.diagnostics?.operation === "diagnose-token" &&
      result.diagnostics.targetWorkerName === "katpb-dev-production" &&
      result.diagnostics.accountIdExplicit === true &&
      result.diagnostics.tokenVerification.succeeded === true &&
      result.diagnostics.tokenVerification.status === "active" &&
      result.diagnostics.requests.length === 1 &&
      result.diagnostics.requests[0].endpointFamily ===
        "account-token-verification",
  );
}
export function validateThirdAttempt(second) {
  check(
    second?.task === "T005" &&
      second.attempt === 2 &&
      second.accountId === accountId &&
      second.pass === false &&
      second.baseWorkersExpected === true &&
      second.t023Started === false &&
      Array.isArray(second.results),
  );
  check(
    !second.results.some(
      (r) => r.operation === "preview-lifecycle" || r.stage === "owner-process",
    ),
  );
  for (const kind of kinds) {
    const initial = second.results.find(
      (r) => r.operation === "baseline" && r.credential === kind,
    );
    const final = second.results.find(
      (r) => r.operation === "final" && r.credential === kind,
    );
    const own = second.results.find(
      (r) =>
        r.operation === "own" && r.credential === kind && r.target === kind,
    );
    check(
      initial?.pass === true &&
        final?.pass === true &&
        JSON.stringify(initial.baseline) === JSON.stringify(final.baseline) &&
        own?.pass === true &&
        own.status >= 200 &&
        own.status < 300,
    );
  }
  const cross = second.results.filter((r) => r.operation === "cross");
  check(
    cross.length === 1 &&
      cross[0].pass === false &&
      cross[0].credential === "production" &&
      cross[0].target === "preview" &&
      cross[0].status === 403,
  );
  const d = sanitizeDiagnostics(cross[0].diagnostics);
  check(
    d.accountIdExplicit === true &&
      d.tokenVerification.succeeded === true &&
      d.tokenVerification.status === "active" &&
      d.phase === "during-deployment" &&
      d.endpointFamily === "worker-deployments" &&
      d.method === "POST" &&
      d.targetWorkerName === "katpb-dev-preview" &&
      d.httpStatus === 403,
  );
}

export function validateProvenMatrix(third) {
  check(
    third?.task === "T005" &&
      third.attempt === 3 &&
      third.accountId === accountId &&
      third.matrixSucceeded === true &&
      third.baseWorkersExpected === true &&
      third.previewRemoved === true &&
      third.t023Started === false &&
      Array.isArray(third.results),
  );
  const expectedPairs = kinds.flatMap((source) =>
    kinds
      .filter((target) => target !== source)
      .map((target) => source + ">" + target),
  );
  const cross = third.results.filter((r) => r.operation === "cross");
  check(
    cross.length === 6 &&
      JSON.stringify(cross.map((r) => r.credential + ">" + r.target).sort()) ===
        JSON.stringify(expectedPairs.sort()),
  );
  for (const r of cross) {
    const d = sanitizeDiagnostics(r.diagnostics);
    check(
      r.pass === true &&
        r.status === 403 &&
        r.outcome === "denied-as-expected" &&
        d.accountIdExplicit &&
        d.tokenVerification.succeeded &&
        d.tokenVerification.status === "active" &&
        d.operation === "cross" &&
        d.method === "POST" &&
        d.endpointFamily === "worker-deployments" &&
        d.phase === "during-deployment" &&
        d.httpStatus === 403 &&
        d.targetWorkerName === "katpb-dev-" + r.target,
    );
    const index = third.results.indexOf(r),
      before = third.results[index - 1],
      after = third.results[index + 1];
    check(
      before?.operation === "cross-before" &&
        after?.operation === "cross-after" &&
        before.credential === r.target &&
        after.credential === r.target &&
        before.pass === true &&
        after.pass === true &&
        before.deploymentId === after.deploymentId &&
        JSON.stringify(before.baseline) === JSON.stringify(after.baseline),
    );
  }
  for (const kind of kinds) {
    const own = third.results.find(
      (r) =>
        r.operation === "own" && r.credential === kind && r.target === kind,
    );
    const initial = third.results.find(
      (r) => r.operation === "baseline" && r.credential === kind,
    );
    const final = third.results.find(
      (r) => r.operation === "final" && r.credential === kind,
    );
    check(
      own?.pass === true &&
        own.status >= 200 &&
        own.status < 300 &&
        initial?.pass === true &&
        final?.pass === true &&
        JSON.stringify(initial.baseline) === JSON.stringify(final.baseline),
    );
  }
  const lifecycle = third.results.find(
    (r) => r.operation === "preview-lifecycle",
  );
  check(
    lifecycle?.pass === false &&
      lifecycle.stage === "served-package" &&
      lifecycle.cleanup === true,
  );
}

export async function runPreviewOnlySequence({
  perform,
  baselines = {},
  interrupted = () => false,
}) {
  let eligible = false,
    previewRemoved = false;
  const finalResults = [];
  try {
    for (const kind of kinds) {
      if (interrupted()) break;
      const result = await perform("baseline", kind);
      if (!result.pass || !result.baseline) break;
      baselines[kind] = result.baseline;
    }
    eligible = kinds.every((kind) => baselines[kind]) && !interrupted();
    if (eligible) {
      const result = await perform("preview-lifecycle", "preview");
      previewRemoved = result.cleanup === true;
      eligible = result.pass;
    }
  } finally {
    for (const kind of kinds)
      if (baselines[kind]) finalResults.push(await perform("final", kind));
  }
  const baseWorkersExpected =
    finalResults.length === 3 && finalResults.every((r) => r.pass);
  return {
    pass: eligible && !interrupted() && previewRemoved && baseWorkersExpected,
    previewRemoved,
    baseWorkersExpected,
  };
}

// Pure sequencing boundary: tests use injected credential-free provider results.
export async function runTestSequence({
  perform,
  baselines = {},
  interrupted = () => false,
}) {
  let eligible = false,
    mutationsStarted = false,
    previewAttempted = false,
    previewRemoved = false,
    matrixSucceeded = false;
  const finalResults = [];
  try {
    for (const kind of kinds) {
      if (interrupted()) break;
      const result = await perform("baseline", kind);
      if (!result.pass || !result.baseline) break;
      baselines[kind] = result.baseline;
    }
    eligible = kinds.every((kind) => baselines[kind]) && !interrupted();
    if (eligible) {
      for (const kind of kinds) {
        if (interrupted()) {
          eligible = false;
          break;
        }
        mutationsStarted = true;
        if (!(await perform("own", kind, kind)).pass) {
          eligible = false;
          break;
        }
      }
    }
    if (eligible) {
      outer: for (const kind of kinds) {
        for (const target of kinds.filter((target) => target !== kind)) {
          if (interrupted()) {
            eligible = false;
            break outer;
          }
          // The target's OWN token supplies independent state evidence. The source
          // token is used solely for verification and the exact deployment probe.
          const before = await perform("cross-before", target);
          if (!before.pass || !before.deploymentId || interrupted()) {
            eligible = false;
            break outer;
          }
          const probe = await perform("cross", kind, target);
          const after = await perform(
            "cross-after",
            target,
            undefined,
            before.deploymentId,
          );
          if (
            !probe.pass ||
            probe.outcome !== "denied-as-expected" ||
            !after.pass
          ) {
            eligible = false;
            break outer;
          }
        }
      }
    }
    matrixSucceeded = eligible && !interrupted();
    if (matrixSucceeded) {
      previewAttempted = true;
      const result = await perform("preview-lifecycle", "preview");
      previewRemoved = result.cleanup === true;
      eligible = result.pass;
    }
  } finally {
    // Also verify every known base after any failed probe or lifecycle.
    for (const kind of kinds)
      if (baselines[kind]) finalResults.push(await perform("final", kind));
  }
  const baseWorkersExpected =
    finalResults.length === 3 && finalResults.every((r) => r.pass);
  return {
    mutationsStarted,
    previewAttempted,
    previewRemoved,
    matrixSucceeded,
    baseWorkersExpected,
    pass: eligible && !interrupted() && baseWorkersExpected && previewRemoved,
  };
}

async function runOwner(refs, attempt = 1) {
  const output =
    attempt === 1
      ? firstOutput
      : path.join(
          root,
          attempt === 4
            ? ".deploy/evidence/t005-preview-lifecycle-fourth.json"
            : attempt === 2
              ? ".deploy/evidence/t005-owner-run-second.json"
              : ".deploy/evidence/t005-owner-run-third.json",
        );
  check(
    process.version === "v24.21.0" &&
      !process.env.CLOUDFLARE_API_TOKEN &&
      !process.env.NODE_OPTIONS &&
      !process.env.NODE_DEBUG,
  );
  if (attempt === 4) {
    const bytes = await fs.readFile(
      path.join(root, ".deploy/evidence/t005-owner-run-third.json"),
    );
    check(
      crypto.createHash("sha256").update(bytes).digest("hex") ===
        "08091cf8b423efd4678910482087bc277c11a2d462b030cf6dad4a47b88e3a03",
    );
    validateProvenMatrix(JSON.parse(bytes));
    const wrangler = JSON.parse(
      await fs.readFile(path.join(root, "node_modules/wrangler/package.json")),
    );
    check(wrangler.version === "4.147.0");
  }
  if (attempt === 3) {
    // Preserve both failed runs byte-for-byte; no evidence or lock bypass.
    for (const [name, hash] of [
      [
        "t005-owner-run.json",
        "f04798ecf1135a12e8c3c198a29aa66c481a0a831ece1ddf1d1a7b562cf0b4bd",
      ],
      [
        "t005-owner-run-second.json",
        "fce3b1dbe5bf257a929e1ae253243e4a7300a13ace3302cffa62dde3087bf156",
      ],
    ]) {
      const bytes = await fs.readFile(
        path.join(root, ".deploy/evidence", name),
      );
      check(crypto.createHash("sha256").update(bytes).digest("hex") === hash);
      if (name.includes("second")) validateThirdAttempt(JSON.parse(bytes));
    }
  }
  if (attempt === 2) {
    const first = JSON.parse(await fs.readFile(firstOutput, "utf8"));
    const diagnostic = JSON.parse(
      await fs.readFile(
        path.join(
          root,
          ".deploy/evidence/t005-production-token-diagnostic.json",
        ),
        "utf8",
      ),
    );
    validateSecondAttempt(first, diagnostic);
    for (const [key, file] of [
      ["providerCodeSha256", provider],
      [
        "diagnosticCodeSha256",
        path.join(root, "scripts/hosting/t005-diagnostics.mjs"),
      ],
    ]) {
      check(
        diagnostic[key] ===
          crypto
            .createHash("sha256")
            .update(await fs.readFile(file))
            .digest("hex"),
      );
    }
  }
  const policy = JSON.parse(
    await fs.readFile(path.join(root, "hosting/policy.json"), "utf8"),
  );
  check(
    policy.accountId === "45dcbe7b47e04e1f41dc571ceb86b40e" &&
      policy.subdomain === "katpb" &&
      kinds.every(
        (kind) =>
          policy.targets[kind].verified &&
          policy.targets[kind].workerName === "katpb-dev-" + kind &&
          policy.targets[kind].workerId === workerIds[kind] &&
          policy.targets[kind].workersDev === true &&
          policy.targets[kind].previewUrls === (kind === "preview"),
      ),
  );
  await fs.mkdir(path.dirname(output), { recursive: true });
  // Do not overwrite prior observations or bypass an unresolved local mutation.
  try {
    await fs.access(output);
    throw new Error("existing evidence");
  } catch (error) {
    check(error.code === "ENOENT");
  }
  await fs.mkdir(lock);
  let interrupted = false,
    mutationsStarted = false,
    previewAttempted = false;
  const signal = () => {
    interrupted = true;
  };
  process.on("SIGINT", signal);
  process.on("SIGTERM", signal);
  const report = {
    schemaVersion: 1,
    task: "T005",
    execution: "owner VS Code terminal",
    attempt,
    ...(attempt === 4
      ? {
          mode: "preview-lifecycle-only",
          authorizationMatrixEvidence: {
            path: ".deploy/evidence/t005-owner-run-third.json",
            sha256:
              "08091cf8b423efd4678910482087bc277c11a2d462b030cf6dad4a47b88e3a03",
          },
        }
      : {}),
    startedAt: new Date().toISOString(),
    finishedAt: null,
    accountId: policy.accountId,
    providerCodeSha256: crypto
      .createHash("sha256")
      .update(await fs.readFile(provider))
      .digest("hex"),
    ownerRunnerSha256: crypto
      .createHash("sha256")
      .update(await fs.readFile(fileURLToPath(import.meta.url)))
      .digest("hex"),
    baselineFileSha256: crypto
      .createHash("sha256")
      .update(await fs.readFile(path.join(root, "hosting/t005-baseline.json")))
      .digest("hex"),
    policyFileSha256: crypto
      .createHash("sha256")
      .update(await fs.readFile(path.join(root, "hosting/policy.json")))
      .digest("hex"),
    diagnosticCodeSha256: crypto
      .createHash("sha256")
      .update(
        await fs.readFile(
          path.join(root, "scripts/hosting/t005-diagnostics.mjs"),
        ),
      )
      .digest("hex"),
    // 44 characters + 18-character Worker suffix = 62, within one DNS label.
    previewName: "local-katpb-" + crypto.randomBytes(16).toString("hex"),
    results: [],
    pass: false,
    baseWorkersExpected: false,
    previewRemoved: false,
    t023Started: false,
  };
  const baselines = {};
  async function persist() {
    const temporary = output + ".tmp";
    await fs.writeFile(temporary, JSON.stringify(report, null, 2) + "\n", {
      mode: 0o600,
    });
    await fs.rename(temporary, output);
  }
  async function perform(operation, kind, target, deploymentId) {
    if (["own", "cross"].includes(operation)) mutationsStarted = true;
    if (operation === "preview-lifecycle") previewAttempted = true;
    const input = { operation, kind };
    if (target) {
      input.target = target;
      input.baseline = baselines[target];
    }
    if (["final", "cross-before", "cross-after"].includes(operation))
      input.baseline = baselines[kind];
    if (deploymentId) input.deploymentId = deploymentId;
    if (operation === "preview-lifecycle")
      input.previewName = report.previewName;
    const result = await executeOperation(input, refs[kind]);
    if (operation === "preview-lifecycle")
      report.previewRemoved = result.cleanup === true;
    report.results.push({
      operation,
      credential: kind,
      ...(target ? { target } : {}),
      ...result,
    });
    await persist();
    if (operation === "preview-lifecycle") {
      if (result.previewEvidence) {
        const e = result.previewEvidence;
        console.log("PREVIEW resource-created=" + e.resourceCreated);
        for (const url of e.stableUrls) console.log("URL stable " + url);
        for (const d of e.deployments)
          for (const url of d.urls)
            console.log("URL " + d.stage + "-deployment " + url);
        for (const r of e.servedRequests)
          console.log(
            (r.passed ? "PASS" : "FAIL") +
              " served GET " +
              r.url +
              " HTTP " +
              (r.httpStatus ?? "unknown"),
          );
      }
      for (const [label, key] of [
        ["create", "created"],
        ["update", "updated"],
        ["delete", "cleanup"],
      ])
        console.log(
          (result[key] === true ? "PASS" : "FAIL") + " preview " + label,
        );
    } else
      console.log(
        (result.pass ? "PASS " : "FAIL ") +
          operation +
          " " +
          kind +
          (target ? " -> " + target : "") +
          (result.status ? " HTTP " + result.status : "") +
          (result.outcome === "denied-as-expected"
            ? " DENIED AS EXPECTED"
            : result.outcome === "security-boundary-failed"
              ? " FAIL SECURITY BOUNDARY"
              : ""),
      );
    if (!result.pass) console.log("FAIL stage " + result.stage);
    if (!result.pass && result.diagnostics) {
      const d = result.diagnostics;
      console.log(
        "DIAGNOSTIC " +
          operation +
          " " +
          d.targetWorkerName +
          " " +
          d.method +
          " " +
          d.endpointFamily +
          " phase=" +
          d.phase +
          " HTTP=" +
          (d.httpStatus ?? "unknown") +
          " codes=" +
          (d.errorCodes.join(",") || "none") +
          " category=" +
          d.category +
          " token=" +
          d.tokenVerification.status +
          " account-explicit=" +
          d.accountIdExplicit +
          " provider-exit=" +
          (d.providerSubprocessExitCode ?? "unknown"),
      );
    }
    return result;
  }
  try {
    await persist();
    const sequence = await (
      attempt === 4 ? runPreviewOnlySequence : runTestSequence
    )({
      perform,
      baselines,
      interrupted: () => interrupted,
    });
    report.baseWorkersExpected = sequence.baseWorkersExpected;
    report.previewRemoved = sequence.previewRemoved;
    if (attempt !== 4) report.matrixSucceeded = sequence.matrixSucceeded;
    report.pass =
      sequence.pass &&
      report.results.length === (attempt === 4 ? 7 : 28) &&
      report.results.every((result) => result.pass);
  } finally {
    report.finishedAt = new Date().toISOString();
    await persist();
    const unknownMutationProcess = report.results.some(
      (result) =>
        ["own", "cross", "preview-lifecycle"].includes(result.operation) &&
        result.stage === "owner-process",
    );
    const reconciled =
      !unknownMutationProcess &&
      (!mutationsStarted || report.baseWorkersExpected) &&
      (!previewAttempted || report.previewRemoved);
    if (reconciled) await fs.rmdir(lock);
    else console.log("FAIL unresolved state; r4-hosting lock retained");
    process.removeListener("SIGINT", signal);
    process.removeListener("SIGTERM", signal);
  }
  console.log(
    (report.pass ? "PASS" : "FAIL") + " T005 owner tests; T023 not started",
  );
  console.log("Sanitized evidence: " + path.relative(root, output));
  return report.pass;
}
async function runTokenDiagnostic(reference) {
  check(
    process.version === "v24.21.0" &&
      !process.env.CLOUDFLARE_API_TOKEN &&
      !process.env.NODE_OPTIONS &&
      !process.env.NODE_DEBUG,
  );
  const diagnosticOutput = path.join(
    root,
    ".deploy/evidence/t005-production-token-diagnostic.json",
  );
  await fs.mkdir(path.dirname(diagnosticOutput), { recursive: true });
  // This mode never calls the mutation runner and never overwrites first-run evidence.
  const file = await fs.open(diagnosticOutput, "wx", 0o600);
  try {
    const startedAt = new Date().toISOString();
    const result = await executeOperation(
      { operation: "diagnose-token", kind: "production" },
      reference,
    );
    const report = {
      schemaVersion: 2,
      task: "T005",
      mode: "pre-mutation-token-diagnostic",
      startedAt,
      finishedAt: new Date().toISOString(),
      accountId,
      provider: "direct-rest",
      wranglerInvoked: false,
      providerCodeSha256: crypto
        .createHash("sha256")
        .update(await fs.readFile(provider))
        .digest("hex"),
      diagnosticCodeSha256: crypto
        .createHash("sha256")
        .update(
          await fs.readFile(
            path.join(root, "scripts/hosting/t005-diagnostics.mjs"),
          ),
        )
        .digest("hex"),
      result,
      workerMutationsAttempted: false,
      t005Complete: false,
      t023Started: false,
    };
    await file.writeFile(JSON.stringify(report, null, 2) + "\n");
    console.log(JSON.stringify(report, null, 2));
    console.log(
      "Sanitized evidence: .deploy/evidence/t005-production-token-diagnostic.json",
    );
    return result.pass;
  } finally {
    await file.close();
  }
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const args = process.argv.slice(2);
    process.exitCode = (
      args[0] === "--diagnose-production-ref"
        ? await runTokenDiagnostic(parseDiagnosticArguments(args))
        : args[0] === "--second-owner-attempt"
          ? await runOwner(parseOwnerArguments(args.slice(1)), 2)
          : args[0] === "--third-owner-attempt"
            ? await runOwner(parseOwnerArguments(args.slice(1)), 3)
            : args[0] === "--preview-lifecycle-only"
              ? await runOwner(parseOwnerArguments(args.slice(1)), 4)
              : await runOwner(parseOwnerArguments(args))
    )
      ? 0
      : 1;
  } catch {
    console.error(
      "FAIL T005 owner setup: use Node 24.21.0 and the three documented references, with no inherited API token/debug hooks, existing evidence or r4-hosting lock. No raw diagnostics emitted.",
    );
    process.exitCode = 1;
  }
}
