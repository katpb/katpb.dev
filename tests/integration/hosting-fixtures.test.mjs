import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  digest,
  canonical,
  decodeArchive,
  manifestFor,
} from "../../scripts/hosting/release-records.mjs";
import { prepareRelease } from "../../scripts/prepare-release.mjs";
import { verifyHosted } from "../../scripts/verify-hosted.mjs";

test("same packaging/HTTP verifier handles exact historical R1 and current-site fixtures", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "r4-sites-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const baseline = JSON.parse(
    await fs.readFile(
      "specs/004-production-hosting/checklists/evidence/baseline-build-manifests.json",
    ),
  );
  for (const kind of ["r1", "current"]) {
    const files = decodeArchive(
      await fs.readFile(`tests/fixtures/hosting/${kind}-raw.tar`),
    );
    const rawManifest = manifestFor(files);
    assert.equal(canonical(rawManifest), canonical(baseline[kind].files));
    const raw = path.join(root, kind, "dist");
    for (const [p, b] of files) {
      await fs.mkdir(path.dirname(path.join(raw, p)), { recursive: true });
      await fs.writeFile(path.join(raw, p), b);
    }
    // These are synthetic validation fixtures, not authority for a real release or hosted acceptance.
    const evidence = {
      schemaVersion: 1,
      sourceSha: baseline[kind].sourceSha,
      rawDigest: digest(rawManifest),
      lockfileSha256: "a".repeat(64),
      nodeVersion: "24.21.0",
      npmVersion: "11.21.0",
      validationResult: "success",
      clean: true,
      reproducibility: { rawEqual: true, trackedEqual: true },
    };
    const output = path.join(root, ".deploy", kind);
    const manifest = await prepareRelease({
      rawDir: raw,
      outputDir: output,
      sourceSha: evidence.sourceSha,
      evidence,
      retained: new Map(),
      predecessorArchiveId: null,
      expectedRetainedDigest: digest([]),
      publicAstroPaths: [],
      headers: await fs.readFile("hosting/headers", "utf8"),
    });
    const immutable = new Set(manifest.immutableManifest.map((e) => e.path));
    const fetch = async (u, o) => {
      const p =
        new URL(u).pathname === "/"
          ? "index.html"
          : new URL(u).pathname.slice(1);
      let b;
      try {
        b = await fs.readFile(path.join(output, "assets", p));
      } catch {
        return new Response("not found", { status: 404 });
      }
      const etag = '"' + digest(b) + '"';
      if (o.headers?.["If-None-Match"] === etag)
        return new Response(null, { status: 304, headers: { etag } });
      const type = p.endsWith(".css")
        ? "text/css"
        : p.endsWith(".svg")
          ? "image/svg+xml"
          : p.endsWith(".html")
            ? "text/html"
            : "application/json";
      return new Response(b, {
        headers: {
          "content-type": type,
          etag,
          "cache-control": immutable.has(p)
            ? "public, max-age=31536000, immutable"
            : "public, max-age=0, must-revalidate",
          "x-content-type-options": "nosniff",
          "x-robots-tag": "noindex",
          "referrer-policy": "strict-origin-when-cross-origin",
        },
      });
    };
    const result = await verifyHosted(
      {
        url: "https://katpb-dev-acceptance.fixture.workers.dev",
        manifest,
        allowedHosts: ["katpb-dev-acceptance.fixture.workers.dev"],
      },
      { fetch },
    );
    assert.equal(result.state, "verified-http");
    assert.equal(result.resources, rawManifest.length + 1);
  }
});
