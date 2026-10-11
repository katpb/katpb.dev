import { SHA, requireThat, strictFields } from "./release-records.mjs";
import { resolveTarget, validateProviderUrl } from "./provider.mjs";

// DNS leaves 32 source hex characters after the owner and parent Worker labels.
// The complete source SHA is always retained in provenance and the outcome record.
export function localPreviewName(owner, sourceSha) {
  requireThat(
    owner === "katpb" && SHA.test(sourceSha),
    "local source/owner invalid",
  );
  return `local-${owner}-${sourceSha.slice(0, 32)}`;
}
function targetFor(policy, name) {
  return resolveTarget(policy, {
    kind: "preview",
    environment: "preview",
    workflowRef: "refs/heads/main",
    previewName: name,
  });
}
export function previewDisposition({ pr, permission }, source, policy) {
  if (
    !pr ||
    pr.number !== source.pullRequest ||
    pr.head?.repo?.full_name !== policy.repository ||
    pr.base?.repo?.full_name !== policy.repository ||
    pr.base?.ref !== "main" ||
    !["write", "maintain", "admin"].includes(permission)
  )
    return "skipped-authorization";
  if (pr.state === "closed") return "skipped-closed";
  if (pr.state !== "open") return "skipped-authorization";
  if (pr.head?.sha !== source.sourceSha || pr.head?.ref !== source.sourceRef)
    return "skipped-stale";
  return null;
}
function previousVerified(prior, target) {
  if (prior === null) return null;
  strictFields(prior, ["sourceSha", "uniqueUrl"]);
  requireThat(SHA.test(prior.sourceSha), "previous preview source invalid");
  return {
    sourceSha: prior.sourceSha,
    uniqueUrl: validateProviderUrl(target, prior.uniqueUrl, { unique: true }),
  };
}

// Callbacks are trusted stages, never artifact-defined code. Workflow-level r4-hosting
// serialization must span every callback, including browser verification and reporting.
// The provider credential belongs exclusively to the upload job/subprocess.
export async function executePreview(
  { policy, source, prior = null },
  operations,
) {
  requireThat(
    source?.repository === policy.repository &&
      SHA.test(source.sourceSha) &&
      SHA.test(source.controlSha) &&
      source.validationResult === "success" &&
      source.event === "pull_request" &&
      Number.isSafeInteger(source.pullRequest) &&
      source.pullRequest > 0,
    "authoritative preview source required",
  );
  const target = targetFor(policy, `pr-${source.pullRequest}`);
  let record = {
    schemaVersion: 1,
    sourceSha: source.sourceSha,
    controlSha: source.controlSha,
    previewName: target.previewName,
    state: "requested",
    failedStage: null,
    stableUrl: null,
    uniqueUrl: null,
    providerDeploymentId: null,
    previousVerified: previousVerified(prior, target),
    stableVerified: false,
    inactive: false,
    cleanupRequired: false,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    guidance: "Validate current PR authority before upload.",
  };
  let stage = "eligibility",
    mutationStarted = false;
  const current = async () => {
    const disposition = previewDisposition(
      await operations.readCurrent(),
      source,
      policy,
    );
    if (disposition) {
      record.state = disposition;
      record.inactive = disposition === "skipped-closed";
      record.cleanupRequired = mutationStarted && record.inactive;
      record.guidance = record.cleanupRequired
        ? "Mark inactive and run serialized cleanup for this closed PR."
        : "Obtain current authorized PR validation before another attempt.";
    }
    return disposition;
  };
  const save = async (state) => {
    record.state = state;
    await operations.persist(structuredClone(record));
  };
  const finish = async () => {
    record.finishedAt = new Date().toISOString();
    stage = "recording";
    await operations.persist(structuredClone(record));
    await operations.report(structuredClone(record));
    return record;
  };
  try {
    if (await current()) return await finish();
    stage = "packaging";
    await operations.prepare();
    stage = "eligibility";
    if (await current()) return await finish();
    stage = "recording";
    await save("uploading");
    // Persist first: interruption at any later point must retain an unresolved mutation.
    stage = "upload";
    mutationStarted = true;
    const uploaded = await operations.upload(target);
    requireThat(
      /^[a-f0-9-]{8,36}$/.test(uploaded?.providerDeploymentId),
      "preview ID invalid",
    );
    record.providerDeploymentId = uploaded.providerDeploymentId;
    record.stableUrl = validateProviderUrl(target, uploaded.stableUrl);
    record.uniqueUrl = validateProviderUrl(target, uploaded.uniqueUrl, {
      unique: true,
    });
    requireThat(
      new URL(record.uniqueUrl).hostname.startsWith(
        record.providerDeploymentId + "-",
      ),
      "preview ID/URL mismatch",
    );
    stage = "recording";
    await save("uploaded");
    stage = "eligibility";
    if (await current()) return await finish();
    for (const url of [record.stableUrl, record.uniqueUrl]) {
      stage = "httpsSmoke";
      await operations.verifyHttps(url);
      stage = "browserChecks";
      await operations.verifyBrowser(url);
    }
    stage = "eligibility";
    if (await current()) return await finish();
    record.state = "verified";
    record.stableVerified = true;
    record.guidance =
      "Verified evidence persisted; review the recorded revision and URLs.";
    return await finish();
  } catch {
    // Never copy callback/provider errors into results: they can contain credentials.
    record.failedStage = stage;
    record.state = mutationStarted
      ? stage === "httpsSmoke" || stage === "browserChecks"
        ? "failed-after-upload"
        : "unresolved"
      : "failed-before-upload";
    record.stableVerified = false;
    record.finishedAt = new Date().toISOString();
    record.guidance = mutationStarted
      ? "Reconcile this attempt; the stable URL may serve unverified bytes. The previous verified URL is unique."
      : "Resolve the failed prerequisite and retry with a new attempt.";
    try {
      await operations.persist(structuredClone(record));
    } catch {
      /* Recording remains failed. */
    }
    try {
      await operations.report(structuredClone(record));
    } catch {
      /* Never replace failure with success. */
    }
    return record;
  }
}

export async function cleanupPreview({ policy, name, sourceSha }, operations) {
  requireThat(SHA.test(sourceSha), "cleanup source identity required");
  const target = targetFor(policy, name);
  if (name.startsWith("local-"))
    requireThat(
      name === localPreviewName(policy.owner, sourceSha),
      "local name is not source-bound",
    );
  else {
    const { pr } = await operations.readCurrent();
    requireThat(
      pr?.number === Number(name.slice(3)) &&
        pr.state === "closed" &&
        pr.head?.repo?.full_name === policy.repository &&
        pr.base?.repo?.full_name === policy.repository &&
        pr.base?.ref === "main",
      "authoritative closed same-repository PR required for cleanup",
    );
  }
  const record = {
    schemaVersion: 1,
    previewName: name,
    sourceSha,
    state: "deleting",
    inactive: true,
    retryRequired: true,
    guidance:
      "Delete only the explicit named preview; preserve the parent Worker.",
  };
  // Inactive is persisted/reported before deletion and remains true if deletion fails.
  await operations.persist(structuredClone(record));
  await operations.report(structuredClone(record));
  try {
    if (name.startsWith("pr-")) {
      const { pr } = await operations.readCurrent();
      requireThat(
        pr?.number === Number(name.slice(3)) &&
          pr.state === "closed" &&
          pr.head?.repo?.full_name === policy.repository &&
          pr.base?.repo?.full_name === policy.repository &&
          pr.base?.ref === "main",
        "PR closure changed before deletion; do not remove preview",
      );
    }
    await operations.remove(target);
    record.state = "deleted";
    record.retryRequired = false;
    record.guidance =
      "Named preview deleted; parent Worker and production preserved.";
  } catch {
    record.state = "failed-deletion";
    record.guidance =
      "Retry scoped deletion under the hosting lock; preview remains inactive.";
  }
  await operations.persist(structuredClone(record));
  await operations.report(structuredClone(record));
  return record;
}
