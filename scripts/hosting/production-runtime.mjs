import {
  mutateProduction,
  verifyProduction,
  recordProduction,
} from "../release-orchestrator.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import {
  canonical,
  digest,
  requireThat,
  SHA,
  encodeArchive,
  decodeArchive,
  manifestFor,
  scanFiles,
  validateEvidence,
  validateEnvelope,
  validatePackage,
  productionHistory,
  productionArchiveId,
} from "./release-records.mjs";
import { lookupSource, archiveClient, mintArchiveToken } from "./github.mjs";
import { prepareRelease } from "../prepare-release.mjs";
import {
  root,
  repo,
  positive,
  apiClient,
  policyFile,
  workflowGuard,
  readJson,
  writeJson,
  outputs,
  runCredentialFree,
} from "./preview-runtime.mjs";
import {
  writeConfig,
  invokeProvider,
  resolveTarget,
  validateProviderUrl,
} from "./provider.mjs";

const json = (value) => Buffer.from(canonical(value) + "\n");
const directory = path.join(root, ".deploy/production");
const contextFile = path.join(directory, "context.json");
const bundleNames = [
  "raw.tar",
  "prepared.tar",
  "raw-manifest.json",
  "package-manifest.json",
  "retained-manifest.json",
  "provenance.json",
  "prepared-receipt.json",
];
const targetInput = {
  kind: "production",
  environment: "production",
  workflowRef: "refs/heads/main",
};
export async function validateProductionEnvironments(api) {
  for (const name of ["production", "production-archive"]) {
    const environment = await api.get(`${repo}/environments/${name}`);
    const policies = await api.pages(
      `${repo}/environments/${name}/deployment-branch-policies`,
      "branch_policies",
    );
    requireThat(
      environment.name === name &&
        environment.can_admins_bypass === false &&
        environment.deployment_branch_policy?.protected_branches === false &&
        environment.deployment_branch_policy?.custom_branch_policies === true &&
        policies.length === 1 &&
        policies[0].type === "branch" &&
        policies[0].name === "main",
      "production/archive environment must already exist with exact main-only policy and no admin bypass",
    );
    requireThat(
      !environment.protection_rules?.some((r) =>
        ["required_reviewers", "wait_timer"].includes(r.type),
      ),
      "ordinary production/archive delivery must not introduce per-release approval or delay",
    );
  }
}

export async function selectProductionSource(
  { sourceSha, trigger, actor, eventName, ref, controlSha },
  policy,
  api,
  authorize,
) {
  requireThat(
    ref === "refs/heads/main" &&
      SHA.test(sourceSha) &&
      sourceSha === controlSha,
    "production requires exact current main SHA and main dispatch ref",
  );
  if (eventName === "workflow_dispatch") {
    requireThat(/^[a-zA-Z0-9-]{1,39}$/.test(actor), "dispatch actor invalid");
    const permission = await api.get(
      `${repo}/collaborators/${actor}/permission`,
    );
    requireThat(
      ["write", "maintain", "admin"].includes(permission.permission),
      "production dispatch requires current writer authorization",
    );
  } else
    requireThat(
      eventName === "workflow_run" &&
        positive(trigger?.id) &&
        positive(trigger?.run_attempt) &&
        trigger.head_sha === sourceSha,
      "successful main CI trigger required",
    );
  let run;
  if (trigger)
    run = await api.get(
      `${repo}/actions/runs/${trigger.id}/attempts/${trigger.run_attempt}`,
    );
  else {
    const runs = await api.pages(
      `${repo}/actions/workflows/ci.yml/runs?head_sha=${sourceSha}&event=push&status=success`,
      "workflow_runs",
    );
    const eligible = runs.filter(
      (r) =>
        r.head_sha === sourceSha &&
        r.head_branch === "main" &&
        r.event === "push" &&
        r.status === "completed" &&
        r.conclusion === "success" &&
        r.workflow_id === policy.workflow.id,
    );
    eligible.sort((a, b) => b.id - a.id);
    requireThat(
      eligible.length > 0,
      "successful eligible current-main CI unavailable",
    );
    run = await api.get(
      `${repo}/actions/runs/${eligible[0].id}/attempts/${eligible[0].run_attempt}`,
    );
  }
  requireThat(
    run.head_sha === sourceSha &&
      run.head_branch === "main" &&
      run.event === "push" &&
      run.status === "completed" &&
      run.conclusion === "success" &&
      run.workflow_id === policy.workflow.id,
    "successful eligible exact main push CI required",
  );
  const artifacts = await api.pages(
    `${repo}/actions/runs/${run.id}/artifacts`,
    "artifacts",
  );
  const exact = artifacts.filter(
    (a) =>
      a.name === `r4-raw-${sourceSha}-${run.id}-${run.run_attempt}` &&
      a.expired === false,
  );
  requireThat(
    exact.length === 1 &&
      positive(exact[0].id) &&
      /^sha256:[a-f0-9]{64}$/.test(exact[0].digest),
    "exact eligible CI artifact required",
  );
  return authorize({
    mode: "release",
    sourceSha,
    runId: run.id,
    runAttempt: run.run_attempt,
    artifactId: exact[0].id,
  });
}

export async function archiveBundle(packageDir, c) {
  const envelope = await validatePackage(packageDir);
  const raw = await scanFiles(path.join(packageDir, "raw"));
  requireThat(
    digest(raw.entries) === envelope.rawDigest &&
      envelope.sourceSha === c.sourceSha,
    "archive raw/source integrity failure",
  );
  const prepared = await scanFiles(path.join(packageDir, "assets"), {
    controls: true,
  });
  const files = new Map([
    ["raw.tar", encodeArchive(raw.files)],
    [
      "prepared.tar",
      encodeArchive(prepared.files, undefined, { controls: true }),
    ],
  ]);
  for (const name of bundleNames.slice(2, -1))
    files.set(name, await fs.readFile(path.join(packageDir, name)));
  files.set("prepared-receipt.json", json(c));
  files.set(
    "archive-index.json",
    json({
      schemaVersion: 1,
      archiveId: c.archiveId,
      sourceSha: c.sourceSha,
      files: Object.fromEntries(
        [...files].map(([n, b]) => [n, { size: b.length, sha256: digest(b) }]),
      ),
    }),
  );
  return files;
}

export async function appendArchiveAsset(api, release, name, bytes) {
  requireThat(
    Buffer.isBuffer(bytes) && bytes.length <= 128 * 1024 * 1024,
    "bounded archive asset required",
  );
  const existing = await api.pages(`${repo}/releases/${release.id}/assets`);
  requireThat(
    !existing.some((a) => a.name === name),
    "prior attempt evidence exists; never overwrite",
  );
  const asset = await api.upload(release.id, name, bytes);
  requireThat(
    positive(asset.id) &&
      asset.name === name &&
      asset.state === "uploaded" &&
      asset.size === bytes.length &&
      asset.digest === `sha256:${digest(bytes)}`,
    "archive write metadata mismatch",
  );
  requireThat(
    (await api.download(asset.id)).equals(bytes),
    "archive re-download digest failure",
  );
  return asset.id;
}
export async function createProductionArchive(api, c, files) {
  requireThat(
    productionArchiveId(c.archiveId) && c.sourceSha === c.controlSha,
    "archive source/attempt identity invalid",
  );
  // POST only: collisions fail; never reuse, move, overwrite or delete an existing tag.
  await api.post(`${repo}/git/refs`, {
    ref: `refs/tags/${c.archiveId}`,
    sha: c.sourceSha,
  });
  const tag = await api.get(`${repo}/git/ref/tags/${c.archiveId}`);
  requireThat(
    tag.object?.type === "commit" && tag.object.sha === c.sourceSha,
    "protected archive tag differs from source SHA",
  );
  const release = await api.post(`${repo}/releases`, {
    tag_name: c.archiveId,
    target_commitish: c.sourceSha,
    name: c.archiveId,
    draft: true,
    make_latest: "false",
    body: "R4 production attempt. Draft status is not verification. Evidence is append-only; no automatic pruning.",
  });
  requireThat(
    positive(release.id) &&
      release.draft === true &&
      release.tag_name === c.archiveId,
    "draft archive identity mismatch",
  );
  // Index is written last: interrupted archives cannot be mistaken for a complete attempt.
  for (const [name, bytes] of files)
    await appendArchiveAsset(api, release, name, bytes);
  await readProductionArchive(api, release);
  return release;
}

export async function readProductionArchive(api, release) {
  requireThat(
    productionArchiveId(release.tag_name) &&
      release.draft === true &&
      positive(release.id),
    "production draft archive required",
  );
  const tag = await api.get(`${repo}/git/ref/tags/${release.tag_name}`);
  const assets = await api.pages(`${repo}/releases/${release.id}/assets`);
  requireThat(
    new Set(assets.map((a) => a.name)).size === assets.length,
    "duplicate archive evidence",
  );
  async function load(name) {
    const asset = assets.find((a) => a.name === name);
    requireThat(
      asset && asset.state === "uploaded" && asset.size <= 128 * 1024 * 1024,
      "archive evidence missing/unavailable",
    );
    const bytes = await api.download(asset.id);
    requireThat(
      bytes.length === asset.size && asset.digest === `sha256:${digest(bytes)}`,
      "archive evidence integrity failure",
    );
    return bytes;
  }
  const index = JSON.parse(await load("archive-index.json"));
  requireThat(
    index.schemaVersion === 1 &&
      index.archiveId === release.tag_name &&
      SHA.test(index.sourceSha) &&
      tag.object?.sha === index.sourceSha &&
      tag.object.type === "commit" &&
      canonical(Object.keys(index.files).sort()) ===
        canonical([...bundleNames].sort()),
    "archive index/tag identity mismatch",
  );
  const files = new Map();
  for (const name of bundleNames) {
    const bytes = await load(name);
    requireThat(
      index.files[name].sha256 === digest(bytes) &&
        index.files[name].size === bytes.length,
      "archive stored digest mismatch",
    );
    files.set(name, bytes);
  }
  const c = JSON.parse(files.get("prepared-receipt.json"));
  requireThat(
    c.schemaVersion === 1 &&
      c.archiveId === index.archiveId &&
      c.sourceSha === index.sourceSha &&
      c.controlSha === c.sourceSha &&
      c.state === "prepared" &&
      c.source?.sourceSha === c.sourceSha &&
      c.source.validationResult === "success",
    "prepared receipt identity invalid",
  );
  const envelope = validateEnvelope(
    JSON.parse(files.get("package-manifest.json")),
  );
  const raw = decodeArchive(files.get("raw.tar"));
  const prepared = decodeArchive(files.get("prepared.tar"), undefined, {
    controls: true,
  });
  requireThat(
    envelope.sourceSha === c.sourceSha &&
      envelope.packageDigest === c.packageDigest &&
      canonical(manifestFor(prepared, undefined, { controls: true })) ===
        canonical(envelope.packageManifest) &&
      canonical(manifestFor(raw)) ===
        files.get("raw-manifest.json").toString().trim() &&
      digest(manifestFor(raw)) === envelope.rawDigest &&
      canonical(envelope.immutableManifest) ===
        files.get("retained-manifest.json").toString().trim(),
    "archive raw/prepared/manifest integrity failure",
  );
  const provenance = JSON.parse(files.get("provenance.json"));
  validateEvidence(provenance.validation);
  requireThat(
    provenance.sourceSha === c.sourceSha &&
      provenance.rawDigest === envelope.rawDigest &&
      provenance.validation.rawDigest === envelope.rawDigest &&
      provenance.retainedInputDigest === c.retainedInputDigest,
    "archive validation evidence mismatch",
  );
  requireThat(
    c.predecessorArchiveId === envelope.predecessorArchiveId,
    "prepared receipt predecessor differs from package",
  );
  for (const [name, bytes] of raw)
    requireThat(
      prepared.get(name)?.equals(bytes),
      "prepared archive differs from exact validated raw bytes",
    );
  requireThat(
    prepared.has("_headers") &&
      digest(prepared.get("_headers")) === envelope.policySha256,
    "archive headers policy digest mismatch",
  );
  const marker = json({
    schemaVersion: 1,
    sourceSha: c.sourceSha,
    rawDigest: envelope.rawDigest,
  });
  requireThat(
    prepared.get("__release.json")?.equals(marker),
    "archive marker mismatch",
  );
  let outcome = null;
  const terminal = assets.filter((a) =>
    /^outcome-[1-9]\d*-[1-9]\d*\.json$/.test(a.name),
  );
  requireThat(terminal.length <= 1, "ambiguous archive outcomes");
  if (terminal.length) {
    const r = JSON.parse(await load(terminal[0].name));
    requireThat(
      r.archiveId === c.archiveId &&
        r.sourceSha === c.sourceSha &&
        r.packageDigest === c.packageDigest &&
        r.attemptId === c.attemptId &&
        r.previousKnownGoodArchiveId === c.previousKnownGoodArchiveId &&
        r.predecessorArchiveId === c.predecessorArchiveId,
      "outcome differs from prepared evidence",
    );
    if (r.state === "verified")
      requireThat(
        r.checks?.https === true &&
          r.checks?.browser === true &&
          r.providerDeploymentId &&
          Object.values(r.stages ?? {}).length === 8 &&
          Object.values(r.stages).every((s) => s === "success") &&
          r.servedState === c.sourceSha,
        "verified receipt lacks hosted evidence",
      );
    requireThat(
      ["verified", "not-uploaded", "unresolved"].includes(r.state),
      "archive outcome invalid",
    );
    outcome = r.state;
  }
  return {
    ...c,
    predecessorArchiveId: envelope.predecessorArchiveId,
    immutableManifest: envelope.immutableManifest,
    files: prepared,
    bundle: files,
    release,
    outcome,
  };
}

export async function loadProductionHistory(api, reportApi = api) {
  const refs = await api.get(`${repo}/git/matching-refs/tags/r4-attempt-`);
  requireThat(Array.isArray(refs), "complete archive tag inventory required");
  const tags = refs.map((r) => r.ref.replace(/^refs\/tags\//, ""));
  const releases = (await api.pages(`${repo}/releases`)).filter((r) =>
    productionArchiveId(r.tag_name),
  );
  const records = [];
  for (const release of releases)
    records.push(await readProductionArchive(api, release));
  const deployments = await reportApi.pages(
    `${repo}/deployments?environment=production`,
  );
  const history = productionHistory(records, tags, deployments);
  // Known-good receipts must still be protected-main ancestors, independently of archived claims.
  const main = await api.get(`${repo}/git/ref/heads/main`);
  for (const r of records.filter((r) => r.outcome === "verified")) {
    const comparison = await api.get(
      `${repo}/compare/${r.sourceSha}...${main.object.sha}`,
    );
    requireThat(
      comparison.merge_base_commit?.sha === r.sourceSha &&
        ["ahead", "identical"].includes(comparison.status),
      "known-good archive no longer in protected-main ancestry",
    );
  }
  return history;
}

export async function validateProductionCandidate(c, inputDir, policy) {
  requireThat(
    c.source?.sourceSha === c.sourceSha,
    "independent production source authority required",
  );
  requireThat(
    canonical((await fs.readdir(inputDir)).sort()) ===
      canonical(["provenance.json", "raw-manifest.json", "raw.tar"]),
    "unexpected candidate handoff files",
  );
  const evidence = validateEvidence(
    await readJson(path.join(inputDir, "provenance.json")),
  );
  for (const k of [
    "sourceSha",
    "lockfileSha256",
    "nodeVersion",
    "npmVersion",
    "validationResult",
  ])
    requireThat(
      evidence[k] === c.source[k],
      "candidate differs from independently validated source",
    );
  const archive = path.join(inputDir, "raw.tar");
  const stat = await fs.lstat(archive);
  requireThat(
    stat.isFile() && stat.nlink === 1 && stat.size <= 128 * 1024 * 1024,
    "bounded regular candidate archive required",
  );
  const raw = decodeArchive(await fs.readFile(archive), policy.quotas);
  requireThat(
    digest(manifestFor(raw, policy.quotas)) === evidence.rawDigest &&
      canonical(manifestFor(raw, policy.quotas)) ===
        canonical(await readJson(path.join(inputDir, "raw-manifest.json"))),
    "raw handoff integrity failure",
  );
  return { raw, evidence };
}

export async function prepareProduction(
  c,
  inputDir,
  outputDir,
  history,
  policy,
) {
  const { raw, evidence } = await validateProductionCandidate(
    c,
    inputDir,
    policy,
  );
  const rawDir = path.join(path.dirname(outputDir), "production-raw");
  for (const [name, bytes] of raw) {
    const file = path.join(rawDir, name);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, bytes, { flag: "wx", mode: 0o644 });
  }
  return prepareRelease({
    rawDir,
    outputDir,
    sourceSha: c.sourceSha,
    evidence,
    retained: history.retained,
    predecessorArchiveId: history.newestPrepared,
    expectedRetainedDigest: digest(
      manifestFor(history.retained, policy.quotas),
    ),
    publicAstroPaths: [],
    headers: await fs.readFile(path.join(root, "hosting/headers"), "utf8"),
    limits: policy.quotas,
  });
}

async function extractBundle(record, outputDir) {
  await fs.mkdir(outputDir, { recursive: true });
  for (const [name, bytes] of record.bundle)
    if (name.endsWith(".json") && name !== "prepared-receipt.json")
      await fs.writeFile(path.join(outputDir, name), bytes, { flag: "wx" });
  for (const [sub, files] of [
    ["raw", decodeArchive(record.bundle.get("raw.tar"))],
    ["assets", record.files],
  ])
    for (const [name, bytes] of files) {
      const file = path.join(outputDir, sub, name);
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, bytes, { flag: "wx", mode: 0o644 });
    }
  await validatePackage(outputDir);
}
// Draft releases are visible only to archive writers. Downstream jobs consume exact,
// digest-checked Actions artifacts emitted by these trusted jobs; no archive token crosses jobs.
export async function writeArchivedHandoff(
  api,
  release,
  c,
  out,
  { packageFiles = false } = {},
) {
  const assets = (
    await api.pages(`${repo}/releases/${release.id}/assets`)
  ).filter((a) =>
    [
      ...bundleNames,
      "archive-index.json",
      `intent-${c.attemptId}.json`,
      `outcome-${c.attemptId}.json`,
    ].includes(a.name),
  );
  const tag = await api.get(`${repo}/git/ref/tags/${c.archiveId}`);
  await fs.mkdir(path.join(out, "archive"), { recursive: true });
  for (const asset of assets) {
    const bytes = await api.download(asset.id);
    requireThat(
      bytes.length === asset.size && asset.digest === `sha256:${digest(bytes)}`,
      "durable handoff re-download integrity failure",
    );
    await fs.writeFile(path.join(out, "archive", asset.name), bytes, {
      flag: "wx",
    });
  }
  await writeJson(path.join(out, "context.json"), c);
  await writeJson(path.join(out, "archive-proof.json"), {
    schemaVersion: 1,
    archiveId: c.archiveId,
    release: {
      id: release.id,
      tag_name: release.tag_name,
      draft: release.draft,
    },
    tag: { object: { type: tag.object?.type, sha: tag.object?.sha } },
    assets: assets.map(({ id, name, state, size, digest }) => ({
      id,
      name,
      state,
      size,
      digest,
    })),
  });
  const verified = await readArchivedHandoff(out, c);
  if (packageFiles) await extractBundle(verified, path.join(out, "package"));
  return verified;
}
export async function readArchivedHandoff(dir, c) {
  const proof = await readJson(path.join(dir, "archive-proof.json"));
  requireThat(
    proof.schemaVersion === 1 &&
      proof.archiveId === c.archiveId &&
      proof.release.tag_name === c.archiveId &&
      proof.tag.object.sha === c.sourceSha &&
      Array.isArray(proof.assets) &&
      proof.assets.every((a) =>
        [
          ...bundleNames,
          "archive-index.json",
          `intent-${c.attemptId}.json`,
          `outcome-${c.attemptId}.json`,
        ].includes(a.name),
      ),
    "trusted archive-job handoff identity invalid",
  );
  const record = await readProductionArchive(
    {
      get: async () => proof.tag,
      pages: async () => proof.assets,
      download: async (id) => {
        const asset = proof.assets.find((a) => a.id === id);
        requireThat(asset, "handoff archive asset missing");
        const file = path.join(dir, "archive", asset.name);
        const stat = await fs.lstat(file);
        requireThat(
          stat.isFile() &&
            stat.nlink === 1 &&
            !stat.isSymbolicLink() &&
            stat.size === asset.size &&
            stat.size <= 128 * 1024 * 1024,
          "bounded regular archive handoff required",
        );
        return fs.readFile(file);
      },
    },
    proof.release,
  );
  requireThat(
    record.sourceSha === c.sourceSha &&
      record.packageDigest === c.packageDigest,
    "archive handoff differs from selected source/package",
  );
  return record;
}

async function context(controlSha) {
  const c = await readJson(contextFile);
  requireThat(
    c.schemaVersion === 1 &&
      c.controlSha === controlSha &&
      c.sourceSha === controlSha &&
      c.attemptId ===
        `${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}` &&
      c.archiveId === `r4-attempt-${c.attemptId}` &&
      c.source?.sourceSha === c.sourceSha,
    "production handoff identity mismatch",
  );
  return c;
}
async function recheck(c, policy) {
  const fresh = await lookupSource(
    {
      mode: "release",
      sourceSha: c.sourceSha,
      runId: c.source.validationRunId,
      runAttempt: c.source.runAttempt,
      artifactId: c.source.artifactId,
    },
    policy,
    { token: process.env.GH_TOKEN },
  );
  requireThat(
    canonical(fresh) === canonical(c.source),
    "live main/source eligibility changed before upload",
  );
}
async function writeResult(subdir, value) {
  await writeJson(path.join(root, `.deploy/${subdir}/result.json`), value);
}
async function archiveApi() {
  return archiveClient({
    token: await mintArchiveToken({
      privateKey: process.env.R4_ARCHIVE_APP_PRIVATE_KEY,
    }),
  });
}

export async function productionMain(args) {
  const { parseArgs } = await import("../prepare-release.mjs");
  const input = parseArgs(args, ["--production-stage"]);
  const stage = input["--production-stage"];
  requireThat(
    [
      "resolve",
      "prepare",
      "archive",
      "announce",
      "provider",
      "verify",
      "record",
      "report",
    ].includes(stage),
    "production stage invalid",
  );
  const policy = await policyFile();
  const controlSha = await workflowGuard("deploy.yml", policy);
  const api = apiClient();
  const packageDir = path.join(directory, "package");
  if (stage === "resolve") {
    const event = await readJson(process.env.GITHUB_EVENT_PATH);
    requireThat(
      event.repository?.full_name === policy.repository &&
        event.repository.default_branch === "main",
      "repository event identity invalid",
    );
    const dispatched = process.env.GITHUB_EVENT_NAME === "workflow_dispatch";
    if (dispatched)
      requireThat(
        Object.keys(event.inputs).every((k) =>
          ["operation", "source_sha", "request_id"].includes(k),
        ) &&
          event.inputs.operation === "release" &&
          (!event.inputs.request_id ||
            /^[a-f0-9-]{36}$/.test(event.inputs.request_id)),
        "only explicit release inputs supported at this checkpoint",
      );
    const sourceSha = dispatched
      ? event.inputs.source_sha
      : event.workflow_run?.head_sha;
    const source = await selectProductionSource(
      {
        sourceSha,
        trigger: dispatched ? null : event.workflow_run,
        actor: process.env.GITHUB_TRIGGERING_ACTOR,
        eventName: process.env.GITHUB_EVENT_NAME,
        ref: process.env.GITHUB_REF,
        controlSha,
      },
      policy,
      api,
      (i) => lookupSource(i, policy, { token: process.env.GH_TOKEN }),
    );
    await validateProductionEnvironments(api);
    const id = `${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}`;
    requireThat(
      /^[1-9]\d*-[1-9]\d*$/.test(id),
      "production workflow attempt invalid",
    );
    const c = {
      schemaVersion: 1,
      attemptId: id,
      archiveId: `r4-attempt-${id}`,
      sourceSha,
      controlSha,
      source,
      initiator: process.env.GITHUB_TRIGGERING_ACTOR,
      trigger: dispatched ? "workflow_dispatch" : "push",
      orchestrationEvent: process.env.GITHUB_EVENT_NAME,
      deploymentId: null,
      target: "production",
      startedAt: new Date().toISOString(),
      finishedAt: null,
      state: "eligible",
      stages: {
        eligibility: "success",
        validation: "pending",
        packaging: "pending",
        archive: "pending",
        upload: "pending",
        httpsSmoke: "pending",
        browserChecks: "pending",
        recording: "pending",
      },
      failedStage: null,
      servedState: "unknown",
      checks: { https: false, browser: false },
      logUrl: `https://github.com/${policy.repository}/actions/runs/${process.env.GITHUB_RUN_ID}/attempts/${process.env.GITHUB_RUN_ATTEMPT}`,
    };
    await writeJson(contextFile, c);
    await outputs({
      control_sha: controlSha,
      ci_run_id: source.validationRunId,
      candidate_artifact_id: source.artifactId,
    });
    return;
  }
  const c = await context(controlSha);
  if (stage === "prepare") {
    await validateProductionCandidate(
      c,
      path.join(directory, "candidate"),
      policy,
    );
    c.state = "validated";
    c.stages.validation = "success";
    await writeJson(contextFile, c);
  } else if (stage === "archive") {
    await validateProductionEnvironments(api);
    await recheck(c, policy);
    const archive = await archiveApi();
    const h = await loadProductionHistory(archive, api);
    const envelope = await prepareProduction(
      c,
      path.join(directory, "candidate"),
      packageDir,
      h,
      policy,
    );
    Object.assign(c, {
      state: "prepared",
      stages: { ...c.stages, validation: "success", packaging: "success" },
      packageDigest: envelope.packageDigest,
      predecessorArchiveId: h.newestPrepared,
      previousKnownGoodArchiveId: h.currentVerified,
      previousKnownGoodSourceSha:
        h.records.find((r) => r.archiveId === h.currentVerified)?.sourceSha ??
        null,
      previousVerifiedArchiveId: h.previousVerified,
      retainedInputDigest: digest(manifestFor(h.retained)),
      retryOf:
        h.records.at(-1)?.outcome === "verified" &&
        h.records.at(-1).sourceSha === c.sourceSha &&
        h.records.at(-1).packageDigest === envelope.packageDigest
          ? h.newestPrepared
          : null,
    });
    const release = await createProductionArchive(
      archive,
      c,
      await archiveBundle(packageDir, c),
    );
    // This durable reservation remains unresolved if any later job disappears.
    await appendArchiveAsset(
      archive,
      release,
      `intent-${c.attemptId}.json`,
      json({
        archiveId: c.archiveId,
        packageDigest: c.packageDigest,
        state: "mutation-reserved",
        startedAt: c.startedAt,
      }),
    );
    await writeArchivedHandoff(
      archive,
      release,
      c,
      path.join(root, ".deploy/production-archived"),
      { packageFiles: true },
    );
    await outputs({ release_id: release.id });
  } else if (stage === "announce") {
    const deployment = await api.post(`${repo}/deployments`, {
      ref: c.sourceSha,
      task: "deploy:production",
      environment: "production",
      auto_merge: false,
      required_contexts: [],
      production_environment: true,
      transient_environment: false,
      payload: { r4Production: 1, archiveId: c.archiveId, context: c },
    });
    requireThat(
      positive(deployment.id) &&
        deployment.sha === c.sourceSha &&
        deployment.environment === "production",
      "source-bound production deployment mismatch",
    );
    await api.post(`${repo}/deployments/${deployment.id}/statuses`, {
      state: "in_progress",
      auto_inactive: false,
      log_url: c.logUrl,
      description: "Durable prepared archive; hosted verification pending",
    });
    await outputs({ deployment_id: deployment.id });
  } else if (stage === "provider") {
    let record;
    const deployDir = path.join(root, ".deploy/production-upload");
    const r = await mutateProduction(c, {
      archivedPackage: async () => {
        record = await readArchivedHandoff(directory, c);
        requireThat(
          record.packageDigest === c.packageDigest && record.outcome === null,
          "provider requires exact unused archived attempt",
        );
        await extractBundle(record, deployDir);
      },
      configure: () => writeConfig(policy, targetInput, deployDir),
      recheck: async () => {
        await validateProductionEnvironments(api);
        await recheck(c, policy);
      },
      upload: ({ target, configPath }) =>
        invokeProvider({
          policy,
          target,
          configPath,
          sourceSha: c.sourceSha,
          attemptId: c.attemptId,
          operation: "deploy",
          authorization: c.source,
          credential: {
            token: process.env.CLOUDFLARE_API_TOKEN,
            workerId: target.workerId,
          },
        }),
      persist: (r) => writeResult("production-provider", r),
    });
    if (r.state === "uploaded") await outputs({ uploaded: "true" });
    requireThat(
      r.state === "uploaded",
      "production provider stage failed; inspect durable attempt before retrying",
    );
  } else if (stage === "verify") {
    requireThat(
      !Object.keys(process.env).some((k) =>
        /CLOUDFLARE|R4_ARCHIVE_APP_PRIVATE_KEY|GH_TOKEN/.test(k),
      ),
      "hosted production verification must be credential-free",
    );
    const archived = await readArchivedHandoff(directory, c);
    requireThat(
      archived.packageDigest ===
        (await validatePackage(packageDir)).packageDigest,
      "hosted package differs from verified durable handoff",
    );
    const provider = await readJson(
      path.join(root, ".deploy/production-provider/result.json"),
    );
    requireThat(
      provider.archiveId === c.archiveId &&
        provider.packageDigest === c.packageDigest &&
        provider.state === "uploaded",
      "exact uploaded result required",
    );
    const url = validateProviderUrl(
      resolveTarget(policy, targetInput),
      provider.stableUrl,
    );
    const r = await verifyProduction(provider, {
      https: () =>
        runCredentialFree([
          "scripts/verify-hosted.mjs",
          "--url",
          url,
          "--manifest",
          path.join(packageDir, "package-manifest.json"),
        ]),
      browser: () =>
        runCredentialFree(
          [
            "node_modules/@playwright/test/cli.js",
            "test",
            "tests/e2e/hosted-foundation.spec.ts",
          ],
          {
            R4_HOSTED_URL: url,
            R4_HOSTED_MANIFEST: path.join(packageDir, "package-manifest.json"),
          },
        ),
      persist: (r) => writeResult("production-verification", r),
    });
    requireThat(
      r.state === "checks-passed",
      "production hosted verification failed",
    );
  } else if (stage === "record") {
    const archive = await archiveApi();
    const releases = await archive.pages(`${repo}/releases`);
    const release = releases.find((r) => r.tag_name === c.archiveId);
    requireThat(
      release,
      "durable production archive unavailable; mutation remains unresolved",
    );
    const stored = await readProductionArchive(archive, release);
    requireThat(
      stored.packageDigest === c.packageDigest && stored.outcome === null,
      "archive already finalized or differs from handoff",
    );
    let provider = null,
      verification = null;
    try {
      provider = await readJson(
        path.join(root, ".deploy/production-provider/result.json"),
      );
    } catch {
      /* Missing evidence remains unresolved. */
    }
    try {
      verification = await readJson(
        path.join(root, ".deploy/production-verification/result.json"),
      );
    } catch {
      /* Missing checks never imply success. */
    }
    const r = await recordProduction(
      {
        ...c,
        deploymentId: Number(process.env.PRODUCTION_DEPLOYMENT_ID) || null,
      },
      {
        provider,
        verification,
        providerJob: process.env.PRODUCTION_PROVIDER_RESULT,
        verifyJob: process.env.PRODUCTION_VERIFY_RESULT,
        append: (r) =>
          appendArchiveAsset(
            archive,
            release,
            `outcome-${c.attemptId}.json`,
            json(r),
          ),
        readback: async () =>
          (await readProductionArchive(archive, release)).outcome,
        persist: (r) => writeResult("production-final", r),
      },
    );
    await writeArchivedHandoff(
      archive,
      release,
      c,
      path.join(root, ".deploy/production-final"),
    );
    await outputs({ verified: String(r.state === "verified") });
  } else if (stage === "report") {
    let r;
    try {
      r = await readJson(
        path.join(root, ".deploy/production-final/result.json"),
      );
    } catch {
      r = {
        ...c,
        state: "unresolved",
        guidance:
          "Durable recording unavailable; reconcile before ordinary mutation.",
      };
    }
    let durable = null;
    try {
      durable = await readArchivedHandoff(
        path.join(root, ".deploy/production-final"),
        c,
      );
    } catch {
      r = {
        ...c,
        state: "unresolved",
        failedStage: "recording",
        guidance:
          "Durable archive read unavailable; reconcile before ordinary mutation.",
      };
    }
    const verified = durable?.outcome === "verified" && r.state === "verified";
    requireThat(
      r.archiveId === c.archiveId,
      "report attempt differs from candidate",
    );
    const id = Number(process.env.PRODUCTION_DEPLOYMENT_ID);
    if (positive(id))
      await api.post(`${repo}/deployments/${id}/statuses`, {
        state: verified
          ? "success"
          : r.state === "not-uploaded"
            ? "failure"
            : "error",
        auto_inactive: false,
        log_url: c.logUrl,
        ...(r.stableUrl
          ? {
              environment_url: validateProviderUrl(
                resolveTarget(policy, targetInput),
                r.stableUrl,
              ),
            }
          : {}),
        description: `${r.state}; ${c.sourceSha}; archive ${c.archiveId}`.slice(
          0,
          140,
        ),
      });
    await fs.appendFile(
      process.env.GITHUB_STEP_SUMMARY,
      `Source ${c.sourceSha}; control ${c.controlSha}; production; actor ${c.initiator}; started ${c.startedAt}; finished ${r.finishedAt ?? "unknown"}.\n\nOutcome ${r.state}; stage ${r.failedStage ?? "none"}; stages ${canonical(r.stages ?? c.stages)}; URL ${r.stableUrl ?? "unknown"}; provider ${r.providerDeploymentId ?? "none"}.\n\nArchive ${c.archiveId}; prepared predecessor ${c.predecessorArchiveId ?? "none (first release)"}; current known-good ${c.previousKnownGoodArchiveId ?? "none"}; previous verified ${c.previousVerifiedArchiveId ?? "none"}.\n\n${r.guidance}\n`,
    );
    requireThat(
      verified,
      "production did not establish durable verified success",
    );
  }
}
