// Acceptance-only transaction laboratory. Its synthetic static fixtures and
// file-backed archive transport are never eligible production candidates.
import fs from "node:fs/promises";
import path from "node:path";
import { prepareRelease } from "../prepare-release.mjs";
import {
  mutateProduction,
  verifyProduction,
  recordProduction,
} from "../release-orchestrator.mjs";
import {
  archiveBundle,
  createProductionArchive,
  readProductionArchive,
  appendArchiveAsset,
} from "./production-runtime.mjs";
import {
  canonical,
  digest,
  manifestFor,
  productionHistory,
  requireThat,
  scanFiles,
  validatePackage,
} from "./release-records.mjs";
import { acceptanceArchiveStore } from "./t036-archive-store.mjs";

const check = (value) =>
  requireThat(value, "T036 controlled observation failed");
export const acceptanceOrigin =
  "https://katpb-dev-acceptance.katpb.workers.dev";
export const scenarios = [
  "archive-quota",
  "archive-integrity",
  "prepared-receipt-integrity",
  "stale",
  "provider-rejection",
  "interrupted-acknowledgement",
  "https-failure",
  "browser-failure",
  "receipt-append",
  "receipt-readback",
  "out-of-order",
];

// The workflow's r4-hosting lock is unchanged. This controlled queue models two
// overlapping requests, deliberately delaying the older caller until the newer
// request has completed. No two provider calls may overlap.
export async function concurrentOutOfOrder(newer, older) {
  let releaseOlder;
  const newerDone = new Promise((resolve) => {
    releaseOlder = resolve;
  });
  const events = [];
  const oldRequest = (async () => {
    events.push("older-request-arrived");
    await newerDone;
    events.push("older-lock-acquired");
    return older();
  })();
  const newRequest = (async () => {
    events.push("newer-lock-acquired");
    try {
      return await newer();
    } finally {
      events.push("newer-lock-released");
      releaseOlder();
    }
  })();
  const settled = await Promise.allSettled([newRequest, oldRequest]);
  for (const result of settled)
    if (result.status === "rejected") throw result.reason;
  return { newer: settled[0].value, older: settled[1].value, events };
}

export async function fixturePackage(
  root,
  label,
  sourceSha,
  history = null,
  attempt = 1,
  limits,
) {
  const rawDir = path.join(root, "raw-" + label + "-" + attempt);
  await fs.mkdir(path.join(rawDir, "_astro"), { recursive: true });
  const css = Buffer.from(
    "body{font-family:system-ui;max-width:60rem;margin:2rem;padding:1rem}/* " +
      label +
      " */\n",
  );
  const asset = "_astro/acceptance." + digest(css).slice(0, 12) + ".css";
  await fs.writeFile(path.join(rawDir, asset), css, { flag: "wx" });
  await fs.writeFile(
    path.join(rawDir, "index.html"),
    `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width"><title>katpb.dev isolated T036 ${label}</title><link rel="stylesheet" href="/${asset}"></head><body><main><h1>Isolated acceptance ${label}</h1><p>This controlled transaction fixture is served exclusively by the acceptance Worker. It is not the production website.</p></main></body></html>`,
    { flag: "wx" },
  );
  const raw = await scanFiles(rawDir);
  const repeated = await scanFiles(rawDir);
  check(canonical(raw.entries) === canonical(repeated.entries));
  // Schema-compatible test evidence, explicitly labelled synthetic in the run
  // record. This is not a claim that candidate CI/source eligibility passed.
  const evidence = {
    schemaVersion: 1,
    sourceSha,
    rawDigest: digest(raw.entries),
    lockfileSha256: digest(
      await fs.readFile(new URL("../../package-lock.json", import.meta.url)),
    ),
    nodeVersion: "24.21.0",
    npmVersion: "11.21.0",
    validationResult: "success",
    clean: true,
    reproducibility: { rawEqual: true, trackedEqual: true },
  };
  const retained = history?.retained ?? new Map();
  const outputDir = path.join(root, "package-" + label + "-" + attempt);
  const envelope = await prepareRelease({
    rawDir,
    outputDir,
    sourceSha,
    evidence,
    retained,
    predecessorArchiveId: history?.newestPrepared ?? null,
    expectedRetainedDigest: digest(manifestFor(retained)),
    publicAstroPaths: [],
    headers: await fs.readFile(
      new URL("../../hosting/headers", import.meta.url),
      "utf8",
    ),
    ...(limits ? { limits } : {}),
  });
  const c = {
    schemaVersion: 1,
    attemptId: attempt + "-1",
    archiveId: "r4-attempt-" + attempt + "-1",
    sourceSha,
    controlSha: sourceSha,
    source: { sourceSha, controlSha: sourceSha, validationResult: "success" },
    state: "prepared",
    packageDigest: envelope.packageDigest,
    predecessorArchiveId: history?.newestPrepared ?? null,
    previousKnownGoodArchiveId: history?.currentVerified ?? null,
    retainedInputDigest: digest(manifestFor(retained)),
    stages: {
      eligibility: "success",
      validation: "success",
      packaging: "success",
      archive: "success",
    },
  };
  return { outputDir, c, envelope };
}

async function archived(store, pkg) {
  const release = await createProductionArchive(
    store.api,
    pkg.c,
    await archiveBundle(pkg.outputDir, pkg.c),
  );
  return { ...pkg, release };
}
async function historyFor(store) {
  const records = [];
  for (const release of store.releases)
    records.push(await readProductionArchive(store.api, release));
  return productionHistory(
    records,
    [...store.tags.keys()].map((t) => t.split("/").at(-1)),
  );
}
async function rejected(fn) {
  try {
    await fn();
    return false;
  } catch {
    return true;
  }
}
async function archiveBytes(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  check(entries.every((e) => e.isFile() && !e.isSymbolicLink()));
  const hashes = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const bytes = await fs.readFile(path.join(dir, entry.name));
    hashes.push({
      name: entry.name,
      size: bytes.length,
      sha256: digest(bytes),
    });
  }
  return digest(hashes);
}
async function finish(store, pkg, provider, verification, fault, observed) {
  let final = null;
  const result = await recordProduction(pkg.c, {
    provider,
    verification,
    providerJob: provider.state === "uploaded" ? "success" : "failure",
    verifyJob: verification?.state === "checks-passed" ? "success" : "failure",
    append: async (r) => {
      store.fault.receiptWrite = fault === "receipt-append";
      await appendArchiveAsset(
        store.api,
        pkg.release,
        "outcome-" + pkg.c.attemptId + ".json",
        Buffer.from(canonical(r) + "\n"),
      );
    },
    readback: async () => {
      store.fault.receiptRead = fault === "receipt-readback";
      return (await readProductionArchive(store.api, pkg.release)).outcome;
    },
    persist: async (r) => {
      final = r;
      await fs.writeFile(
        path.join(observed, "final.json"),
        canonical(r) + "\n",
        { flag: "wx" },
      );
    },
  });
  check(final?.state === result.state);
  return result;
}

export async function runAcceptanceMatrix({
  root,
  sourceSha,
  driver,
  persist = async () => {},
}) {
  check(path.resolve(root).split(path.sep).includes(".deploy"));
  await fs.mkdir(root, { recursive: false });
  const evidence = {
    schemaVersion: 1,
    startedAt: new Date().toISOString(),
    controlSha: sourceSha,
    target: "katpb-dev-acceptance",
    credentialBoundary: "owner-only masked op provider subprocess",
    fixtureOnly: true,
    archiveTransport:
      "controlled append-only filesystem substitute; no GitHub tag/release/asset writes",
    liveProvider: driver.live === true,
    cases: [],
    complete: false,
  };
  await persist(evidence);
  const baselineRoot = path.join(root, "baseline");
  await fs.mkdir(baselineRoot);
  const baselineStore = await acceptanceArchiveStore(
    path.join(baselineRoot, "archive"),
  );
  const a = await archived(
    baselineStore,
    await fixturePackage(baselineRoot, "A", sourceSha),
  );
  const upload = async (pkg, mode = "upload") => {
    check(
      (await validatePackage(pkg.outputDir)).packageDigest ===
        pkg.c.packageDigest,
    );
    return driver[mode](pkg);
  };
  const verify = async (pkg, provider, fault) =>
    verifyProduction(provider, {
      https: async () => {
        if (fault === "https-failure") throw Error("controlled HTTPS failure");
        await driver.https(pkg);
      },
      browser: async () => {
        if (fault === "browser-failure")
          throw Error("controlled browser failure");
        await driver.browser(pkg);
      },
      persist: async (r) =>
        fs.writeFile(
          path.join(path.dirname(pkg.outputDir), "verification.json"),
          canonical(r) + "\n",
          { flag: "wx" },
        ),
    });
  const transact = async (store, pkg, fault, location, fresh = () => true) => {
    let providerCalls = 0;
    let providerRejectionObserved = false;
    const provider = await mutateProduction(pkg.c, {
      archivedPackage: () => readProductionArchive(store.api, pkg.release),
      configure: async () => pkg.outputDir,
      recheck: async () => check(fresh() && fault !== "stale"),
      upload: async () => {
        providerCalls++;
        if (fault === "provider-rejection") {
          const rejection = await upload(pkg, "reject");
          check(rejection.state === "rejected" && rejection.status === 400);
          providerRejectionObserved = true;
          throw Error("observed controlled acceptance provider rejection");
        }
        const result = await upload(pkg);
        if (fault === "interrupted-acknowledgement")
          throw Error("controlled lost acknowledgement after real upload");
        return result;
      },
      persist: async (r) =>
        fs.writeFile(
          path.join(location, "provider.json"),
          canonical(r) + "\n",
          { flag: "wx" },
        ),
    });
    if (fault === "provider-rejection") check(providerRejectionObserved);
    const verification =
      provider.state === "uploaded" ? await verify(pkg, provider, fault) : null;
    if (["receipt-append", "receipt-readback"].includes(fault))
      check(verification?.state === "checks-passed");
    let final = null;
    const recordingRejected = await rejected(async () => {
      final = await finish(store, pkg, provider, verification, fault, location);
    });
    return { provider, verification, final, providerCalls, recordingRejected };
  };
  const first = await transact(baselineStore, a, null, baselineRoot);
  check(first.final?.state === "verified");
  const baselineReceipt = await fs.readFile(
    path.join(baselineRoot, "archive/1/outcome-1-1.json"),
  );
  const baselineHistory = await historyFor(baselineStore);
  check(baselineHistory.currentVerified === a.c.archiveId);
  evidence.cases.push({
    name: "first-release-success",
    state: first.final.state,
    providerCalls: first.providerCalls,
    providerDeploymentId: first.provider.providerDeploymentId,
    packageDigest: a.c.packageDigest,
    durableReceiptDigest: digest(baselineReceipt),
    https: true,
    browser: true,
  });
  await persist(evidence);
  let served = a;
  for (const name of scenarios) {
    // Each fault has independent archive history. A served-identity observation
    // and explicit acceptance-fixture reset precede the next experiment; no
    // unresolved branch is used to authorize an ordinary follow-on mutation.
    if (served !== a) {
      await driver.https(served);
      await upload(a);
      await driver.https(a);
      await driver.browser(a);
      served = a;
    }
    const location = path.join(root, name);
    await fs.mkdir(location);
    const store = await acceptanceArchiveStore(path.join(location, "archive"));
    const cloneA = await archived(store, a);
    await appendArchiveAsset(
      store.api,
      cloneA.release,
      "outcome-1-1.json",
      baselineReceipt,
    );
    const knownGoodBytes = await archiveBytes(path.join(location, "archive/1"));
    const prior = await historyFor(store);
    const b = await fixturePackage(location, "B", sourceSha, prior, 2);
    let result,
      archiveRejected = false,
      packageQuotaRejected = false;
    if (name === "archive-quota") {
      packageQuotaRejected = await rejected(() =>
        fixturePackage(location, "quota", sourceSha, prior, 99, {
          maxFiles: 1,
          maxFileBytes: 100000,
        }),
      );
      check(packageQuotaRejected);
      store.fault.quota = true;
    }
    if (name === "archive-integrity") store.fault.corrupt = "prepared.tar";
    if (name === "prepared-receipt-integrity")
      store.fault.corrupt = "prepared-receipt.json";
    const beforeCalls = evidence.cases.reduce((n, c) => n + c.providerCalls, 0);
    archiveRejected = await rejected(async () => {
      Object.assign(b, await archived(store, b));
    });
    if (!archiveRejected && name !== "out-of-order")
      result = await transact(store, b, name, location);
    if (
      [
        "archive-quota",
        "archive-integrity",
        "prepared-receipt-integrity",
      ].includes(name)
    )
      check(archiveRejected);
    else check(!archiveRejected);
    if (name === "out-of-order") {
      let old;
      const concurrent = await concurrentOutOfOrder(
        () => transact(store, b, null, location),
        async () => {
          const latest = await historyFor(store);
          old = await fixturePackage(
            location,
            "older-request",
            sourceSha,
            latest,
            3,
          );
          Object.assign(old, await archived(store, old));
          const oldLocation = path.join(location, "older");
          await fs.mkdir(oldLocation);
          return transact(store, old, "stale", oldLocation, () => false);
        },
      );
      result = concurrent.newer;
      const outOfOrder = concurrent.older;
      check(result.final?.state === "verified");
      check(
        outOfOrder.providerCalls === 0 &&
          outOfOrder.final?.state === "not-uploaded",
      );
      const retained = await historyFor(store);
      check(
        retained.currentVerified === b.c.archiveId &&
          retained.previousVerified === a.c.archiveId &&
          retained.newestPrepared === old.c.archiveId,
      );
      result.outOfOrder = {
        state: outOfOrder.final.state,
        providerCalls: 0,
        events: concurrent.events,
        newestPrepared: retained.newestPrepared,
        currentVerified: retained.currentVerified,
        previousVerified: retained.previousVerified,
      };
    }
    const zeroMutation =
      archiveRejected || name === "stale" || name === "provider-rejection";
    const expected = zeroMutation ? a : b;
    await driver.https(expected);
    served = expected;
    const blocked = await rejected(() => historyFor(store));
    const unchangedKnownGoodReceipt = (
      await fs.readFile(path.join(location, "archive/1/outcome-1-1.json"))
    ).equals(baselineReceipt);
    check(unchangedKnownGoodReceipt);
    const unchangedKnownGoodBytes =
      (await archiveBytes(path.join(location, "archive/1"))) === knownGoodBytes;
    check(unchangedKnownGoodBytes);
    if (name === "stale")
      check(
        result.providerCalls === 0 &&
          result.final.state === "not-uploaded" &&
          !blocked,
      );
    else if (name !== "out-of-order")
      check(blocked && result?.final?.state !== "verified");
    if (name.startsWith("receipt-"))
      check(result.recordingRejected && result.final === null);
    evidence.cases.push({
      name,
      archiveRejected,
      packageQuotaRejected,
      providerCalls: result?.providerCalls ?? 0,
      state:
        result?.final?.state ??
        (archiveRejected ? "archive-rejected" : "recording-rejected"),
      providerState: result?.provider.state ?? "not-started",
      providerDeploymentId: result?.provider.providerDeploymentId ?? null,
      packageDigest: b.c.packageDigest,
      recordingRejected: result?.recordingRejected ?? false,
      ordinaryMutationBlocked: blocked,
      previousKnownGoodReceiptUnchanged: unchangedKnownGoodReceipt,
      previousKnownGoodArchiveBytesUnchanged: unchangedKnownGoodBytes,
      servedPackageDigest: expected.c.packageDigest,
      servedBytesVerified: true,
      falseVerifiedSuccess: false,
      ...(result?.outOfOrder ? { outOfOrder: result.outOfOrder } : {}),
      completedAt: new Date().toISOString(),
    });
    check(
      evidence.cases.reduce((n, c) => n + c.providerCalls, 0) >= beforeCalls,
    );
    await persist(evidence);
  }
  // Leave the acceptance target at the fully checked newest successful B.
  await driver.https(served);
  await driver.browser(served);
  evidence.finalPackageDigest = served.c.packageDigest;
  evidence.complete = true;
  evidence.finishedAt = new Date().toISOString();
  await persist(evidence);
  return evidence;
}
