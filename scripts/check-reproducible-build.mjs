import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const outputRoot = path.join(repositoryRoot, "dist");

function gitState() {
  const result = spawnSync(
    "git",
    ["status", "--porcelain=v1", "--untracked-files=all"],
    {
      cwd: repositoryRoot,
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

function collectFiles(directory, files = []) {
  const entries = readdirSync(directory, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collectFiles(absolutePath, files);
    } else if (entry.isFile()) {
      files.push(absolutePath);
    } else {
      throw new Error(`Unsupported generated entry: ${absolutePath}`);
    }
  }

  return files;
}

function manifest() {
  const seen = new Set();

  return collectFiles(outputRoot)
    .map((absolutePath) => {
      const relativePath = path
        .relative(outputRoot, absolutePath)
        .split(path.sep)
        .join("/");

      if (
        relativePath === "" ||
        relativePath === ".." ||
        relativePath.startsWith("../")
      ) {
        throw new Error(`Generated path escapes dist/: ${relativePath}`);
      }
      if (seen.has(relativePath)) {
        throw new Error(`Duplicate generated path: ${relativePath}`);
      }
      seen.add(relativePath);

      return {
        path: relativePath,
        sha256: createHash("sha256")
          .update(readFileSync(absolutePath))
          .digest("hex"),
      };
    })
    .sort((left, right) =>
      left.path < right.path ? -1 : left.path > right.path ? 1 : 0,
    );
}

function runBuild() {
  const npmCli = process.env.npm_execpath;
  if (!npmCli) {
    throw new Error("Run this check through npm run test:reproducible.");
  }

  const result = spawnSync(process.execPath, [npmCli, "run", "build"], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      ASTRO_TELEMETRY_DISABLED: "1",
    },
  });

  if (result.status !== 0) {
    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
    throw new Error("The second production build failed.");
  }
}

const sourceBefore = gitState();
const first = manifest();
runBuild();
const second = manifest();
const sourceAfter = gitState();

assert.deepEqual(
  second,
  first,
  "generated paths or SHA-256 content differ between builds",
);
assert.equal(
  sourceAfter,
  sourceBefore,
  "the build changed the working-tree state",
);

console.log(
  `Reproducible build verified for ${second.length} generated file(s).`,
);
