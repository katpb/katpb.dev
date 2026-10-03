import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { validateLocal } from "./hosting/validate-local.mjs";
import {
  canonical,
  digest,
  SHA,
  requireThat,
  scanFiles,
  manifestFor,
  LIMITS,
  validateEvidence,
} from "./hosting/release-records.mjs";

const immutablePath = (p) =>
  /^_astro\/.+\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9]+$/.test(p);
export async function prepareRelease({
  rawDir,
  outputDir,
  sourceSha,
  evidence,
  retained,
  predecessorArchiveId,
  expectedRetainedDigest,
  publicAstroPaths,
  headers,
  limits = LIMITS,
}) {
  const rawPath = path.resolve(rawDir),
    out = path.resolve(outputDir);
  requireThat(
    out.split(path.sep).includes(".deploy") &&
      out !== rawPath &&
      !out.startsWith(rawPath + path.sep) &&
      !rawPath.startsWith(out + path.sep),
    "output must be isolated under .deploy",
  );
  validateEvidence(evidence);
  requireThat(
    SHA.test(sourceSha) &&
      evidence?.sourceSha === sourceSha &&
      evidence.clean === true &&
      evidence.validationResult === "success" &&
      evidence.nodeVersion === "24.21.0" &&
      /^11\./.test(evidence.npmVersion) &&
      evidence.reproducibility?.rawEqual === true &&
      evidence.reproducibility?.trackedEqual === true,
    "exact clean-source successful validation required",
  );
  requireThat(
    retained instanceof Map && Array.isArray(publicAstroPaths),
    "explicit retained/public input required",
  );
  requireThat(
    publicAstroPaths.length === 0,
    "public/_astro masquerading as generated output forbidden",
  );
  requireThat(
    predecessorArchiveId === null ||
      /^r4-attempt-[1-9]\d*-[1-9]\d*$/.test(predecessorArchiveId),
    "retained archive predecessor invalid",
  );
  const raw = await scanFiles(rawPath, { limits });
  requireThat(
    digest(raw.entries) === evidence.rawDigest,
    "stale raw validation digest",
  );
  requireThat(raw.files.has("index.html"), "raw root document required");
  const prior = manifestFor(retained, limits);
  requireThat(
    digest(prior) === expectedRetainedDigest,
    "retained history loss/digest mismatch",
  );
  requireThat(
    predecessorArchiveId !== null || prior.length === 0,
    "first release must have explicit empty history",
  );
  for (const e of prior)
    requireThat(immutablePath(e.path), "retained immutable path invalid");
  const union = new Map(retained);
  const assets = new Map(raw.files);
  for (const [p, b] of raw.files)
    if (immutablePath(p)) {
      requireThat(
        !union.has(p) || union.get(p).equals(b),
        "immutable path collision",
      );
      union.set(p, b);
    }
  for (const [p, b] of union) {
    requireThat(
      !assets.has(p) || assets.get(p).equals(b),
      "immutable path collision",
    );
    assets.set(p, b);
  }
  const immutableManifest = manifestFor(union, limits);
  requireThat(
    typeof headers === "string" && !/cache-control/i.test(headers),
    "trusted headers must not overlap cache rules",
  );
  const rules = immutableManifest
    .map(
      (e) =>
        `/${e.path}\n  Cache-Control: public, max-age=31536000, immutable\n`,
    )
    .join("\n");
  const headerText = headers.trimEnd() + "\n" + (rules ? "\n" + rules : "");
  requireThat(
    immutableManifest.length + 1 <= (limits.maxHeaderRules ?? 100) &&
      headerText
        .split("\n")
        .every(
          (l) => Buffer.byteLength(l) <= (limits.maxHeaderLineBytes ?? 2000),
        ),
    "header quota exceeded",
  );
  const rawDigest = digest(raw.entries);
  const marker = { schemaVersion: 1, sourceSha, rawDigest };
  assets.set("_headers", Buffer.from(headerText));
  assets.set("__release.json", Buffer.from(canonical(marker) + "\n"));
  const packageManifest = manifestFor(assets, limits, { controls: true });
  const envelope = {
    schemaVersion: 1,
    sourceSha,
    rawDigest,
    policySha256: digest(Buffer.from(headerText)),
    retainedDigest: digest(immutableManifest),
    predecessorArchiveId,
    immutableManifest,
    packageManifest,
    packageDigest: digest(packageManifest),
  };
  // All checks happen before writing. Exclusive output prevents overwriting another attempt.
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.mkdir(out);
  async function copy(files, subdir) {
    for (const [p, b] of files) {
      const f = path.join(out, subdir, p);
      await fs.mkdir(path.dirname(f), { recursive: true });
      await fs.writeFile(f, b, { flag: "wx", mode: 0o644 });
    }
  }
  await copy(raw.files, "raw");
  await copy(assets, "assets");
  for (const [p, v] of [
    ["raw-manifest.json", raw.entries],
    ["retained-manifest.json", immutableManifest],
    ["package-manifest.json", envelope],
    [
      "provenance.json",
      {
        schemaVersion: 1,
        sourceSha,
        rawDigest,
        validation: evidence,
        retainedInputDigest: expectedRetainedDigest,
      },
    ],
  ])
    await fs.writeFile(path.join(out, p), canonical(v) + "\n", { flag: "wx" });
  requireThat(
    canonical((await scanFiles(rawPath, { limits })).entries) ===
      canonical(raw.entries),
    "raw input changed during preparation",
  );
  return envelope;
}

export function parseArgs(args, allowed) {
  if (args.length === 1 && args[0] === "--help") return { help: true };
  const result = {};
  for (let i = 0; i < args.length; i += 2) {
    requireThat(
      allowed.includes(args[i]) &&
        !Object.hasOwn(result, args[i]) &&
        args[i + 1] &&
        !args[i + 1].startsWith("--"),
      "unknown, duplicate or missing command input; use --help",
    );
    result[args[i]] = args[i + 1];
  }
  return result;
}
async function main(args) {
  const inputs = parseArgs(args, ["--source-sha"]);
  if (inputs.help) {
    console.log(
      "release:prepare --source-sha <40-character-sha>\nRequires clean exact source. Runs the full credential-free gate when .deploy/validation.json is absent/stale. Output: .deploy/prepared. No provider operation.",
    );
    return;
  }
  requireThat(
    SHA.test(inputs["--source-sha"]),
    "valid --source-sha required; use --help",
  );
  const sourceSha = inputs["--source-sha"];
  requireThat(
    execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim() ===
      sourceSha,
    "source SHA differs from checked-out HEAD",
  );
  requireThat(
    execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], {
      encoding: "utf8",
    }).trim() === "",
    "clean source required; commit changes or use a separate clean checkout; do not reset unrelated work",
  );
  let evidence;
  try {
    evidence = JSON.parse(await fs.readFile(".deploy/validation.json"));
  } catch {
    evidence = null;
  }
  const raw = await scanFiles("dist").catch(() => null);
  if (
    !evidence ||
    evidence.sourceSha !== sourceSha ||
    evidence.lockfileSha256 !==
      digest(await fs.readFile("package-lock.json")) ||
    evidence.rawDigest !== (raw ? digest(raw.entries) : null) ||
    evidence.validationResult !== "success" ||
    evidence.clean !== true
  )
    evidence = await validateLocal();
  let publicAstroPaths = [];
  try {
    publicAstroPaths = await fs.readdir("public/_astro");
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  const result = await prepareRelease({
    rawDir: "dist",
    outputDir: ".deploy/prepared",
    sourceSha,
    evidence,
    retained: new Map(),
    predecessorArchiveId: null,
    expectedRetainedDigest: digest([]),
    publicAstroPaths,
    headers: await fs.readFile("hosting/headers", "utf8"),
  });
  console.log(
    `Source ${sourceSha}; outcome prepared; package ${result.packageDigest}; target unselected. Next: validate provenance and target before provider use.`,
  );
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main(process.argv.slice(2)).catch((e) => {
    console.error(`Preparation failed: ${e.message}`);
    process.exitCode = 1;
  });
