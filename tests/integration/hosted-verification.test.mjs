import test from "node:test";
import assert from "node:assert/strict";
import { digest } from "../../scripts/hosting/release-records.mjs";
import {
  verifyHosted,
  discoverDependencies,
} from "../../scripts/verify-hosted.mjs";

const origin = "https://katpb-dev-acceptance.test.workers.dev";
const sha = "a".repeat(40);
const rawDigest = "b".repeat(64);
function fixture() {
  const files = new Map([
    [
      "index.html",
      '<html><head><link rel="stylesheet" href="/_astro/style.Abc12345.css"></head><body><img srcset="/one.svg 1x, /two.svg 2x"></body></html>',
    ],
    [
      "_astro/style.Abc12345.css",
      '@import "nested.css"; body{background:url("/one.svg")}',
    ],
    ["_astro/nested.css", "body{}"],
    ["one.svg", "<svg></svg>"],
    ["two.svg", "<svg></svg>"],
    [
      "__release.json",
      JSON.stringify({ schemaVersion: 1, sourceSha: sha, rawDigest }) + "\n",
    ],
  ]);
  const entries = [...files]
    .map(([path, b]) => ({
      path,
      size: Buffer.byteLength(b),
      sha256: digest(Buffer.from(b)),
    }))
    .sort((a, b) => (a.path < b.path ? -1 : 1));
  const immutableManifest = [
    entries.find((e) => e.path === "_astro/style.Abc12345.css"),
  ];
  const manifest = {
    schemaVersion: 1,
    sourceSha: sha,
    rawDigest,
    policySha256: "c".repeat(64),
    retainedDigest: digest(immutableManifest),
    predecessorArchiveId: null,
    immutableManifest,
    packageManifest: entries,
    packageDigest: digest(entries),
  };
  const requests = [];
  const fetch = async (url, opts) => {
    requests.push(String(url));
    const pathname = new URL(url).pathname;
    const p = pathname === "/" ? "index.html" : pathname.slice(1);
    if (!files.has(p)) return new Response("not found", { status: 404 });
    const mime = p.endsWith(".html")
      ? "text/html"
      : p.endsWith(".css")
        ? "text/css"
        : p.endsWith(".svg")
          ? "image/svg+xml"
          : "application/json";
    const etag = '"' + digest(Buffer.from(files.get(p))) + '"';
    if (opts?.headers?.["If-None-Match"] === etag)
      return new Response(null, { status: 304, headers: { etag } });
    return new Response(files.get(p), {
      headers: {
        "content-type": mime,
        "cache-control":
          p === "_astro/style.Abc12345.css"
            ? "public, max-age=31536000, immutable"
            : "public, max-age=0, must-revalidate",
        etag,
        "x-content-type-options": "nosniff",
        "x-robots-tag": "noindex",
        "referrer-policy": "strict-origin-when-cross-origin",
      },
    });
  };
  return { files, manifest, fetch, requests };
}
const run = (f, fetch = f.fetch, extra = {}) =>
  verifyHosted(
    {
      url: origin,
      manifest: f.manifest,
      allowedHosts: [new URL(origin).hostname],
      requestTimeoutMs: 100,
      totalTimeoutMs: 1000,
      ...extra,
    },
    { fetch },
  );

test("hosted smoke verifies marker/root/resources/cache/conditional freshness/real 404", async () => {
  const f = fixture();
  const result = await run(f);
  assert.equal(result.state, "verified-http");
  assert.equal(result.sourceSha, sha);
  assert.ok(f.requests.some((u) => u.endsWith("/_astro/nested.css")));
  assert.ok(f.requests.some((u) => u.endsWith("/two.svg")));
});
test("recursive discovery handles srcset, CSS imports and URLs, rejecting unsafe dependencies", () => {
  assert.deepEqual(
    discoverDependencies(
      '<img srcset="a.svg 1x,b.svg 2x"><style>@import "a.css";x{background:url(b.svg)}</style>',
      "text/html",
    ).sort(),
    ["a.css", "a.svg", "b.svg", "b.svg"].sort(),
  );
  for (const resource of [
    '<base href="https://evil.test/">',
    '<script>fetch("https://evil.test")</script>',
    '<img src="&#104;ttp://evil.test/x">',
  ])
    assert.throws(
      () => discoverDependencies(resource, "text/html"),
      /unsupported|insecure/,
    );
});
test("wrong bytes, MIME, marker, cache, fallback and redirects fail", async () => {
  for (const mutate of [
    (f) => f.files.set("index.html", "wrong"),
    (f) =>
      f.files.set(
        "__release.json",
        JSON.stringify({
          schemaVersion: 1,
          sourceSha: "d".repeat(40),
          rawDigest,
        }),
      ),
    (f) => f.files.set("one.svg", "wrong"),
    (f) => f.files.set("_astro/nested.css", "wrong"),
  ]) {
    const f = fixture();
    mutate(f);
    await assert.rejects(run(f));
  }
  for (const defect of [
    "mime",
    "immutable",
    "mutable",
    "redirect",
    "fallback",
    "etag",
  ]) {
    const f = fixture();
    const transport = async (u, o) => {
      const r = await f.fetch(u, o);
      if (defect === "redirect")
        return new Response(null, {
          status: 302,
          headers: { location: "https://evil.test/" },
        });
      if (defect === "fallback" && r.status === 404)
        return new Response("fallback", { status: 200 });
      if (r.status !== 200) return r;
      const h = new Headers(r.headers);
      if (defect === "mime") h.set("content-type", "text/plain");
      if (defect === "immutable")
        h.set("cache-control", "public,max-age=5,immutable");
      if (defect === "mutable")
        h.set("cache-control", "public,max-age=31536000,immutable");
      if (defect === "etag") h.delete("etag");
      return new Response(await r.arrayBuffer(), { headers: h });
    };
    await assert.rejects(run(f, transport));
  }
});
test("host gate precedes requests and TLS/timeouts remain failures", async () => {
  const f = fixture();
  let count = 0;
  const fetch = async () => {
    count++;
    throw Error("TLS certificate failed");
  };
  await assert.rejects(run(f, fetch, { url: "http://evil.test" }));
  assert.equal(count, 0);
  await assert.rejects(run(f, fetch), /request|TLS/);
  await assert.rejects(
    run(f, () => new Promise(() => {})),
    /timeout/,
  );
});
