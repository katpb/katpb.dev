import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";
import {
  canonical,
  digest,
  requireThat,
  scanFiles,
  SHA,
} from "./release-records.mjs";

export function credentialFreeEnvironment(env = process.env) {
  const result = {};
  for (const k of [
    "PATH",
    "HOME",
    "TMPDIR",
    "LANG",
    "LC_ALL",
    "CI",
    "PLAYWRIGHT_BROWSERS_PATH",
    "npm_config_offline",
    "HTTP_PROXY",
    "HTTPS_PROXY",
    "ALL_PROXY",
    "NO_PROXY",
  ])
    if (env[k] !== undefined) result[k] = env[k];
  result.ASTRO_TELEMETRY_DISABLED = "1";
  return result;
}
export function sourceState(root = process.cwd()) {
  const git = (args) =>
    execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      env: credentialFreeEnvironment(),
    }).trim();
  return {
    sha: git(["rev-parse", "HEAD"]),
    status: git(["status", "--porcelain", "--untracked-files=all"]),
  };
}
export async function validateLocal(root = process.cwd()) {
  const before = sourceState(root);
  requireThat(
    SHA.test(before.sha) && before.status === "",
    "clean committed source required; use a separate checkout and preserve unrelated changes",
  );
  requireThat(process.versions.node === "24.21.0", "Node 24.21.0 required");
  const npmCli = process.env.npm_execpath;
  const env = credentialFreeEnvironment();
  const binary = npmCli ? process.execPath : "npm";
  const prefix = npmCli ? [npmCli] : [];
  const npmVersion = execFileSync(binary, [...prefix, "--version"], {
    encoding: "utf8",
    env,
  }).trim();
  requireThat(/^11\./.test(npmVersion), "npm 11.x required");
  const result = spawnSync(binary, [...prefix, "run", "verify"], {
    cwd: root,
    env,
    stdio: "inherit",
    timeout: 600000,
  });
  requireThat(
    result.status === 0,
    "required full verification failed; no validation receipt written",
  );
  requireThat(
    canonical(sourceState(root)) === canonical(before),
    "verification changed tracked or untracked source",
  );
  const raw = await scanFiles(path.join(root, "dist"));
  const evidence = {
    schemaVersion: 1,
    sourceSha: before.sha,
    rawDigest: digest(raw.entries),
    lockfileSha256: digest(
      await fs.readFile(path.join(root, "package-lock.json")),
    ),
    nodeVersion: process.versions.node,
    npmVersion,
    validationResult: "success",
    clean: true,
    reproducibility: { rawEqual: true, trackedEqual: true },
  };
  const folder = path.join(root, ".deploy");
  await fs.mkdir(folder, { recursive: true });
  await fs.writeFile(
    path.join(folder, "validation.json"),
    canonical(evidence) + "\n",
    { mode: 0o600 },
  );
  return evidence;
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  if (process.argv.length !== 2) {
    console.error(
      "Usage: node scripts/hosting/validate-local.mjs (no arguments)",
    );
    process.exitCode = 1;
  } else
    validateLocal()
      .then((e) =>
        console.log(
          `Validated clean source ${e.sourceSha}; raw ${e.rawDigest}. Next: npm run release:prepare -- --source-sha ${e.sourceSha}`,
        ),
      )
      .catch((e) => {
        console.error(e.message);
        process.exitCode = 1;
      });
}
