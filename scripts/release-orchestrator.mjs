import { isCredentialFreeEnvironment } from "./hosting/credential-free.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, prepareRelease } from "./prepare-release.mjs";
import { lookupSource } from "./hosting/github.mjs";
import {
  canonical,
  digest,
  SHA,
  HASH,
  requireThat,
  decodeArchive,
  manifestFor,
  validateEvidence,
  validatePackage,
} from "./hosting/release-records.mjs";
import { previewDisposition } from "./hosting/preview-lifecycle.mjs";
import {
  writeConfig,
  invokeProvider,
  validateProviderUrl,
} from "./hosting/provider.mjs";
import {
  root,
  repo,
  positive,
  policyFile,
  apiClient,
  workflowGuard,
  writeJson,
  readJson,
  outputs,
  previewTarget,
  validateContext,
  priorVerified,
  validatePriorProof,
  createDeployment,
  deploymentStatus,
  markInactive,
  summary,
  runCredentialFree,
} from "./hosting/preview-runtime.mjs";

export async function mutateProduction(
  c,
  { archivedPackage, configure, recheck, upload, persist },
) {
  let started = false;
  try {
    await archivedPackage();
    const configuration = await configure();
    await recheck();
    started = true;
    const provider = await upload(configuration);
    const result = {
      ...c,
      ...provider,
      state: "uploaded",
      stages: { ...c.stages, archive: "success", upload: "success" },
      mutationStarted: true,
    };
    await persist(result);
    return result;
  } catch {
    const result = {
      ...c,
      state: started ? "unresolved" : "not-uploaded",
      mutationStarted: started,
      servedState: started
        ? "unknown"
        : (c.previousKnownGoodSourceSha ?? "unknown"),
      failedStage: started ? "upload" : "eligibility",
      guidance: started
        ? "Reconcile served identity before another mutation; previous known-good remains eligible."
        : "No upload started. Correct prerequisites and request a new attempt.",
    };
    await persist(result);
    return result;
  }
}
export async function verifyProduction(provider, { https, browser, persist }) {
  requireThat(
    provider.state === "uploaded",
    "exact uploaded production result required",
  );
  const result = {
    ...provider,
    checks: { https: false, browser: false },
    state: "unresolved",
    stages: {
      ...provider.stages,
      httpsSmoke: "pending",
      browserChecks: "pending",
    },
    failedStage: "httpsSmoke",
  };
  try {
    await https();
    result.checks.https = true;
    result.stages.httpsSmoke = "success";
    result.failedStage = "browserChecks";
    await browser();
    result.checks.browser = true;
    result.stages.browserChecks = "success";
    result.failedStage = null;
    result.state = "checks-passed";
  } catch {
    result.stages[result.failedStage] = "failure";
  }
  await persist(result);
  return result;
}
export async function recordProduction(
  c,
  { provider, verification, providerJob, verifyJob, append, readback, persist },
) {
  for (const r of [provider, verification].filter(Boolean))
    requireThat(
      r.archiveId === c.archiveId &&
        r.sourceSha === c.sourceSha &&
        r.packageDigest === c.packageDigest,
      "outcome handoff identity mismatch",
    );
  const verified =
    providerJob === "success" &&
    verifyJob === "success" &&
    verification?.state === "checks-passed" &&
    verification.checks.https === true &&
    verification.checks.browser === true &&
    provider?.state === "uploaded" &&
    provider.providerDeploymentId === verification.providerDeploymentId;
  const state = verified
    ? "verified"
    : provider?.state === "not-uploaded" && provider.mutationStarted === false
      ? "not-uploaded"
      : "unresolved";
  const result = {
    ...c,
    ...(verification ?? provider ?? {}),
    state,
    failedStage: verified
      ? null
      : (verification?.failedStage ?? provider?.failedStage ?? "recording"),
    servedState: verified
      ? c.sourceSha
      : state === "not-uploaded"
        ? (c.previousKnownGoodSourceSha ?? "unknown")
        : "unknown",
    stages: verified
      ? {
          eligibility: "success",
          validation: "success",
          packaging: "success",
          archive: "success",
          upload: "success",
          httpsSmoke: "success",
          browserChecks: "success",
          recording: "success",
        }
      : {
          ...c.stages,
          ...provider?.stages,
          ...verification?.stages,
          recording: "success",
        },
    finishedAt: new Date().toISOString(),
    guidance: verified
      ? "Verified evidence durably persisted."
      : state === "not-uploaded"
        ? "No upload started; retry with new validated attempt."
        : "Reconcile served identity or recover before another ordinary production mutation; previous known-good remains eligible.",
  };
  await append(result);
  requireThat(
    (await readback()) === state,
    "durable outcome readback failed; reconcile before further mutation",
  );
  await persist(result);
  return result;
}

export async function resolvePreview(event, policy, dependencies) {
  const { api, controlSha, orchestrationRunId, orchestrationRunAttempt } =
    dependencies;
  const authorize =
    dependencies.authorize ??
    ((input) => lookupSource(input, policy, { token: process.env.GH_TOKEN }));
  const trigger = event.workflow_run;
  requireThat(
    event.repository?.full_name === policy.repository &&
      event.repository.default_branch === "main" &&
      positive(trigger?.id) &&
      positive(trigger.run_attempt) &&
      SHA.test(trigger.head_sha) &&
      SHA.test(controlSha),
    "workflow-run trigger identity invalid",
  );
  const run = await api.get(
    `${repo}/actions/runs/${trigger.id}/attempts/${trigger.run_attempt}`,
  );
  requireThat(
    run.id === trigger.id &&
      run.run_attempt === trigger.run_attempt &&
      run.head_sha === trigger.head_sha &&
      run.workflow_id === policy.workflow.id &&
      run.name === policy.workflow.name &&
      run.event === "pull_request" &&
      run.status === "completed" &&
      run.conclusion === "success" &&
      run.repository?.full_name === policy.repository &&
      Array.isArray(run.pull_requests) &&
      ((run.pull_requests.length === 1 &&
        positive(run.pull_requests[0].number)) ||
        run.pull_requests.length === 0),
    "allowlisted successful exact PR CI run required",
  );
  if (run.pull_requests.length === 0)
    return {
      schemaVersion: 1,
      source: null,
      sourceSha: run.head_sha,
      controlSha,
      pullRequest: null,
      orchestrationRunId,
      orchestrationRunAttempt,
      ci: {
        runId: run.id,
        runAttempt: run.run_attempt,
        artifactId: null,
        artifactDigest: null,
      },
      state: "skipped-authorization",
      inactive: false,
      stableVerified: false,
      guidance:
        "CI has no authoritative PR binding (including after closure); no artifact consumption or provider mutation authorized.",
    };
  const number = run.pull_requests[0].number;
  const pr = await api.get(`${repo}/pulls/${number}`);
  requireThat(
    /^[a-zA-Z0-9-]{1,39}$/.test(pr.user?.login),
    "authoritative PR author unavailable",
  );
  const c = {
    schemaVersion: 1,
    source: null,
    sourceSha: run.head_sha,
    controlSha,
    pullRequest: number,
    orchestrationRunId,
    orchestrationRunAttempt,
    initiator: pr.user.login,
    previousVerified: null,
    ci: {
      runId: run.id,
      runAttempt: run.run_attempt,
      artifactId: null,
      artifactDigest: null,
    },
    packageDigest: null,
    stableUrl: null,
    uniqueUrl: null,
    providerDeploymentId: null,
    stableVerified: false,
    state: "prepared-metadata",
    failedStage: null,
    inactive: false,
    cleanupRequired: false,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    logUrl: `https://github.com/${policy.repository}/actions/runs/${orchestrationRunId}/attempts/${orchestrationRunAttempt}`,
    guidance: "Recheck live PR authority under the hosting lock before upload.",
  };
  const boundary = previewDisposition(
    { pr, permission: "write" },
    {
      pullRequest: number,
      sourceSha: run.head_sha,
      sourceRef: run.head_branch,
    },
    policy,
  );
  const permission =
    boundary || run.head_repository?.full_name !== policy.repository
      ? null
      : (await api.get(`${repo}/collaborators/${pr.user.login}/permission`))
          .permission;
  const disposition =
    boundary ??
    previewDisposition(
      { pr, permission },
      {
        pullRequest: number,
        sourceSha: run.head_sha,
        sourceRef: run.head_branch,
      },
      policy,
    );
  if (disposition || run.head_repository?.full_name !== policy.repository) {
    c.state = disposition ?? "skipped-authorization";
    c.inactive = c.state === "skipped-closed";
    c.guidance =
      "No provider mutation authorized; obtain current open writer-authorized same-repository PR validation.";
    return c;
  }
  const artifacts = await api.pages(
    `${repo}/actions/runs/${run.id}/artifacts`,
    "artifacts",
  );
  const exact = artifacts.filter(
    (a) => a.name === `r4-raw-${run.head_sha}-${run.id}-${run.run_attempt}`,
  );
  requireThat(
    exact.length === 1 &&
      positive(exact[0].id) &&
      exact[0].expired === false &&
      /^sha256:[a-f0-9]{64}$/.test(exact[0].digest) &&
      Number.isSafeInteger(exact[0].size_in_bytes) &&
      exact[0].size_in_bytes > 0 &&
      exact[0].size_in_bytes <= 128 * 1024 * 1024,
    "exact unexpired bounded run/attempt artifact required",
  );
  c.ci.artifactId = exact[0].id;
  c.ci.artifactDigest = exact[0].digest;
  c.source = await authorize({
    mode: "preview",
    sourceSha: run.head_sha,
    runId: run.id,
    runAttempt: run.run_attempt,
    artifactId: exact[0].id,
  });
  requireThat(
    c.source.controlSha === controlSha &&
      c.source.pullRequest === number &&
      c.source.sourceSha === c.sourceSha,
    "resolved source differs from pinned control/PR",
  );
  return c;
}
export async function recheckPreview(
  c,
  policy,
  api = apiClient(),
  authorize = (input) =>
    lookupSource(input, policy, { token: process.env.GH_TOKEN }),
) {
  requireThat(
    c.source && positive(c.pullRequest),
    "authorized source handoff required",
  );
  const pr = await api.get(`${repo}/pulls/${c.pullRequest}`);
  requireThat(
    /^[a-zA-Z0-9-]{1,39}$/.test(pr.user?.login),
    "live author unavailable",
  );
  const permission = (
    await api.get(`${repo}/collaborators/${pr.user.login}/permission`)
  ).permission;
  const disposition = previewDisposition({ pr, permission }, c.source, policy);
  if (disposition) return disposition;
  const fresh = await authorize({
    mode: "preview",
    sourceSha: c.sourceSha,
    runId: c.source.validationRunId,
    runAttempt: c.source.runAttempt,
    artifactId: c.source.artifactId,
  });
  return canonical(fresh) === canonical(c.source) ? null : "skipped-stale";
}
export async function packagePreview(c, inputDir, outputDir, policy) {
  requireThat(
    c.source && c.state === "prepared-metadata",
    "authorized metadata required before consuming artifact",
  );
  const names = (await fs.readdir(inputDir)).sort();
  // CI also archives its protection diagnostic. It is not source authority or
  // served content: authorization is resolved independently and only raw.tar
  // supplies package bytes below.
  requireThat(
    canonical(names) ===
      canonical([
        "provenance.json",
        "raw-manifest.json",
        "raw.tar",
        "runtime-protection.json",
      ]),
    "unexpected CI handoff files",
  );
  const evidence = validateEvidence(
    await readJson(path.join(inputDir, "provenance.json")),
  );
  for (const field of [
    "sourceSha",
    "lockfileSha256",
    "nodeVersion",
    "npmVersion",
    "validationResult",
  ])
    requireThat(
      evidence[field] === c.source[field],
      "raw evidence differs from independent CI authority",
    );
  const archivePath = path.join(inputDir, "raw.tar");
  const stat = await fs.lstat(archivePath);
  requireThat(
    stat.isFile() &&
      stat.nlink === 1 &&
      !stat.isSymbolicLink() &&
      stat.size <= 128 * 1024 * 1024,
    "bounded regular raw archive required",
  );
  const files = decodeArchive(await fs.readFile(archivePath), policy.quotas);
  const entries = manifestFor(files, policy.quotas);
  requireThat(
    canonical(entries) ===
      canonical(await readJson(path.join(inputDir, "raw-manifest.json"))) &&
      digest(entries) === evidence.rawDigest,
    "raw archive/evidence digest mismatch",
  );
  const rawDir = path.join(path.dirname(outputDir), "validated-raw");
  await fs.mkdir(rawDir, { recursive: true });
  for (const [name, bytes] of files) {
    const file = path.join(rawDir, name);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, bytes, { flag: "wx", mode: 0o644 });
  }
  return prepareRelease({
    rawDir,
    outputDir,
    sourceSha: c.sourceSha,
    evidence,
    retained: new Map(),
    predecessorArchiveId: null,
    expectedRetainedDigest: digest([]),
    publicAstroPaths: [],
    headers: await fs.readFile(path.join(root, "hosting/headers"), "utf8"),
    limits: policy.quotas,
  });
}
export async function mutatePreview(context, { recheck, upload, persist }) {
  const c = structuredClone(context);
  let mutationStarted = false;
  try {
    c.state = "uploading";
    await persist(c);
    // Persistence and all package/config work precede this final live read.
    const disposition = await recheck();
    if (disposition) {
      c.state = disposition;
      c.inactive = disposition === "skipped-closed";
      c.guidance =
        "No provider mutation performed; obtain current open writer-authorized PR validation.";
      await persist(c);
      return c;
    }
    mutationStarted = true;
    const result = await upload();
    c.providerDeploymentId = result.providerDeploymentId;
    c.stableUrl = result.stableUrl;
    c.uniqueUrl = result.uniqueUrl;
    c.state = "uploaded";
    await persist(c);
    const after = await recheck();
    if (after) {
      c.state = after;
      c.inactive = after === "skipped-closed";
      c.cleanupRequired = c.inactive;
      c.guidance = c.inactive
        ? "Mark inactive and perform serialized named-preview cleanup; keep the prior verified unique identity."
        : "PR head changed after upload; stable URL is unverified. Wait for current CI and retain the prior verified unique identity.";
    }
    await persist(c);
    return c;
  } catch {
    c.state = mutationStarted ? "unresolved" : "failed-before-upload";
    c.failedStage = mutationStarted ? "upload" : "eligibility";
    c.stableVerified = false;
    c.guidance =
      "Reconcile the recorded attempt before retrying; the stable URL may serve unverified bytes. Previous verified identity uses its unique URL.";
    await persist(c);
    return c;
  }
}
export async function verifyPreview(context, { https, browser }) {
  const c = structuredClone(context);
  requireThat(
    c.state === "uploaded",
    "uploaded preview required for hosted checks",
  );
  try {
    for (const url of [c.stableUrl, c.uniqueUrl]) {
      c.failedStage = "httpsSmoke";
      await https(url);
      c.failedStage = "browserChecks";
      await browser(url);
    }
    c.state = "checks-passed";
    c.failedStage = null;
  } catch {
    c.state = "failed-after-upload";
    c.stableVerified = false;
    c.guidance =
      "Hosted checks failed; reconcile the stable URL and use only the prior verified unique URL for earlier evidence.";
  }
  return c;
}
export async function publishPreview(context, { recheck, persist, status }) {
  const c = structuredClone(context);
  if (c.state === "checks-passed") {
    const disposition = await recheck();
    c.state = disposition ?? "verified";
    c.stableVerified = !disposition;
    c.inactive = disposition === "skipped-closed";
    c.cleanupRequired = c.inactive;
    if (disposition)
      c.guidance = c.inactive
        ? "PR closed during verification; mark inactive and perform serialized named-preview cleanup."
        : "PR authority changed during verification; no verified success is reported for this attempt.";
  }
  c.finishedAt = new Date().toISOString();
  if (c.state === "verified")
    c.guidance =
      "Verified evidence persisted; review the exact source and unique URL.";
  const state = c.inactive
    ? "inactive"
    : c.state === "verified"
      ? "success"
      : c.state === "failed-after-upload"
        ? "failure"
        : "error";
  await persist(c); // Must succeed before any GitHub success status.
  await status(c, state);
  return c;
}
const dir = path.join(root, ".deploy/preview");
async function main(args) {
  const inputs = parseArgs(args, ["--stage"]);
  if (inputs.help) {
    console.log(
      "Trusted main workflow only: release-orchestrator --stage resolve|prepare|announce|provider|verify|report. Preview-only; no production operation.",
    );
    return;
  }
  const stage = inputs["--stage"];
  requireThat(
    ["resolve", "prepare", "announce", "provider", "verify", "report"].includes(
      stage,
    ),
    "valid --stage required",
  );
  const policy = await policyFile();
  if (stage === "verify") {
    requireThat(
      isCredentialFreeEnvironment(process.env),
      "hosted checks require credential-free process",
    );
    const { sourceState } = await import("./hosting/validate-local.mjs");
    const c = validateContext(
      await readJson(path.join(dir, "context.json")),
      sourceState(root).sha,
    );
    const uploaded = await readJson(
      path.join(root, ".deploy/provider/result.json"),
    );
    validateContext(uploaded, c.controlSha);
    requireThat(
      canonical(uploaded.source) === canonical(c.source) &&
        uploaded.packageDigest === c.packageDigest,
      "provider/verification handoff mismatch",
    );
    const target = previewTarget(policy, `pr-${c.pullRequest}`);
    validateProviderUrl(target, uploaded.stableUrl);
    validateProviderUrl(target, uploaded.uniqueUrl, { unique: true });
    const manifest = await validatePackage(path.join(dir, "package"));
    requireThat(
      manifest.packageDigest === c.packageDigest &&
        manifest.sourceSha === c.sourceSha,
      "verification package mismatch",
    );
    const manifestPath = path.join(dir, "package/package-manifest.json");
    const checked = await verifyPreview(uploaded, {
      https: (url) =>
        runCredentialFree([
          "scripts/verify-hosted.mjs",
          "--url",
          url,
          "--manifest",
          manifestPath,
        ]),
      browser: (url) =>
        runCredentialFree(["node_modules/@playwright/test/cli.js", "test"], {
          R4_HOSTED_URL: url,
          R4_HOSTED_MANIFEST: manifestPath,
        }),
    });
    await writeJson(
      path.join(root, ".deploy/verification/result.json"),
      checked,
    );
    if (checked.state !== "checks-passed") process.exitCode = 1;
    return;
  }
  const controlSha = await workflowGuard("deploy.yml", policy);
  requireThat(
    process.env.GITHUB_EVENT_NAME === "workflow_run",
    "CI workflow-run entry required",
  );
  const api = apiClient();
  if (stage === "resolve") {
    await outputs({ control_sha: controlSha, eligible: "false" });
    const event = await readJson(process.env.GITHUB_EVENT_PATH);
    let c = {
      schemaVersion: 1,
      controlSha,
      source: null,
      sourceSha: SHA.test(event.workflow_run?.head_sha)
        ? event.workflow_run.head_sha
        : null,
      pullRequest: null,
      orchestrationRunId: Number(process.env.GITHUB_RUN_ID),
      orchestrationRunAttempt: Number(process.env.GITHUB_RUN_ATTEMPT),
      state: "failed-before-upload",
      failedStage: "eligibility",
      guidance: "Metadata eligibility failed; no provider mutation authorized.",
    };
    try {
      c = await resolvePreview(event, policy, {
        api,
        controlSha,
        orchestrationRunId: c.orchestrationRunId,
        orchestrationRunAttempt: c.orchestrationRunAttempt,
      });
      if (c.source)
        c.previousProof = await priorVerified(policy, c.pullRequest, api);
      await writeJson(path.join(dir, "context.json"), c);
      await outputs({
        eligible: String(c.state === "prepared-metadata"),
        artifact_id: c.source?.artifactId ?? "",
        prior_artifact_id: c.previousProof?.artifactId ?? "",
        prior_run_id: c.previousProof?.runId ?? "",
      });
    } catch {
      await writeJson(path.join(dir, "context.json"), {
        ...c,
        state: "failed-before-upload",
        failedStage: "eligibility",
      });
      throw Error("preview metadata resolution failed");
    }
    return;
  }
  const c = validateContext(
    await readJson(path.join(dir, "context.json")),
    controlSha,
  );
  if (stage === "prepare") {
    try {
      if (c.previousProof)
        c.previousVerified = validatePriorProof(
          c.previousProof,
          await readJson(path.join(root, ".deploy/prior/result.json")),
          c.pullRequest,
          policy,
        );
      const manifest = await packagePreview(
        c,
        path.join(root, ".deploy/candidate"),
        path.join(dir, "package"),
        policy,
      );
      c.packageDigest = manifest.packageDigest;
      await writeJson(path.join(dir, "context.json"), c);
    } catch {
      c.state = "failed-before-upload";
      c.failedStage = "packaging";
      await writeJson(path.join(dir, "context.json"), c);
      throw Error("trusted preview packaging failed");
    }
  } else if (stage === "announce") {
    const id = await createDeployment(c, api);
    await outputs({ deployment_id: id });
  } else if (stage === "provider") {
    const manifest = await validatePackage(path.join(dir, "package"));
    requireThat(
      manifest.packageDigest === c.packageDigest &&
        manifest.sourceSha === c.sourceSha &&
        HASH.test(c.packageDigest),
      "provider package/context mismatch",
    );
    const { target, configPath } = await writeConfig(
      policy,
      {
        kind: "preview",
        environment: "preview",
        workflowRef: "refs/heads/main",
        previewName: `pr-${c.pullRequest}`,
      },
      path.join(dir, "package"),
    );
    const token = process.env.CLOUDFLARE_API_TOKEN;
    delete process.env.CLOUDFLARE_API_TOKEN;
    const result = await mutatePreview(c, {
      recheck: () => recheckPreview(c, policy, api),
      upload: () =>
        invokeProvider({
          policy,
          target,
          configPath,
          operation: "preview",
          sourceSha: c.sourceSha,
          attemptId: `${c.orchestrationRunId}-${c.orchestrationRunAttempt}`,
          authorization: c.source,
          credential: { token, workerId: target.workerId },
        }),
      persist: (value) =>
        writeJson(path.join(root, ".deploy/provider/result.json"), value),
    });
    await outputs({ uploaded: String(result.state === "uploaded") });
    if (
      result.state === "unresolved" ||
      result.state === "failed-before-upload"
    )
      process.exitCode = 1;
  } else if (stage === "report") {
    let result = c;
    for (const file of [
      ".deploy/provider/result.json",
      ".deploy/verification/result.json",
    ]) {
      try {
        const candidate = await readJson(path.join(root, file));
        validateContext(candidate, controlSha);
        requireThat(
          canonical(candidate.source) === canonical(c.source) &&
            candidate.packageDigest === c.packageDigest,
          "result identity mismatch",
        );
        result = candidate;
      } catch (e) {
        if (e.code !== "ENOENT") throw e;
      }
    }
    if (["prepared-metadata", "uploading", "uploaded"].includes(result.state)) {
      result.state =
        result.state === "prepared-metadata"
          ? "failed-before-upload"
          : "unresolved";
      result.guidance =
        "A required job/receipt is missing; reconcile before retrying. No verified outcome established.";
    }
    if (result.state === "checks-passed") {
      const verificationId = Number(process.env.VERIFICATION_ARTIFACT_ID);
      requireThat(
        process.env.PROVIDER_JOB_RESULT === "success" &&
          process.env.VERIFY_JOB_RESULT === "success" &&
          positive(verificationId),
        "successful verification job and persisted evidence required",
      );
      const artifact = await api.get(
        `${repo}/actions/artifacts/${verificationId}`,
      );
      requireThat(
        artifact.id === verificationId &&
          artifact.expired === false &&
          artifact.workflow_run?.id === c.orchestrationRunId &&
          artifact.name ===
            `r4-preview-verification-${c.orchestrationRunId}-${c.orchestrationRunAttempt}` &&
          /^sha256:[a-f0-9]{64}$/.test(artifact.digest),
        "durable exact-run verification evidence unavailable",
      );
      result.verificationArtifactId = verificationId;
    }
    try {
      result = await publishPreview(result, {
        recheck: () => recheckPreview(c, policy, api),
        persist: async (value) => {
          await writeJson(path.join(root, ".deploy/final/result.json"), value);
          await summary(value);
        },
        status: async (value, state) => {
          let id = Number(process.env.DEPLOYMENT_ID);
          if (!id && value.source) id = await createDeployment(c, api);
          if (id) await deploymentStatus(id, value, state, api);
          if (value.inactive && positive(value.pullRequest))
            await markInactive(value.pullRequest, api);
        },
      });
    } catch {
      result.state = "unresolved";
      result.stableVerified = false;
      result.failedStage = "recording";
      result.guidance =
        "Result recording failed; reconcile recorded identities before retrying.";
      await writeJson(path.join(root, ".deploy/final/result.json"), result);
      const id = Number(process.env.DEPLOYMENT_ID);
      if (positive(id)) await deploymentStatus(id, result, "error", api);
    }
    await summary(result);
    if (!result.state.startsWith("skipped-") && result.state !== "verified")
      process.exitCode = 1;
  }
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  (process.argv.includes("--production-stage")
    ? import("./hosting/production-runtime.mjs").then(({ productionMain }) =>
        productionMain(process.argv.slice(2)),
      )
    : main(process.argv.slice(2))
  ).catch(() => {
    console.error(
      "Trusted deployment stage failed; inspect the non-secret stage receipt. No verified success established.",
    );
    process.exitCode = 1;
  });
