import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { parseArgs, prepareRelease } from "./prepare-release.mjs";
import {
  canonical,
  digest,
  requireThat,
  validatePackage,
  validateEvidence,
  SHA,
} from "./hosting/release-records.mjs";
import {
  sourceState,
  credentialFreeEnvironment,
} from "./hosting/validate-local.mjs";
import { githubClient, lookupProtections } from "./hosting/github.mjs";
import {
  resolveTarget,
  writeConfig,
  validateProviderUrl,
} from "./hosting/provider.mjs";
import { localPreviewName } from "./hosting/preview-lifecycle.mjs";

export const controlRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

export async function prepareLocalPreview({
  name,
  packageDir,
  outputDir,
  policy,
  controlSha,
}) {
  requireThat(SHA.test(controlSha), "valid pinned control SHA required");
  const manifest = await validatePackage(packageDir);
  requireThat(
    name === localPreviewName(policy.owner, manifest.sourceSha),
    "local name must bind the first 32 hex characters of the full source SHA",
  );
  const provenance = JSON.parse(
    await fs.readFile(path.join(packageDir, "provenance.json")),
  );
  const evidence = validateEvidence(provenance.validation);
  requireThat(
    provenance.schemaVersion === 1 &&
      provenance.sourceSha === manifest.sourceSha &&
      provenance.rawDigest === manifest.rawDigest &&
      evidence.sourceSha === manifest.sourceSha &&
      evidence.rawDigest === manifest.rawDigest &&
      manifest.predecessorArchiveId === null &&
      provenance.retainedInputDigest === digest([]),
    "matching clean-source validation and empty local retention required",
  );
  // Repackage raw data with trusted control policy. Candidate headers/config never reach Wrangler.
  const prepared = await prepareRelease({
    rawDir: path.join(packageDir, "raw"),
    outputDir,
    sourceSha: manifest.sourceSha,
    evidence,
    retained: new Map(),
    predecessorArchiveId: null,
    expectedRetainedDigest: digest([]),
    publicAstroPaths: [],
    headers: await fs.readFile(
      path.join(controlRoot, "hosting/headers"),
      "utf8",
    ),
    limits: policy.quotas,
  });
  requireThat(
    prepared.packageDigest === manifest.packageDigest,
    "candidate package differs from trusted repackaging",
  );
  const targetInput = {
    kind: "preview",
    environment: "preview",
    workflowRef: "refs/heads/main",
    previewName: name,
  };
  const config = await writeConfig(policy, targetInput, outputDir);
  return {
    ...config,
    manifest: prepared,
    authorization: {
      sourceSha: prepared.sourceSha,
      controlSha,
      validationResult: "success",
    },
  };
}
function run(binary, args, options = {}) {
  const result = spawnSync(binary, args, {
    cwd: controlRoot,
    env: credentialFreeEnvironment(),
    encoding: "utf8",
    timeout: 180000,
    maxBuffer: 1024 * 1024,
    ...options,
  });
  requireThat(
    result.status === 0 && !result.error,
    "trusted subprocess failed; inspect the recorded stage and retry guidance",
  );
  return result.stdout;
}
export async function localMain(args) {
  const inputs = parseArgs(args, ["--name", "--package"]);
  if (inputs.help) {
    console.log(
      "deploy:preview --name local-katpb-<first-32-source-sha-hex> --package <prepared-directory>\nRun from a separate clean protected-main control checkout. Full SHA stays in provenance. Owner-run only: masked op run resolves the approved preview reference exclusively inside the provider subprocess. No candidate build/install. Verifies HTTPS and credential-free browsers at both URLs; records .deploy/local-attempts/<attempt-id>.",
    );
    return;
  }
  requireThat(
    inputs["--name"] && inputs["--package"],
    "--name and --package required; use --help",
  );
  requireThat(
    !process.env.CLOUDFLARE_API_TOKEN,
    "do not give the wrapper a provider credential; use the owner-run secure-source procedure",
  );
  const policy = JSON.parse(
    await fs.readFile(path.join(controlRoot, "hosting/policy.json")),
  );
  // Reject names/targets before any network or owner authentication prompt.
  resolveTarget(policy, {
    kind: "preview",
    environment: "preview",
    workflowRef: "refs/heads/main",
    previewName: inputs["--name"],
  });
  requireThat(
    inputs["--name"].startsWith("local-"),
    "local wrapper requires an explicit local preview name",
  );
  const before = sourceState(controlRoot);
  requireThat(
    before.status === "",
    "clean protected-main control checkout required; preserve unrelated work and use a separate checkout",
  );
  const api = githubClient({ token: process.env.GH_TOKEN });
  const main = await api.get("/repos/katpb/katpb.dev/git/ref/heads/main");
  requireThat(
    before.sha === main.object?.sha,
    "control checkout must be exact current protected main",
  );
  await lookupProtections(policy, { token: process.env.GH_TOKEN });
  // Coordinate with hosted runs before invoking this owner-only local path.
  // The shared local lock also blocks T005 and other local owner attempts.
  const lock = path.join(controlRoot, ".deploy/r4-hosting.lock");
  await fs.mkdir(path.dirname(lock), { recursive: true });
  await fs.mkdir(lock);
  const attemptId = `local-katpb-${randomBytes(16).toString("hex")}`;
  const folder = path.join(controlRoot, ".deploy/local-attempts", attemptId);
  await fs.mkdir(folder, { recursive: true });
  let record = {
    schemaVersion: 1,
    attemptId,
    sourceSha: null,
    controlSha: before.sha,
    previewName: inputs["--name"],
    state: "requested",
    failedStage: null,
    stableUrl: null,
    uniqueUrl: null,
    providerDeploymentId: null,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    guidance: "Validate prepared source before provider upload.",
  };
  let stage = "packaging",
    mutationStarted = false,
    sequence = 0;
  const persist = async () => {
    await fs.writeFile(
      path.join(
        folder,
        `${String(++sequence).padStart(2, "0")}-${record.state}.json`,
      ),
      canonical(record) + "\n",
      { flag: "wx", mode: 0o600 },
    );
  };
  try {
    const prepared = await prepareLocalPreview({
      name: inputs["--name"],
      packageDir: path.resolve(inputs["--package"]),
      outputDir: path.join(folder, "package"),
      policy,
      controlSha: before.sha,
    });
    record.sourceSha = prepared.manifest.sourceSha;
    record.packageDigest = prepared.manifest.packageDigest;
    const request = path.join(folder, "provider-request.json");
    await fs.writeFile(
      request,
      canonical({
        policy,
        target: prepared.target,
        operation: "preview",
        sourceSha: record.sourceSha,
        attemptId,
        configPath: prepared.configPath,
        authorization: prepared.authorization,
      }) + "\n",
      { flag: "wx", mode: 0o600 },
    );
    stage = "eligibility";
    requireThat(
      canonical(sourceState(controlRoot)) === canonical(before),
      "control checkout changed during preparation",
    );
    const current = await api.get("/repos/katpb/katpb.dev/git/ref/heads/main");
    requireThat(
      current.object?.sha === before.sha,
      "main advanced; refresh clean control checkout",
    );
    record.state = "uploading";
    stage = "recording";
    await persist();
    stage = "upload";
    mutationStarted = true;
    const output = run(
      "op",
      [
        "run",
        "--",
        process.execPath,
        path.join(controlRoot, "scripts/hosting/local-preview-provider.mjs"),
        "--request",
        request,
      ],
      {
        env: {
          ...credentialFreeEnvironment(),
          CLOUDFLARE_API_TOKEN: "op://katpb-dev/katpb-r4-preview/credential",
        },
      },
    );
    const result = JSON.parse(output);
    record.stableUrl = validateProviderUrl(prepared.target, result.stableUrl);
    record.uniqueUrl = validateProviderUrl(prepared.target, result.uniqueUrl, {
      unique: true,
    });
    requireThat(
      /^[a-f0-9-]{8,36}$/.test(result.providerDeploymentId) &&
        new URL(record.uniqueUrl).hostname.startsWith(
          result.providerDeploymentId + "-",
        ),
      "provider identity mismatch",
    );
    record.providerDeploymentId = result.providerDeploymentId;
    record.state = "uploaded";
    stage = "recording";
    await persist();
    const manifestPath = path.join(folder, "package/package-manifest.json");
    for (const url of [record.stableUrl, record.uniqueUrl]) {
      stage = "httpsSmoke";
      run(process.execPath, [
        "scripts/verify-hosted.mjs",
        "--url",
        url,
        "--manifest",
        manifestPath,
      ]);
      stage = "browserChecks";
      run(process.execPath, ["node_modules/@playwright/test/cli.js", "test"], {
        env: {
          ...credentialFreeEnvironment(),
          R4_HOSTED_URL: url,
          R4_HOSTED_MANIFEST: manifestPath,
        },
      });
    }
    stage = "recording";
    record.state = "verified";
    record.finishedAt = new Date().toISOString();
    record.guidance =
      "Verified both URLs; review the recorded source and unique deployment URL.";
    await persist();
    await fs.rmdir(lock);
    console.log(canonical(record));
  } catch {
    record.state = mutationStarted ? "unresolved" : "failed-before-upload";
    record.failedStage = stage;
    record.finishedAt = new Date().toISOString();
    record.guidance = mutationStarted
      ? "Reconcile this recorded attempt before retrying; stable URL may serve unverified bytes."
      : "Resolve the failed prerequisite using a separate clean control checkout.";
    await persist();
    if (!mutationStarted) await fs.rmdir(lock);
    console.error(canonical(record));
    process.exitCode = 1;
  }
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  localMain(process.argv.slice(2)).catch(() => {
    console.error(
      "Local preview prerequisite failed; use --help and a separate clean protected-main checkout. No verified result established.",
    );
    process.exitCode = 1;
  });
