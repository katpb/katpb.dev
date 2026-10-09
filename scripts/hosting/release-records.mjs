import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export const SHA = /^[a-f0-9]{40}$/;
export const HASH = /^[a-f0-9]{64}$/;
export const LIMITS = { maxFiles: 20000, maxFileBytes: 25 * 1024 * 1024 };
export function requireThat(value, message) {
  if (!value) throw new Error(message);
}
export function strictFields(value, fields) {
  requireThat(
    value && typeof value === "object" && !Array.isArray(value),
    "object required",
  );
  requireThat(
    Object.keys(value).length === fields.length &&
      Object.keys(value).every((k) => fields.includes(k)),
    "unknown or missing field",
  );
}
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`)
      .join(",")}}`;
  requireThat(
    value !== undefined &&
      (typeof value !== "number" || Number.isFinite(value)),
    "invalid canonical value",
  );
  return JSON.stringify(value);
}
export const digest = (value) =>
  crypto
    .createHash("sha256")
    .update(Buffer.isBuffer(value) ? value : canonical(value))
    .digest("hex");
export const lexical = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
export function parseJson(bytes) {
  try {
    return JSON.parse(bytes);
  } catch {
    throw new Error("JSON schema invalid");
  }
}
export function validateEvidence(e) {
  strictFields(e, [
    "schemaVersion",
    "sourceSha",
    "rawDigest",
    "lockfileSha256",
    "nodeVersion",
    "npmVersion",
    "validationResult",
    "clean",
    "reproducibility",
  ]);
  strictFields(e.reproducibility, ["rawEqual", "trackedEqual"]);
  requireThat(
    e.schemaVersion === 1 &&
      SHA.test(e.sourceSha) &&
      HASH.test(e.rawDigest) &&
      HASH.test(e.lockfileSha256) &&
      e.nodeVersion === "24.21.0" &&
      /^11\./.test(e.npmVersion) &&
      e.validationResult === "success" &&
      e.clean === true &&
      e.reproducibility.rawEqual === true &&
      e.reproducibility.trackedEqual === true,
    "successful exact-source validation schema invalid",
  );
  return e;
}
export function safePath(name, { controls = false } = {}) {
  requireThat(
    typeof name === "string" &&
      name.length > 0 &&
      Buffer.byteLength(name) <= 1024 &&
      /^[A-Za-z0-9._/-]+$/.test(name),
    "invalid path control",
  );
  const parts = name.split("/");
  requireThat(
    parts.every((p) => p && p !== "." && p !== "..") && !name.startsWith("/"),
    "invalid path traversal",
  );
  const forbidden =
    /^(?:\.git(?:hub)?|\.env(?:\..*)?|\.dev\.vars(?:\..*)?|\.wrangler|node_modules|package(?:-lock)?\.json|wrangler(?:\..*)?|provenance\.json|(?:raw|package|retained)-manifest\.json|.*\.(?:pem|key))$/i;
  requireThat(!parts.some((p) => forbidden.test(p)), "reserved artifact path");
  requireThat(
    !parts.some((p) =>
      ["_headers", "_redirects", "_worker.js", "__release.json"].includes(
        p.toLowerCase(),
      ),
    ) ||
      (controls &&
        parts.length === 1 &&
        ["_headers", "__release.json"].includes(name)),
    "reserved provider control path",
  );
  return name;
}
export function validateEntries(entries, limits = LIMITS, options = {}) {
  requireThat(
    Array.isArray(entries) && entries.length <= limits.maxFiles,
    "artifact count quota exceeded",
  );
  const seen = new Set();
  const parents = new Set();
  let previous = "";
  for (const e of entries) {
    requireThat(e && typeof e === "object", "entry object required");
    requireThat(!("type" in e) || e.type === "file", "regular files required");
    strictFields(
      e,
      "type" in e
        ? ["path", "size", "sha256", "type"]
        : ["path", "size", "sha256"],
    );
    safePath(e.path, options);
    requireThat(
      Number.isSafeInteger(e.size) &&
        e.size >= 0 &&
        e.size <= limits.maxFileBytes,
      "artifact size quota exceeded",
    );
    requireThat(HASH.test(e.sha256), "invalid artifact hash");
    const lower = e.path.toLowerCase();
    requireThat(
      !seen.has(lower) && lexical(previous, e.path) < 0,
      "duplicate/collision or unsorted path",
    );
    requireThat(
      !lower
        .split("/")
        .slice(0, -1)
        .some((_, i) =>
          seen.has(
            lower
              .split("/")
              .slice(0, i + 1)
              .join("/"),
          ),
        ) && !parents.has(lower),
      "path collision",
    );
    seen.add(lower);
    const segments = lower.split("/");
    for (let i = 1; i < segments.length; i++)
      parents.add(segments.slice(0, i).join("/"));
    previous = e.path;
  }
  return entries;
}
export function manifestFor(files, limits = LIMITS, options = {}) {
  return validateEntries(
    [...files]
      .map(([p, b]) => ({ path: p, size: b.length, sha256: digest(b) }))
      .sort((a, b) => lexical(a.path, b.path)),
    limits,
    options,
  );
}
export async function scanFiles(
  root,
  { controls = false, limits = LIMITS } = {},
) {
  const files = new Map();
  requireThat(
    (await fs.lstat(root)).isDirectory() &&
      !(await fs.lstat(root)).isSymbolicLink(),
    "regular artifact directory required",
  );
  async function walk(dir, prefix = "") {
    for (const name of (await fs.readdir(dir)).sort(lexical)) {
      const rel = prefix + name;
      safePath(rel, { controls });
      const full = path.join(dir, name);
      const stat = await fs.lstat(full);
      if (stat.isDirectory()) {
        requireThat(!stat.isSymbolicLink(), "regular files required");
        await walk(full, rel + "/");
      } else {
        requireThat(
          stat.isFile() && stat.nlink === 1,
          "regular files required",
        );
        requireThat(!(stat.mode & 0o111), "executable artifact flag forbidden");
        requireThat(
          stat.size <= limits.maxFileBytes,
          "artifact size quota exceeded",
        );
        requireThat(
          files.size < limits.maxFiles,
          "artifact count quota exceeded",
        );
        const b = await fs.readFile(full);
        requireThat(b.length === stat.size, "artifact changed during read");
        files.set(rel, b);
      }
    }
  }
  await walk(root);
  return { files, entries: manifestFor(files, limits, { controls }) };
}

// Accept only this bounded USTAR regular-file format. Unsupported PAX/GNU extensions fail closed.
export function encodeArchive(files, limits = LIMITS, options = {}) {
  const entries = manifestFor(files, limits, options);
  const chunks = [];
  for (const e of entries) {
    const h = Buffer.alloc(512);
    const slash = e.path.lastIndexOf("/");
    let name = e.path,
      prefix = "";
    if (Buffer.byteLength(name) > 100) {
      requireThat(slash > 0, "archive path too long");
      prefix = name.slice(0, slash);
      name = name.slice(slash + 1);
    }
    requireThat(
      Buffer.byteLength(name) <= 100 && Buffer.byteLength(prefix) <= 155,
      "archive path too long",
    );
    h.write(name, 0, "ascii");
    h.write(prefix, 345, "ascii");
    h.write("0000644\0", 100, "ascii");
    h.write("0000000\0", 108, "ascii");
    h.write("0000000\0", 116, "ascii");
    h.write(e.size.toString(8).padStart(11, "0") + "\0", 124, "ascii");
    h.write("00000000000\0", 136, "ascii");
    h.fill(32, 148, 156);
    h[156] = 48;
    h.write("ustar\0", 257, "ascii");
    h.write("00", 263, "ascii");
    const sum = h.reduce((a, b) => a + b, 0);
    h.write(sum.toString(8).padStart(6, "0") + "\0 ", 148, "ascii");
    chunks.push(
      h,
      files.get(e.path),
      Buffer.alloc((512 - (e.size % 512)) % 512),
    );
  }
  return Buffer.concat([...chunks, Buffer.alloc(1024)]);
}
export function decodeArchive(bytes, limits = LIMITS, options = {}) {
  requireThat(
    Buffer.isBuffer(bytes) && bytes.length >= 1024 && bytes.length % 512 === 0,
    "invalid archive length",
  );
  const files = new Map();
  let offset = 0;
  const entries = [];
  const str = (h, a, b) => {
    const field = h.subarray(a, b);
    const n = field.indexOf(0);
    const end = n < 0 ? field.length : n;
    requireThat(
      field.subarray(end).every((x) => x === 0),
      "archive field encoding",
    );
    return field.subarray(0, end).toString("ascii");
  };
  const oct = (h, a, b) => {
    const s = h
      .subarray(a, b)
      .toString("ascii")
      .replace(/[\0 ]+$/g, "");
    requireThat(/^[0-7]+$/.test(s), "archive numeric field");
    return parseInt(s, 8);
  };
  while (offset < bytes.length) {
    const h = bytes.subarray(offset, offset + 512);
    if (h.every((b) => b === 0)) {
      requireThat(
        bytes.length - offset >= 1024 &&
          bytes.subarray(offset).every((b) => b === 0),
        "archive trailer invalid",
      );
      validateEntries(entries, limits, options);
      return files;
    }
    const checksum = oct(h, 148, 156);
    const copy = Buffer.from(h);
    copy.fill(32, 148, 156);
    requireThat(
      copy.reduce((a, b) => a + b, 0) === checksum,
      "archive checksum mismatch",
    );
    requireThat(
      h[156] === 48 && str(h, 157, 257) === "",
      "archive regular files required",
    );
    requireThat(
      str(h, 257, 263) === "ustar" && h.subarray(263, 265).toString() === "00",
      "archive format unsupported",
    );
    requireThat(
      (oct(h, 100, 108) & 0o111) === 0,
      "archive executable flag forbidden",
    );
    const name = str(h, 0, 100),
      prefix = str(h, 345, 500),
      p = prefix ? prefix + "/" + name : name;
    safePath(p, options);
    const size = oct(h, 124, 136);
    requireThat(
      size <= limits.maxFileBytes && entries.length < limits.maxFiles,
      "archive quota exceeded",
    );
    const end = offset + 512 + size;
    requireThat(end <= bytes.length - 1024, "archive truncated");
    const b = Buffer.from(bytes.subarray(offset + 512, end));
    entries.push({ path: p, size, sha256: digest(b) });
    requireThat(!files.has(p), "archive duplicate path");
    files.set(p, b);
    offset = end + ((512 - (size % 512)) % 512);
  }
  throw new Error("archive trailer missing");
}
export function validateEnvelope(m) {
  strictFields(m, [
    "schemaVersion",
    "sourceSha",
    "rawDigest",
    "policySha256",
    "retainedDigest",
    "predecessorArchiveId",
    "immutableManifest",
    "packageManifest",
    "packageDigest",
  ]);
  requireThat(
    m.schemaVersion === 1 &&
      SHA.test(m.sourceSha) &&
      [m.rawDigest, m.policySha256, m.retainedDigest, m.packageDigest].every(
        (x) => HASH.test(x),
      ),
    "package schema/digest invalid",
  );
  requireThat(
    m.predecessorArchiveId === null ||
      /^r4-attempt-[1-9]\d*-[1-9]\d*$/.test(m.predecessorArchiveId),
    "archive predecessor invalid",
  );
  validateEntries(m.packageManifest, LIMITS, { controls: true });
  validateEntries(m.immutableManifest);
  requireThat(
    digest(m.immutableManifest) === m.retainedDigest,
    "retained digest mismatch",
  );
  requireThat(
    digest(m.packageManifest) === m.packageDigest,
    "package digest mismatch",
  );
  for (const e of m.immutableManifest)
    requireThat(
      /^_astro\/.+\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9]+$/.test(e.path) &&
        m.packageManifest.some((p) => canonical(p) === canonical(e)),
      "immutable manifest invalid",
    );
  requireThat(
    m.packageManifest.some((e) => e.path === "index.html") &&
      m.packageManifest.some((e) => e.path === "__release.json"),
    "package root/marker missing",
  );
  return m;
}
export async function validatePackage(root) {
  const m = validateEnvelope(
    parseJson(await fs.readFile(path.join(root, "package-manifest.json"))),
  );
  const actual = await scanFiles(path.join(root, "assets"), { controls: true });
  requireThat(
    canonical(actual.entries) === canonical(m.packageManifest),
    "package bytes/digest mismatch",
  );
  requireThat(
    actual.files.get("__release.json").equals(
      Buffer.from(
        canonical({
          schemaVersion: 1,
          sourceSha: m.sourceSha,
          rawDigest: m.rawDigest,
        }) + "\n",
      ),
    ),
    "package marker bytes mismatch",
  );
  return m;
}

const transitions = {
  requested: ["eligible"],
  eligible: ["validated"],
  validated: ["prepared"],
  prepared: ["archived"],
  archived: ["uploading"],
  uploading: ["uploaded", "unresolved"],
  uploaded: ["verifying", "failed-after-upload", "unresolved"],
  verifying: ["verified", "failed-after-upload", "unresolved"],
  unresolved: ["verified-after-reconciliation", "failed-after-reconciliation"],
};
const before = ["requested", "eligible", "validated", "prepared", "archived"];
const stages = [
  "eligibility",
  "validation",
  "packaging",
  "archive",
  "upload",
  "httpsSmoke",
  "browserChecks",
  "recording",
];
const attemptFields = [
  "schemaVersion",
  "attemptId",
  "mode",
  "initiator",
  "trigger",
  "startedAt",
  "finishedAt",
  "deploymentId",
  "archiveId",
  "providerDeploymentId",
  "sourceSha",
  "controlSha",
  "packageDigest",
  "previousKnownGoodArchiveId",
  "restoredArchiveId",
  "stages",
  "state",
  "failedStage",
  "servedState",
  "urls",
  "logUrl",
  "guidance",
];
export function createAttempt(input) {
  strictFields(input, [
    "attemptId",
    "mode",
    "initiator",
    "trigger",
    "sourceSha",
    "controlSha",
  ]);
  requireThat(
    /^(?:[1-9]\d*-[1-9]\d*|local-[a-z0-9-]+-[a-f0-9]{32})$/.test(
      input.attemptId,
    ) &&
      ["release", "preview", "recovery", "reconcile", "cleanup"].includes(
        input.mode,
      ) &&
      SHA.test(input.sourceSha) &&
      SHA.test(input.controlSha),
    "attempt identity invalid",
  );
  requireThat(
    /^[a-zA-Z0-9-]{1,39}$/.test(input.initiator) &&
      ["push", "pull_request", "workflow_dispatch", "local"].includes(
        input.trigger,
      ),
    "attempt actor/trigger invalid",
  );
  return {
    schemaVersion: 1,
    ...input,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    deploymentId: null,
    archiveId: null,
    providerDeploymentId: null,
    packageDigest: null,
    previousKnownGoodArchiveId: null,
    restoredArchiveId: null,
    stages: Object.fromEntries(stages.map((s) => [s, "pending"])),
    state: "requested",
    failedStage: null,
    servedState: "unknown",
    urls: [],
    logUrl: null,
    guidance: "Validate eligibility before proceeding.",
  };
}
export function validateAttempt(a) {
  strictFields(a, attemptFields);
  createAttempt(
    Object.fromEntries(
      [
        "attemptId",
        "mode",
        "initiator",
        "trigger",
        "sourceSha",
        "controlSha",
      ].map((k) => [k, a[k]]),
    ),
  );
  requireThat(
    a.schemaVersion === 1 &&
      SHA.test(a.sourceSha) &&
      SHA.test(a.controlSha) &&
      (a.packageDigest === null || HASH.test(a.packageDigest)),
    "attempt schema invalid",
  );
  strictFields(a.stages, stages);
  requireThat(
    Object.values(a.stages).every((v) =>
      ["pending", "success", "failure", "skipped"].includes(v),
    ),
    "attempt stages invalid",
  );
  requireThat(
    a.servedState === "unknown" || SHA.test(a.servedState),
    "served identity invalid",
  );
  requireThat(
    a.failedStage === null || stages.includes(a.failedStage),
    "failed stage invalid",
  );
  const finalStates = [
    "verified",
    "verified-after-reconciliation",
    "failed-before-upload",
    "failed-after-upload",
    "failed-after-reconciliation",
    "skipped-stale",
    "skipped-authorization",
    "skipped-closed",
  ];
  requireThat(
    [...Object.keys(transitions), ...finalStates].includes(a.state),
    "attempt state invalid",
  );
  const utc = (s) =>
    typeof s === "string" &&
    /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(s) &&
    new Date(s).toISOString() === s;
  requireThat(
    utc(a.startedAt) &&
      (a.finishedAt === null || utc(a.finishedAt)) &&
      (!a.finishedAt || a.finishedAt >= a.startedAt),
    "attempt UTC times invalid",
  );
  requireThat(
    a.deploymentId === null ||
      (Number.isSafeInteger(a.deploymentId) && a.deploymentId > 0),
    "GitHub deployment ID invalid",
  );
  requireThat(
    a.providerDeploymentId === null ||
      (typeof a.providerDeploymentId === "string" &&
        /^[a-f0-9-]{8,36}$/.test(a.providerDeploymentId)),
    "provider deployment ID invalid",
  );
  for (const k of [
    "archiveId",
    "previousKnownGoodArchiveId",
    "restoredArchiveId",
  ])
    requireThat(
      a[k] === null || /^r4-attempt-[1-9]\d*-[1-9]\d*$/.test(a[k]),
      "archive ID invalid",
    );
  requireThat(
    Array.isArray(a.urls) &&
      a.urls.length <= 2 &&
      (a.logUrl === null || typeof a.logUrl === "string"),
    "report URL fields invalid",
  );
  requireThat(
    [
      "Validate eligibility before proceeding.",
      "Verified evidence persisted.",
      "Reconcile served identity before another mutation.",
      "Resolve the failed prerequisite and retry with a new attempt.",
    ].includes(a.guidance),
    "untrusted guidance field",
  );
  for (const u of [...a.urls, ...(a.logUrl ? [a.logUrl] : [])]) {
    const url = new URL(u);
    requireThat(
      url.protocol === "https:" &&
        !url.username &&
        !url.password &&
        !url.search &&
        !url.hash,
      "report URL invalid",
    );
  }
  return a;
}
export function advanceAttempt(
  a,
  state,
  { stages: updates = {}, receiptPersisted = false, failedStage = null } = {},
) {
  validateAttempt(a);
  const allowed = [
    ...(transitions[a.state] ?? []),
    ...(before.includes(a.state)
      ? [
          "failed-before-upload",
          "skipped-stale",
          "skipped-authorization",
          "skipped-closed",
        ]
      : []),
  ];
  requireThat(allowed.includes(state), "invalid attempt transition");
  const next = {
    ...a,
    stages: { ...a.stages, ...updates },
    state,
    failedStage,
  };
  if (["verified", "verified-after-reconciliation"].includes(state)) {
    requireThat(
      stages.every((s) => next.stages[s] === "success") &&
        receiptPersisted &&
        a.archiveId &&
        a.packageDigest,
      "verification and durable receipt required",
    );
    next.servedState = a.sourceSha;
  } else if (
    [
      "uploading",
      "uploaded",
      "verifying",
      "unresolved",
      "failed-after-upload",
      "failed-after-reconciliation",
    ].includes(state)
  )
    next.servedState = "unknown";
  if (!Object.keys(transitions).includes(state) || state === "unresolved")
    next.finishedAt = new Date().toISOString();
  next.guidance = state.startsWith("verified")
    ? "Verified evidence persisted."
    : next.servedState === "unknown" && !before.includes(state)
      ? "Reconcile served identity before another mutation."
      : "Resolve the failed prerequisite and retry with a new attempt.";
  return validateAttempt(next);
}
export async function persistReceipt(file, attempt) {
  validateAttempt(attempt);
  const bytes = canonical(attempt) + "\n";
  const handle = await fs.open(file, "wx", 0o600);
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
  requireThat(
    (await fs.readFile(file, "utf8")) === bytes,
    "persisted receipt readback mismatch",
  );
}
export async function completeVerification(file, attempt) {
  const next = advanceAttempt(
    attempt,
    attempt.state === "unresolved"
      ? "verified-after-reconciliation"
      : "verified",
    { stages: { recording: "success" }, receiptPersisted: true },
  );
  await persistReceipt(file, next);
  return next;
}
export function readableReport(attempt) {
  validateAttempt(attempt);
  return `Source ${attempt.sourceSha}; outcome ${attempt.state}; failed stage ${attempt.failedStage ?? "none"}; served ${attempt.servedState}. ${attempt.guidance}`;
}
