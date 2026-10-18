import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { prepareRelease } from "../../scripts/prepare-release.mjs";
import {
  archiveBundle,
  createProductionArchive,
  readProductionArchive,
  appendArchiveAsset,
  prepareProduction,
} from "../../scripts/hosting/production-runtime.mjs";
import {
  digest,
  manifestFor,
  canonical,
  encodeArchive,
} from "../../scripts/hosting/release-records.mjs";

const sha = "a".repeat(40);
export function archiveFixture() {
  const assets = [];
  const bytes = new Map();
  const calls = [];
  let tag = null,
    release = null;
  return {
    calls,
    assets,
    bytes,
    api: {
      get: async (endpoint) => {
        calls.push("get:" + endpoint);
        return { object: { type: "commit", sha: tag } };
      },
      pages: async () => assets,
      post: async (endpoint, body) => {
        calls.push("post:" + endpoint);
        if (endpoint.endsWith("/git/refs")) {
          assert.equal(tag, null);
          tag = body.sha;
          return {};
        }
        assert.equal(release, null);
        release = { id: 5, tag_name: body.tag_name, draft: body.draft };
        return release;
      },
      upload: async (id, name, b) => {
        calls.push("upload:" + name);
        assert.equal(id, 5);
        assert.ok(!assets.some((a) => a.name === name));
        const asset = {
          id: assets.length + 1,
          name,
          state: "uploaded",
          size: b.length,
          digest: `sha256:${digest(b)}`,
        };
        assets.push(asset);
        bytes.set(asset.id, b);
        return asset;
      },
      download: async (id) => {
        calls.push("download:" + id);
        return bytes.get(id);
      },
    },
  };
}
async function packageFixture(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "r4-production-"));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const rawDir = path.join(dir, "dist");
  await fs.mkdir(rawDir);
  await fs.writeFile(path.join(rawDir, "index.html"), "<html>fixture</html>");
  const raw = new Map([["index.html", Buffer.from("<html>fixture</html>")]]);
  const evidence = {
    schemaVersion: 1,
    sourceSha: sha,
    rawDigest: digest(manifestFor(raw)),
    lockfileSha256: "b".repeat(64),
    nodeVersion: "24.21.0",
    npmVersion: "11.21.0",
    validationResult: "success",
    clean: true,
    reproducibility: { rawEqual: true, trackedEqual: true },
  };
  const source = {
    sourceSha: sha,
    controlSha: sha,
    lockfileSha256: evidence.lockfileSha256,
    nodeVersion: evidence.nodeVersion,
    npmVersion: evidence.npmVersion,
    validationResult: "success",
  };
  const outputDir = path.join(dir, ".deploy/package");
  const envelope = await prepareRelease({
    rawDir,
    outputDir,
    sourceSha: sha,
    evidence,
    retained: new Map(),
    predecessorArchiveId: null,
    expectedRetainedDigest: digest([]),
    publicAstroPaths: [],
    headers: "/*\n  X-Robots-Tag: noindex\n",
  });
  const c = {
    schemaVersion: 1,
    attemptId: "10-1",
    archiveId: "r4-attempt-10-1",
    sourceSha: sha,
    controlSha: sha,
    source,
    state: "prepared",
    packageDigest: envelope.packageDigest,
    predecessorArchiveId: null,
    previousKnownGoodArchiveId: null,
    retainedInputDigest: digest([]),
  };
  return { dir, outputDir, c, raw, evidence };
}
test("durable archive creates exact protected tag and draft, re-downloads every byte, and refuses evidence overwrite", async (t) => {
  const { outputDir, c } = await packageFixture(t);
  const f = archiveFixture();
  const bundle = await archiveBundle(outputDir, c);
  const release = await createProductionArchive(f.api, c, bundle);
  assert.equal(f.calls.filter((c) => c.startsWith("upload:")).length, 8);
  assert.ok(f.calls.filter((c) => c.startsWith("download:")).length >= 8);
  const result = await readProductionArchive(f.api, release);
  assert.equal(result.outcome, null);
  assert.equal(result.predecessorArchiveId, null);
  assert.equal(result.packageDigest, c.packageDigest);
  await assert.rejects(
    appendArchiveAsset(
      f.api,
      release,
      "prepared-receipt.json",
      Buffer.from("overwrite"),
    ),
    /never overwrite/,
  );
  assert.equal(
    f.calls.some((c) => /PATCH|DELETE/.test(c)),
    false,
  );
  const entry = f.assets.find((a) => a.name === "prepared.tar");
  f.bytes.set(entry.id, Buffer.from("corrupt"));
  await assert.rejects(readProductionArchive(f.api, release), /integrity/);
});
test("archive write and re-download failures cannot authorize provider work", async (t) => {
  for (const failure of ["upload", "download"])
    await t.test(failure, async (t) => {
      const { outputDir, c } = await packageFixture(t);
      const f = archiveFixture();
      let provider = 0;
      f.api[failure] = async () => {
        throw Error("controlled archive failure");
      };
      await assert.rejects(
        (async () => {
          await createProductionArchive(
            f.api,
            c,
            await archiveBundle(outputDir, c),
          );
          provider++;
        })(),
      );
      assert.equal(provider, 0);
    });
});
test("candidate validation and retained quota fail before archive or upload", async (t) => {
  const { dir, c, raw, evidence } = await packageFixture(t);
  const input = path.join(dir, "candidate");
  await fs.mkdir(input);
  await fs.writeFile(path.join(input, "raw.tar"), encodeArchive(raw));
  await fs.writeFile(
    path.join(input, "raw-manifest.json"),
    canonical(manifestFor(raw)),
  );
  await fs.writeFile(path.join(input, "provenance.json"), canonical(evidence));
  const history = {
    retained: new Map([["_astro/old.Abc12345.css", Buffer.from("old")]]),
    newestPrepared: "r4-attempt-9-1",
  };
  await assert.rejects(
    prepareProduction(c, input, path.join(dir, ".deploy/over-quota"), history, {
      quotas: { maxFiles: 2, maxFileBytes: 26214400 },
    }),
    /quota/,
  );
  await fs.writeFile(
    path.join(input, "provenance.json"),
    canonical({ ...evidence, lockfileSha256: "c".repeat(64) }),
  );
  await assert.rejects(
    prepareProduction(c, input, path.join(dir, ".deploy/corrupt"), history, {
      quotas: { maxFiles: 20000, maxFileBytes: 26214400 },
    }),
    /independently/,
  );
});

test("verified retry requires a distinct archive attempt and cannot overwrite a prior receipt", async (t) => {
  const { outputDir, c } = await packageFixture(t);
  const f = archiveFixture();
  const release = await createProductionArchive(
    f.api,
    c,
    await archiveBundle(outputDir, c),
  );
  const verified = {
    ...c,
    state: "verified",
    stages: Object.fromEntries(
      [
        "eligibility",
        "validation",
        "packaging",
        "archive",
        "upload",
        "httpsSmoke",
        "browserChecks",
        "recording",
      ].map((s) => [s, "success"]),
    ),
    servedState: sha,
    checks: { https: true, browser: true },
    providerDeploymentId: "12345678-1234-1234-1234-123456789abc",
  };
  await appendArchiveAsset(
    f.api,
    release,
    "outcome-10-1.json",
    Buffer.from(canonical(verified) + "\n"),
  );
  assert.equal(
    (await readProductionArchive(f.api, release)).outcome,
    "verified",
  );
  const original = f.bytes.get(
    f.assets.find((a) => a.name === "outcome-10-1.json").id,
  );
  await assert.rejects(
    appendArchiveAsset(
      f.api,
      release,
      "outcome-10-1.json",
      Buffer.from("replacement"),
    ),
  );
  assert.ok(
    f.bytes
      .get(f.assets.find((a) => a.name === "outcome-10-1.json").id)
      .equals(original),
  );
  await assert.rejects(
    createProductionArchive(f.api, c, await archiveBundle(outputDir, c)),
  );
  const retry = { ...c, attemptId: "10-2", archiveId: "r4-attempt-10-2" };
  const fresh = archiveFixture();
  assert.equal(
    (
      await createProductionArchive(
        fresh.api,
        retry,
        await archiveBundle(outputDir, retry),
      )
    ).tag_name,
    "r4-attempt-10-2",
  );
});

test("read-only provider handoff verifies actual archive re-downloads without draft access, and rejects corruption before upload", async (t) => {
  const { writeArchivedHandoff, readArchivedHandoff } =
    await import("../../scripts/hosting/production-runtime.mjs");
  const { dir, outputDir, c } = await packageFixture(t);
  const f = archiveFixture();
  const release = await createProductionArchive(
    f.api,
    c,
    await archiveBundle(outputDir, c),
  );
  const handoff = path.join(dir, ".deploy/archived");
  await writeArchivedHandoff(f.api, release, c, handoff, {
    packageFiles: true,
  });
  const callsBefore = f.calls.length;
  const record = await readArchivedHandoff(handoff, c);
  assert.equal(record.packageDigest, c.packageDigest);
  assert.equal(
    f.calls.length,
    callsBefore,
    "downstream read does not call draft-release API or receive archive token",
  );
  const file = path.join(handoff, "archive/prepared.tar");
  const bytes = await fs.readFile(file);
  bytes[512] ^= 1;
  await fs.writeFile(file, bytes);
  let upload = 0;
  await assert.rejects(
    (async () => {
      await readArchivedHandoff(handoff, c);
      upload++;
    })(),
    /integrity/,
  );
  assert.equal(upload, 0);
});

test("tag, draft, asset and outcome writes authenticate exclusively with the minted archive App token", async (t) => {
  const { generateKeyPairSync, verify } = await import("node:crypto");
  const { archiveClient, githubClient, mintArchiveToken } =
    await import("../../scripts/hosting/github.mjs");
  const {
    validateProductionEnvironments,
    loadProductionHistory,
    writeArchivedHandoff,
  } = await import("../../scripts/hosting/production-runtime.mjs");
  const { recordProduction } =
    await import("../../scripts/release-orchestrator.mjs");
  // Synthetic in-memory signing material and canaries; all requests are intercepted.
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 1024,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });
  const appToken = "archive-app-public-test-canary",
    ordinaryToken = "actions-read-public-test-canary";
  const requests = [];
  const { dir, outputDir, c } = await packageFixture(t);
  const fixture = archiveFixture();
  let release;
  const respond = (data) => new Response(JSON.stringify(data));
  const fetch = async (url, options = {}) => {
    const u = new URL(url),
      method = options.method ?? "GET";
    const authorization = options.headers.Authorization;
    requests.push({
      path: u.pathname,
      method,
      authorization,
      name: u.searchParams.get("name"),
    });
    if (
      [
        "/app",
        "/repos/katpb/katpb.dev/installation",
        "/app/installations/167561083/access_tokens",
      ].includes(u.pathname)
    ) {
      const jwt = authorization.replace(/^Bearer /, "").split(".");
      assert.equal(
        verify(
          "RSA-SHA256",
          Buffer.from(jwt.slice(0, 2).join(".")),
          publicKey,
          Buffer.from(jwt[2], "base64url"),
        ),
        true,
      );
      assert.equal(JSON.parse(Buffer.from(jwt[1], "base64url")).iss, "5176510");
      if (u.pathname === "/app") return respond({ id: 5176510 });
      if (u.pathname.endsWith("/installation"))
        return respond({
          id: 167561083,
          app_id: 5176510,
          repository_selection: "selected",
          permissions: { contents: "write", metadata: "read" },
        });
      assert.deepEqual(JSON.parse(options.body), {
        repositories: ["katpb.dev"],
        permissions: { contents: "write" },
      });
      return respond({
        token: appToken,
        permissions: { contents: "write", metadata: "read" },
      });
    }
    if (authorization === `Bearer ${ordinaryToken}`) {
      assert.equal(
        method,
        "GET",
        "ordinary Actions token cannot mutate archive state",
      );
      if (u.pathname.endsWith("/deployment-branch-policies"))
        return respond({ branch_policies: [{ name: "main", type: "branch" }] });
      if (u.pathname.includes("/environments/"))
        return respond({
          name: u.pathname.split("/").at(-1),
          can_admins_bypass: false,
          deployment_branch_policy: {
            protected_branches: false,
            custom_branch_policies: true,
          },
          protection_rules: [],
        });
      assert.ok(u.pathname.endsWith("/deployments"));
      return respond([]);
    }
    assert.equal(authorization, `Bearer ${appToken}`);
    if (u.hostname === "uploads.github.com")
      return respond(
        await fixture.api.upload(5, u.searchParams.get("name"), options.body),
      );
    if (method === "POST")
      return respond(
        await fixture.api.post(u.pathname, JSON.parse(options.body)),
      );
    if (/\/releases\/assets\/\d+$/.test(u.pathname))
      return new Response(
        await fixture.api.download(Number(u.pathname.split("/").at(-1))),
      );
    if (/\/releases\/\d+\/assets$/.test(u.pathname))
      return respond(fixture.assets);
    if (u.pathname.endsWith("/releases")) return respond([release]);
    if (u.pathname.endsWith("/git/matching-refs/tags/r4-attempt-"))
      return respond([{ ref: `refs/tags/${c.archiveId}` }]);
    if (u.pathname.includes("/compare/"))
      return respond({
        merge_base_commit: { sha: c.sourceSha },
        status: "identical",
      });
    assert.ok(u.pathname.includes("/git/ref/"));
    return respond({ object: { type: "commit", sha: c.sourceSha } });
  };
  const minted = await mintArchiveToken({ privateKey, fetch });
  assert.equal(minted, appToken);
  const archive = archiveClient({ token: minted, fetch });
  const ordinary = githubClient({ token: ordinaryToken, fetch });
  await validateProductionEnvironments(ordinary);
  release = await createProductionArchive(
    archive,
    c,
    await archiveBundle(outputDir, c),
  );
  const provider = {
    ...c,
    state: "uploaded",
    providerDeploymentId: "12345678-1234-1234-1234-123456789abc",
  };
  await recordProduction(c, {
    provider,
    verification: {
      ...provider,
      state: "checks-passed",
      checks: { https: true, browser: true },
    },
    providerJob: "success",
    verifyJob: "success",
    append: (r) =>
      appendArchiveAsset(
        archive,
        release,
        `outcome-${c.attemptId}.json`,
        Buffer.from(canonical(r) + "\n"),
      ),
    readback: async () =>
      (await readProductionArchive(archive, release)).outcome,
    persist: async () => {},
  });
  const history = await loadProductionHistory(archive, ordinary);
  assert.equal(history.currentVerified, c.archiveId);
  await writeArchivedHandoff(
    archive,
    release,
    c,
    path.join(dir, ".deploy/app-handoff"),
  );
  const writes = requests.filter(
    (r) => r.method === "POST" && !r.path.startsWith("/app/"),
  );
  assert.equal(writes.filter((r) => r.path.endsWith("/git/refs")).length, 1);
  assert.equal(writes.filter((r) => r.path.endsWith("/releases")).length, 1);
  assert.equal(
    writes.filter((r) => r.name === `outcome-${c.attemptId}.json`).length,
    1,
  );
  assert.equal(writes.filter((r) => r.name).length, 9);
  assert.ok(writes.every((r) => r.authorization === `Bearer ${appToken}`));
  for (const bytes of fixture.bytes.values())
    for (const secret of [privateKey, appToken, ordinaryToken])
      assert.equal(
        bytes.includes(Buffer.from(secret)),
        false,
        "credentials must not enter durable assets or job handoffs",
      );
  const handoff = await fs.readFile(
    path.join(dir, ".deploy/app-handoff/archive-proof.json"),
    "utf8",
  );
  assert.ok(
    ![privateKey, appToken, ordinaryToken].some((secret) =>
      handoff.includes(secret),
    ),
  );
  assert.equal(
    requests.some((r) => /cloudflare|workers\.dev/.test(r.path)),
    false,
  );
});
