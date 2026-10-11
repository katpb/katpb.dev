import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { githubClient, lookupProtections } from "./github.mjs";
import { sourceState, credentialFreeEnvironment } from "./validate-local.mjs";
import {
  canonical,
  requireThat,
  SHA,
  HASH,
  strictFields,
} from "./release-records.mjs";
import { resolveTarget, validateProviderUrl } from "./provider.mjs";

export const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
export const repo = "/repos/katpb/katpb.dev";
export const positive = (n) => Number.isSafeInteger(n) && n > 0;
export const policyFile = () =>
  fs.readFile(path.join(root, "hosting/policy.json")).then(JSON.parse);
export async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const handle = await fs.open(file, "w", 0o600);
  try {
    await handle.writeFile(canonical(value) + "\n");
    await handle.sync();
  } finally {
    await handle.close();
  }
  requireThat(
    (await fs.readFile(file, "utf8")) === canonical(value) + "\n",
    "receipt readback failed",
  );
}
export async function readJson(file) {
  const stat = await fs.lstat(file);
  requireThat(
    stat.isFile() &&
      !stat.isSymbolicLink() &&
      stat.nlink === 1 &&
      stat.size <= 8 * 1024 * 1024,
    "bounded regular JSON file required",
  );
  return JSON.parse(await fs.readFile(file));
}
export function apiClient(token = process.env.GH_TOKEN) {
  const read = githubClient({ token });
  return {
    ...read,
    async post(endpoint, body) {
      requireThat(
        /^\/repos\/katpb\/katpb\.dev\/deployments(?:\/[1-9]\d*\/statuses)?$/.test(
          endpoint,
        ),
        "preview reporting endpoint invalid",
      );
      const response = await fetch("https://api.github.com" + endpoint, {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(15000),
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }).catch(() => {
        throw Error("deployment reporting unavailable");
      });
      requireThat(response.ok, "deployment reporting rejected");
      const bytes = await response.text();
      requireThat(
        bytes.length < 8 * 1024 * 1024,
        "deployment response bound exceeded",
      );
      return JSON.parse(bytes);
    },
  };
}
export async function workflowGuard(file, policy, env = process.env) {
  requireThat(
    env.GITHUB_REPOSITORY === policy.repository &&
      env.GITHUB_REF === "refs/heads/main" &&
      env.GITHUB_WORKFLOW_REF ===
        `${policy.repository}/.github/workflows/${file}@refs/heads/main`,
    "protected-main workflow context required",
  );
  const current = sourceState(root);
  requireThat(
    current.status === "" && SHA.test(current.sha),
    "clean pinned control checkout required",
  );
  await lookupProtections(policy, { token: env.GH_TOKEN });
  return current.sha;
}
export async function outputs(values) {
  requireThat(
    process.env.GITHUB_OUTPUT,
    "workflow output destination required",
  );
  for (const [key, value] of Object.entries(values))
    requireThat(
      /^[a-z_]+$/.test(key) && /^(?:[a-z0-9-]+|)$/.test(String(value)),
      "unsafe workflow output",
    );
  await fs.appendFile(
    process.env.GITHUB_OUTPUT,
    Object.entries(values)
      .map(([k, v]) => `${k}=${v}\n`)
      .join(""),
  );
}
export function previewTarget(policy, name) {
  return resolveTarget(policy, {
    kind: "preview",
    environment: "preview",
    workflowRef: "refs/heads/main",
    previewName: name,
  });
}
export function validateContext(c, controlSha, env = process.env) {
  const allowed = [
    "schemaVersion",
    "source",
    "sourceSha",
    "controlSha",
    "pullRequest",
    "orchestrationRunId",
    "orchestrationRunAttempt",
    "initiator",
    "previousVerified",
    "previousProof",
    "ci",
    "packageDigest",
    "stableUrl",
    "uniqueUrl",
    "providerDeploymentId",
    "stableVerified",
    "state",
    "failedStage",
    "inactive",
    "cleanupRequired",
    "startedAt",
    "finishedAt",
    "logUrl",
    "guidance",
    "verificationArtifactId",
    "previewName",
    "retryRequired",
    "capacityReleased",
  ];
  requireThat(
    c &&
      typeof c === "object" &&
      !Array.isArray(c) &&
      Object.keys(c).every((k) => allowed.includes(k)),
    "unknown handoff field",
  );
  requireThat(
    [
      "prepared-metadata",
      "skipped-stale",
      "skipped-closed",
      "skipped-authorization",
      "failed-before-upload",
      "uploading",
      "uploaded",
      "unresolved",
      "checks-passed",
      "failed-after-upload",
      "verified",
      "cleanup-requested",
      "deleting",
      "deleted",
      "failed-deletion",
    ].includes(c.state),
    "unknown preview state",
  );
  requireThat(
    (c.sourceSha === null || SHA.test(c.sourceSha)) &&
      (c.pullRequest === null || positive(c.pullRequest)) &&
      (c.packageDigest === undefined ||
        c.packageDigest === null ||
        HASH.test(c.packageDigest)),
    "handoff source/package identity invalid",
  );
  if (c.previousVerified) {
    strictFields(c.previousVerified, ["sourceSha", "uniqueUrl"]);
    requireThat(SHA.test(c.previousVerified.sourceSha), "prior source invalid");
  }
  if (c.source) {
    strictFields(c.source, [
      "repository",
      "sourceSha",
      "sourceRef",
      "event",
      "pullRequest",
      "baseSha",
      "controlSha",
      "validationRunId",
      "runAttempt",
      "artifactId",
      "nodeVersion",
      "npmVersion",
      "lockfileSha256",
      "validationResult",
      "artifactDigest",
    ]);
    requireThat(
      c.source.repository === "katpb/katpb.dev" &&
        c.source.event === "pull_request" &&
        SHA.test(c.source.baseSha) &&
        [
          c.source.validationRunId,
          c.source.runAttempt,
          c.source.artifactId,
        ].every(positive) &&
        HASH.test(c.source.lockfileSha256) &&
        c.source.validationResult === "success" &&
        /^sha256:[a-f0-9]{64}$/.test(c.source.artifactDigest),
      "invalid authoritative preview source",
    );
  }
  requireThat(
    c.schemaVersion === 1 &&
      c.controlSha === controlSha &&
      SHA.test(controlSha) &&
      positive(c.orchestrationRunId) &&
      positive(c.orchestrationRunAttempt) &&
      String(c.orchestrationRunId) === env.GITHUB_RUN_ID &&
      String(c.orchestrationRunAttempt) === env.GITHUB_RUN_ATTEMPT,
    "handoff differs from pinned control/current workflow attempt",
  );
  if (c.source)
    requireThat(
      c.source.controlSha === controlSha &&
        c.source.sourceSha === c.sourceSha &&
        c.source.pullRequest === c.pullRequest,
      "source/context identity mismatch",
    );
  return c;
}
export async function priorVerified(policy, number, api) {
  const target = previewTarget(policy, `pr-${number}`);
  const deployments = await api.pages(
    `${repo}/deployments?environment=preview-pr-${number}`,
  );
  const workflow = await api.get(`${repo}/actions/workflows/deploy.yml`);
  requireThat(
    workflow.path === ".github/workflows/deploy.yml" && positive(workflow.id),
    "trusted deployment workflow unavailable",
  );
  for (const d of deployments.sort((a, b) => b.id - a.id)) {
    if (
      !positive(d.id) ||
      d.creator?.login !== "github-actions[bot]" ||
      d.environment !== `preview-pr-${number}` ||
      d.payload?.r4Preview !== 1
    )
      continue;
    const p = d.payload.context;
    if (
      !p?.source ||
      p.source.pullRequest !== number ||
      d.sha !== p.source.sourceSha
    )
      continue;
    const statuses = await api.pages(`${repo}/deployments/${d.id}/statuses`);
    const status = statuses[0];
    if (
      status?.state !== "success" ||
      status.creator?.login !== "github-actions[bot]"
    )
      continue;
    const run = await api.get(
      `${repo}/actions/runs/${p.orchestrationRunId}/attempts/${p.orchestrationRunAttempt}`,
    );
    requireThat(
      run.workflow_id === workflow.id &&
        run.event === "workflow_run" &&
        run.head_branch === "main" &&
        SHA.test(run.head_sha) &&
        run.status === "completed" &&
        run.conclusion === "success" &&
        run.repository?.full_name === policy.repository &&
        run.head_repository?.full_name === policy.repository,
      "prior verification lacks trusted main workflow authority",
    );
    const runComparison = await api.get(
      `${repo}/compare/${run.head_sha}...main`,
    );
    requireThat(
      runComparison.base_commit?.sha === run.head_sha &&
        runComparison.merge_base_commit?.sha === run.head_sha &&
        ["ahead", "identical"].includes(runComparison.status),
      "prior workflow is not protected-main ancestor",
    );
    const comparison = await api.get(`${repo}/compare/${p.controlSha}...main`);
    requireThat(
      comparison.base_commit?.sha === p.controlSha &&
        comparison.merge_base_commit?.sha === p.controlSha &&
        ["ahead", "identical"].includes(comparison.status),
      "prior control is not protected-main ancestor",
    );
    requireThat(
      positive(p.orchestrationRunId) &&
        positive(p.orchestrationRunAttempt) &&
        SHA.test(p.source.sourceSha),
      "prior identity invalid",
    );
    const artifacts = await api.pages(
      `${repo}/actions/runs/${p.orchestrationRunId}/artifacts`,
      "artifacts",
    );
    const proof = artifacts.filter(
      (a) =>
        a.name ===
        `r4-preview-final-${p.orchestrationRunId}-${p.orchestrationRunAttempt}`,
    );
    requireThat(
      proof.length === 1 &&
        positive(proof[0].id) &&
        proof[0].expired === false &&
        proof[0].workflow_run?.id === p.orchestrationRunId &&
        /^sha256:[a-f0-9]{64}$/.test(proof[0].digest),
      "prior verified receipt unavailable; reconcile or clean up before another update",
    );
    return {
      artifactId: proof[0].id,
      runId: p.orchestrationRunId,
      runAttempt: p.orchestrationRunAttempt,
      controlSha: p.controlSha,
      sourceSha: p.source.sourceSha,
      uniqueUrl: validateProviderUrl(target, status.environment_url, {
        unique: true,
      }),
    };
  }
  return null;
}
export function validatePriorProof(proof, record, number, policy) {
  requireThat(
    record.schemaVersion === 1 &&
      record.state === "verified" &&
      record.stableVerified === true &&
      record.pullRequest === number &&
      record.sourceSha === proof.sourceSha &&
      record.controlSha === proof.controlSha &&
      record.orchestrationRunId === proof.runId &&
      record.orchestrationRunAttempt === proof.runAttempt &&
      record.uniqueUrl === proof.uniqueUrl &&
      SHA.test(record.sourceSha),
    "immutable prior receipt differs from deployment claims",
  );
  return {
    sourceSha: record.sourceSha,
    uniqueUrl: validateProviderUrl(
      previewTarget(policy, `pr-${number}`),
      record.uniqueUrl,
      { unique: true },
    ),
  };
}
export async function createDeployment(c, api) {
  requireThat(
    c.source && positive(c.pullRequest) && SHA.test(c.sourceSha),
    "authorized exact source deployment required",
  );
  const deployment = await api.post(`${repo}/deployments`, {
    ref: c.sourceSha,
    task: "deploy:preview",
    environment: `preview-pr-${c.pullRequest}`,
    auto_merge: false,
    required_contexts: [],
    transient_environment: true,
    production_environment: false,
    description: `PR ${c.pullRequest} preview ${c.sourceSha}`,
    payload: { r4Preview: 1, context: c },
  });
  requireThat(
    positive(deployment.id) &&
      deployment.sha === c.sourceSha &&
      deployment.environment === `preview-pr-${c.pullRequest}`,
    "explicit deployment identity mismatch",
  );
  await deploymentStatus(deployment.id, c, "in_progress", api);
  return deployment.id;
}
export async function deploymentStatus(id, c, state, api) {
  requireThat(
    positive(id) &&
      ["in_progress", "success", "failure", "error", "inactive"].includes(
        state,
      ),
    "deployment status identity invalid",
  );
  const unique = c.uniqueUrl;
  await api.post(`${repo}/deployments/${id}/statuses`, {
    state,
    auto_inactive: false,
    description:
      `${c.state}; PR ${c.pullRequest}; ${c.sourceSha}; ${c.providerDeploymentId ?? "no-provider-id"}`.slice(
        0,
        140,
      ),
    log_url: c.logUrl,
    ...(unique ? { environment_url: unique } : {}),
  });
}
export async function markInactive(number, api) {
  requireThat(positive(number), "PR identity required");
  const deployments = await api.pages(
    `${repo}/deployments?environment=preview-pr-${number}`,
  );
  for (const d of deployments) {
    if (
      d.environment !== `preview-pr-${number}` ||
      d.creator?.login !== "github-actions[bot]" ||
      d.payload?.r4Preview !== 1 ||
      d.payload.context?.pullRequest !== number ||
      !positive(d.id)
    )
      continue;
    await api.post(`${repo}/deployments/${d.id}/statuses`, {
      state: "inactive",
      auto_inactive: false,
      description:
        "PR closed; named-preview cleanup tracked separately; retry if deletion fails.",
    });
  }
}
export async function summary(c) {
  const rows = [
    `PR: ${c.pullRequest ?? "unresolved"}; source: ${c.sourceSha ?? "unresolved"}; control: ${c.controlSha}.`,
    `CI run/attempt/artifact: ${c.source?.validationRunId ?? c.ci?.runId ?? "unresolved"}/${c.source?.runAttempt ?? c.ci?.runAttempt ?? "unresolved"}/${c.source?.artifactId ?? c.ci?.artifactId ?? "unresolved"}.`,
    `Outcome: ${c.state}; failed stage: ${c.failedStage ?? "none"}.`,
    `Stable URL (verified for this attempt: ${c.stableVerified === true}): ${c.stableUrl ?? "none"}.`,
    `Unique URL: ${c.uniqueUrl ?? "none"}; previous verified unique URL: ${c.previousVerified?.uniqueUrl ?? "none"}.`,
    `Provider ID: ${c.providerDeploymentId ?? "none"}; capacity released: ${c.capacityReleased === true}; cleanup required: ${c.cleanupRequired === true}; cleanup retry: ${c.retryRequired === true}.`,
    c.guidance,
  ];
  // All values derive from validated IDs, allowlisted URLs and fixed guidance, not PR text.
  requireThat(process.env.GITHUB_STEP_SUMMARY, "summary destination required");
  await fs.appendFile(
    process.env.GITHUB_STEP_SUMMARY,
    rows.join("\n\n") + "\n",
  );
}
export function runCredentialFree(args, extraEnv = {}) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    env: { ...credentialFreeEnvironment(), ...extraEnv },
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 240000,
    maxBuffer: 4 * 1024 * 1024,
  });
  requireThat(
    result.status === 0 && !result.error,
    "credential-free hosted/browser checks failed",
  );
}
