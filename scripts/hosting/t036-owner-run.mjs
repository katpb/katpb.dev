// Credential-free owner entry point. Do not invoke credential-bearing exercises
// from Codex: the existing 1Password owner execution boundary remains in force.
import fs from "node:fs/promises";
import { isCredentialFreeEnvironment } from "./credential-free.mjs";
import path from "node:path";
import { spawnSync, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { runAcceptanceMatrix, acceptanceOrigin } from "./t036-acceptance.mjs";
import { canonical, digest, requireThat } from "./release-records.mjs";
import { runCredentialFree } from "./preview-runtime.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
export const acceptanceReference =
  "op://katpb-dev/katpb-r4-acceptance/credential";
const providerFile = fileURLToPath(
  new URL("./t036-provider.mjs", import.meta.url),
);
const check = (value) => requireThat(value, "T036 owner boundary rejected");
export function acceptanceInvocation(
  mode,
  packageDir,
  sourceEnv = process.env,
) {
  check(["upload", "reject"].includes(mode));
  check(
    path.isAbsolute(packageDir) &&
      packageDir.split(path.sep).includes(".deploy"),
  );
  const env = Object.fromEntries(
    ["HOME", "USER", "LOGNAME", "TMPDIR"]
      .filter(
        (k) =>
          typeof sourceEnv[k] === "string" && !sourceEnv[k].includes("op://"),
      )
      .map((k) => [k, sourceEnv[k]]),
  );
  return {
    binary: "/opt/homebrew/bin/op",
    args: [
      "run",
      "--no-masking=false",
      "--",
      process.execPath,
      providerFile,
      mode,
      packageDir,
    ],
    env: {
      ...env,
      PATH: path.dirname(process.execPath) + ":/opt/homebrew/bin:/usr/bin:/bin",
      OP_RUN_NO_MASKING: "false",
      CLOUDFLARE_API_TOKEN: acceptanceReference,
      T036_OWNER_SUBPROCESS: "1",
    },
  };
}
export function sanitizedProviderResult(value, mode) {
  check(
    value &&
      typeof value === "object" &&
      Object.keys(value).every((k) =>
        ["state", "providerDeploymentId", "stableUrl", "status"].includes(k),
      ),
  );
  if (mode === "reject") {
    check(value.state === "rejected" && value.status === 400);
    return { state: value.state, status: value.status };
  }
  check(
    value.state === "uploaded" &&
      /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(
        value.providerDeploymentId,
      ) &&
      value.stableUrl === acceptanceOrigin + "/" &&
      value.status === undefined,
  );
  return {
    state: value.state,
    providerDeploymentId: value.providerDeploymentId,
    stableUrl: value.stableUrl,
  };
}
async function publicProductionSnapshot() {
  const baseline = JSON.parse(
    await fs.readFile(path.join(root, "hosting/t005-baseline.json")),
  );
  // Compare every public baseline manifest entry, not an inferred upload status.
  const manifest =
    baseline.packageManifest ?? baseline.manifest?.packageManifest;
  check(Array.isArray(manifest));
  const result = [];
  for (const e of manifest.filter((e) => e.path !== "_headers")) {
    const route =
      e.path === "index.html"
        ? "/"
        : "/" + e.path.replace(/\/index\.html$/, "/");
    const r = await fetch(
      "https://katpb-dev-production.katpb.workers.dev" + route,
      {
        redirect: "error",
        headers: { "Cache-Control": "no-cache" },
        signal: AbortSignal.timeout(15000),
      },
    );
    check(r.status === 200);
    const bytes = Buffer.from(await r.arrayBuffer());
    check(bytes.length === e.size && digest(bytes) === e.sha256);
    result.push({ path: route, sha256: digest(bytes), size: bytes.length });
  }
  return result;
}
export async function archiveStillAbsent(
  verifyVisibility = false,
  { fetch = globalThis.fetch } = {},
) {
  if (verifyVisibility) {
    const visible = await fetch(
      "https://api.github.com/repos/katpb/katpb.dev/environments/production",
      {
        redirect: "error",
        headers: { Accept: "application/vnd.github+json" },
        signal: AbortSignal.timeout(15000),
      },
    );
    check(
      visible.status === 200 && (await visible.json()).name === "production",
    );
  }
  const r = await fetch(
    "https://api.github.com/repos/katpb/katpb.dev/environments/production-archive",
    {
      redirect: "error",
      headers: { Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(15000),
    },
  );
  check(r.status === 404);
}
export async function noHostedMutationInFlight({
  fetch = globalThis.fetch,
} = {}) {
  let total = null;
  const runs = [];
  for (let page = 1; page <= 10; page++) {
    const r = await fetch(
      "https://api.github.com/repos/katpb/katpb.dev/actions/runs?per_page=100&page=" +
        page,
      {
        redirect: "error",
        headers: { Accept: "application/vnd.github+json" },
        signal: AbortSignal.timeout(15000),
      },
    );
    check(r.status === 200);
    const body = await r.json();
    check(
      Array.isArray(body.workflow_runs) &&
        Number.isSafeInteger(body.total_count) &&
        body.total_count <= 1000,
    );
    if (total === null) total = body.total_count;
    check(body.total_count === total);
    runs.push(...body.workflow_runs);
    check(
      !body.workflow_runs.some(
        (run) =>
          [
            ".github/workflows/deploy.yml",
            ".github/workflows/preview-cleanup.yml",
          ].includes(run.path) && run.status !== "completed",
      ),
    );
    if (runs.length >= total) {
      check(new Set(runs.map((run) => run.id)).size === total);
      return;
    }
  }
  check(false);
}
async function main(args) {
  if (args.length === 1 && args[0] === "--help") {
    console.log(
      "Owner-only: node scripts/hosting/t036-owner-run.mjs --run\nUses only the approved acceptance reference through masked op run. Never run this inside Codex. No production/archive credentials; no GitHub writes. Output: .deploy/t036-<time>/evidence.json. Archive fault transport is a local controlled substitute.",
    );
    return;
  }
  check(args.length === 1 && args[0] === "--run");
  check(process.versions.node === "24.21.0");
  check(isCredentialFreeEnvironment(process.env));
  const sourceSha = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  check(
    execFileSync("git", ["status", "--porcelain", "--untracked-files=normal"], {
      cwd: root,
      encoding: "utf8",
    }).trim() === "",
  );
  const policy = JSON.parse(
    await fs.readFile(path.join(root, "hosting/policy.json")),
  );
  check(
    policy.targets.acceptance.workerName === "katpb-dev-acceptance" &&
      policy.targets.acceptance.workerId === "bc035ed004424484b1151cdda8c437de",
  );
  await archiveStillAbsent(true);
  await noHostedMutationInFlight();
  const productionBefore = await publicProductionSnapshot();
  await fs.mkdir(path.join(root, ".deploy"), { recursive: true });
  const lock = path.join(root, ".deploy/t036-owner.lock");
  await fs.writeFile(
    lock,
    canonical({
      pid: process.pid,
      sourceSha,
      startedAt: new Date().toISOString(),
    }) + "\n",
    { flag: "wx" },
  );
  const location = path.join(root, ".deploy/t036-" + Date.now());
  const providerObservations = [];
  const perform = async (mode, pkg) => {
    await archiveStillAbsent();
    await noHostedMutationInFlight();
    const invocation = acceptanceInvocation(mode, pkg.outputDir);
    const result = spawnSync(invocation.binary, invocation.args, {
      cwd: root,
      env: invocation.env,
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 180000,
      maxBuffer: 1024 * 1024,
    });
    // Discard raw op/provider stdout/stderr. Only schema-approved fields survive.
    check(!result.error && result.status === 0);
    const safe = sanitizedProviderResult(
      JSON.parse(result.stdout.toString()),
      mode,
    );
    providerObservations.push({
      mode,
      attemptId: pkg.c.attemptId,
      packageDigest: pkg.c.packageDigest,
      ...safe,
      observedAt: new Date().toISOString(),
    });
    await fs.writeFile(
      path.join(location, "provider-observations.json"),
      canonical(providerObservations) + "\n",
    );
    const productionAfter = await publicProductionSnapshot();
    check(canonical(productionAfter) === canonical(productionBefore));
    return safe;
  };
  const manifest = (pkg) => path.join(pkg.outputDir, "package-manifest.json");
  const evidence = await runAcceptanceMatrix({
    root: location,
    sourceSha,
    driver: {
      live: true,
      upload: (pkg) => perform("upload", pkg),
      reject: (pkg) => perform("reject", pkg),
      https: async (pkg) =>
        runCredentialFree([
          "scripts/verify-hosted.mjs",
          "--url",
          acceptanceOrigin,
          "--manifest",
          manifest(pkg),
        ]),
      browser: async (pkg) =>
        runCredentialFree(
          [
            "node_modules/@playwright/test/cli.js",
            "test",
            "tests/e2e/hosted-foundation.spec.ts",
          ],
          {
            R4_HOSTED_URL: acceptanceOrigin,
            R4_HOSTED_MANIFEST: manifest(pkg),
          },
        ),
    },
    persist: async (e) =>
      fs.writeFile(
        path.join(location, "evidence.json"),
        canonical({
          ...e,
          matrixComplete: e.complete,
          complete: false,
          productionBefore,
          providerObservations,
        }) + "\n",
      ),
  });
  await archiveStillAbsent();
  const productionAfter = await publicProductionSnapshot();
  check(canonical(productionAfter) === canonical(productionBefore));
  await fs.writeFile(
    path.join(location, "evidence.json"),
    canonical({
      ...evidence,
      productionBefore,
      productionAfter,
      productionPreserved: true,
      productionArchiveAbsent: true,
      providerObservations,
    }) + "\n",
  );
  await fs.unlink(lock);
  console.log(
    "T036 owner observations complete: " +
      path.relative(root, path.join(location, "evidence.json")),
  );
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main(process.argv.slice(2)).catch(() => {
    console.error(
      "T036 stopped. Inspect sanitized partial evidence; do not retry an unresolved branch or change credentials/environments. Raw credential-bearing diagnostics were discarded.",
    );
    process.exitCode = 1;
  });
