import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const astroCli = path.join(
  repositoryRoot,
  "node_modules",
  "astro",
  "bin",
  "astro.mjs",
);
const staleOutput = path.join(repositoryRoot, "dist", "stale-r1-output.txt");
const routeDocuments = [
  "index.html",
  "writing/index.html",
  "projects/index.html",
  "about/index.html",
];

function assertArtifacts() {
  for (const route of routeDocuments) {
    const document = path.join(repositoryRoot, "dist", route);
    assert.ok(existsSync(document), `build must produce ${route}`);
    const html = readFileSync(document, "utf8");
    const resources = [
      ...html.matchAll(/(?:src|href)="(\/_astro\/[^"?#]+)(?:[?#][^"]*)?"/g),
    ].map((match) => match[1]);
    assert.ok(
      resources.length > 0,
      `${route} must reference its local stylesheet`,
    );
    for (const resource of resources)
      assert.ok(
        existsSync(path.join(repositoryRoot, "dist", resource)),
        `${route}: missing ${resource}`,
      );
  }
}

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

function build() {
  const result = spawnSync(process.execPath, [astroCli, "build"], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      ASTRO_TELEMETRY_DISABLED: "1",
    },
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
}

test("full builds replace stale output and preserve source state", () => {
  const before = gitState();

  assert.ok(
    existsSync(path.dirname(staleOutput)),
    "dist/ must exist before recovery testing",
  );
  writeFileSync(
    staleOutput,
    "stale output that must not survive a full build\n",
    "utf8",
  );

  build();
  assert.equal(
    existsSync(staleOutput),
    false,
    "the first build must remove stale output",
  );
  assertArtifacts();

  writeFileSync(
    staleOutput,
    "stale output before the repeated build\n",
    "utf8",
  );
  build();
  assert.equal(
    existsSync(staleOutput),
    false,
    "the repeated build must remove stale output",
  );
  assertArtifacts();

  assert.equal(
    gitState(),
    before,
    "builds must preserve the working-tree state",
  );
});
