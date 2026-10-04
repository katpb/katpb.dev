import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  digest,
  canonical,
  requireThat,
  validateEnvelope,
  parseJson,
} from "./hosting/release-records.mjs";
import { validatePolicy, allowedHostedHosts } from "./hosting/provider.mjs";
import { parseArgs } from "./prepare-release.mjs";

const types = {
  html: ["text/html"],
  css: ["text/css"],
  js: ["text/javascript", "application/javascript"],
  mjs: ["text/javascript", "application/javascript"],
  json: ["application/json"],
  svg: ["image/svg+xml"],
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  webp: ["image/webp"],
  avif: ["image/avif"],
  gif: ["image/gif"],
  ico: ["image/x-icon", "image/vnd.microsoft.icon"],
  woff: ["font/woff"],
  woff2: ["font/woff2"],
  txt: ["text/plain"],
  xml: ["application/xml", "text/xml"],
  pdf: ["application/pdf"],
};
function opaqueEtag(value) {
  // RFC 9110 sections 8.8.3.2/13.1.2: If-None-Match uses weak comparison.
  return typeof value === "string" &&
    /^(?:W\/)?"[\x21\x23-\x7e\x80-\xff]*"$/.test(value)
    ? value.replace(/^W\//, "")
    : null;
}
export function validateHostedUrl(value, allowedHosts) {
  const u = new URL(value);
  requireThat(
    u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      !u.port &&
      !u.search &&
      !u.hash &&
      u.pathname === "/" &&
      allowedHosts.includes(u.hostname),
    "unsafe or unallowlisted HTTPS target",
  );
  return u;
}
function entities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|amp|quot|apos|lt|gt);?/gi, (_m, x) => {
    if (x[0] === "#") {
      const n =
        x[1].toLowerCase() === "x"
          ? parseInt(x.slice(2), 16)
          : parseInt(x.slice(1), 10);
      requireThat(n > 0 && n <= 0x10ffff, "unsupported HTML entity");
      return String.fromCodePoint(n);
    }
    return { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">" }[
      x.toLowerCase()
    ];
  });
}
function cssDependencies(source) {
  const css = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\\([a-f0-9]{1,6})\s?/gi, (_, s) =>
      String.fromCodePoint(parseInt(s, 16)),
    )
    .replace(/\\([^\r\n])/g, "$1");
  const deps = [];
  let leftover = css;
  leftover = leftover.replace(
    /url\(\s*(?:"([^"\r\n]*)"|'([^'\r\n]*)'|([^\s)'"\r\n]*))\s*\)/gi,
    (_, a, b, c) => {
      deps.push(a ?? b ?? c);
      return "";
    },
  );
  leftover = leftover.replace(
    /@import\s+(?:"([^"\r\n]+)"|'([^'\r\n]+)')/gi,
    (_, a, b) => {
      deps.push(a ?? b);
      return "";
    },
  );
  requireThat(
    !/url\s*\(|@import\s*["']/i.test(leftover),
    "unsupported CSS dependency syntax",
  );
  return deps;
}
function scriptDependencies(source) {
  requireThat(
    !/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|Worker|SharedWorker|sendBeacon)\b|\bimport\s*\(|https?:|\.src\s*=/i.test(
      source,
    ),
    "unsupported script network dependency",
  );
  const deps = [];
  source.replace(
    /\b(?:import|export)\s+(?:[^;\n]*?\bfrom\s*)?["']([^"']+)["']/g,
    (_, p) => {
      deps.push(p);
      return "";
    },
  );
  return deps;
}
export function discoverDependencies(source, mime) {
  let deps = [];
  if (mime === "text/css") deps = cssDependencies(source);
  else if (["text/javascript", "application/javascript"].includes(mime))
    deps = scriptDependencies(source);
  else if (["text/html", "image/svg+xml"].includes(mime)) {
    const html = source.replace(/<!--[\s\S]*?-->/g, "");
    // Tokenize tags while respecting quotes; script/style text is handled separately.
    const tags = html.matchAll(
      /<([a-z][a-z0-9:-]*)\b((?:"[^"]*"|'[^']*'|[^'">])*)>/gi,
    );
    for (const [, tag, body] of tags) {
      const name = tag.toLowerCase();
      requireThat(name !== "base", "unsupported HTML base dependency");
      const attrs = {};
      for (const [, k, a, b, c] of body.matchAll(
        /([^\s=\/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g,
      )) {
        const key = k.toLowerCase();
        requireThat(
          !Object.hasOwn(attrs, key),
          "unsupported duplicate HTML attribute",
        );
        attrs[key] = entities(a ?? b ?? c ?? "");
      }
      requireThat(
        !Object.keys(attrs).some((k) => k.startsWith("on")) &&
          attrs.srcdoc === undefined &&
          attrs["http-equiv"]?.toLowerCase() !== "refresh",
        "unsupported dynamic HTML dependency",
      );
      if (attrs.src !== undefined) deps.push(attrs.src);
      if (attrs.poster !== undefined) deps.push(attrs.poster);
      if (name === "object" && attrs.data !== undefined) deps.push(attrs.data);
      if (
        name === "link" &&
        /(?:stylesheet|icon|preload|modulepreload|manifest)/i.test(
          attrs.rel ?? "",
        )
      ) {
        if (attrs.href !== undefined) deps.push(attrs.href);
      }
      if (mime === "image/svg+xml" && ["image", "use"].includes(name))
        deps.push(attrs.href ?? attrs["xlink:href"] ?? "");
      if (attrs.srcset !== undefined)
        for (const candidate of attrs.srcset.split(",")) {
          const items = candidate.trim().split(/\s+/);
          requireThat(
            items.length <= 2 &&
              (items.length === 1 ||
                /^(?:\d+w|\d+(?:\.\d+)?x)$/.test(items[1])),
            "unsupported srcset dependency",
          );
          deps.push(items[0]);
        }
      if (attrs.style !== undefined) deps.push(...cssDependencies(attrs.style));
    }
    for (const [, css] of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi))
      deps.push(...cssDependencies(css));
    for (const [, js] of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))
      deps.push(...scriptDependencies(js));
  }
  for (const d of deps)
    requireThat(
      !/^\s*(?:http:|https:|\/\/|data:|javascript:)/i.test(d),
      "insecure/cross-origin dependency",
    );
  return deps.filter((d) => d && !d.startsWith("#"));
}
function resourcePath(url, manifest) {
  requireThat(
    !/%|\\/.test(url.pathname),
    "encoded/traversal resource path forbidden",
  );
  let p = url.pathname.slice(1);
  if (!p || p.endsWith("/")) p += "index.html";
  const entry = manifest.packageManifest.find((e) => e.path === p);
  requireThat(
    entry && p !== "_headers",
    `referenced resource missing from manifest: ${p}`,
  );
  return entry;
}
async function verifyHostedUnchecked(
  {
    url,
    manifest,
    allowedHosts,
    requestTimeoutMs = 10000,
    totalTimeoutMs = 120000,
  },
  { fetch = globalThis.fetch } = {},
) {
  validateEnvelope(manifest);
  const base = validateHostedUrl(url, allowedHosts);
  const start = Date.now();
  requireThat(
    Number.isSafeInteger(requestTimeoutMs) &&
      requestTimeoutMs > 0 &&
      Number.isSafeInteger(totalTimeoutMs) &&
      totalTimeoutMs > 0,
    "invalid verification deadline",
  );
  const visited = new Set();
  const freshness = [];
  const immutable = new Set(manifest.immutableManifest.map((e) => e.path));
  async function request(u, headers = {}) {
    requireThat(Date.now() - start < totalTimeoutMs, "hosted total timeout");
    const ms = Math.min(
      requestTimeoutMs,
      totalTimeoutMs - (Date.now() - start),
    );
    const controller = new AbortController();
    let timer;
    try {
      return await Promise.race([
        (async () => {
          const response = await fetch(u, {
            redirect: "manual",
            signal: controller.signal,
            headers,
          });
          requireThat(
            !(
              response.status >= 300 &&
              response.status < 400 &&
              response.status !== 304
            ),
            `forbidden redirect: ${new URL(u).pathname}`,
          );
          const length = Number(response.headers.get("content-length"));
          requireThat(
            !length || length <= 26214400,
            "hosted response size exceeded",
          );
          const reader = response.body?.getReader();
          let size = 0;
          const chunks = [];
          if (reader) {
            while (true) {
              const r = await reader.read();
              if (r.done) break;
              size += r.value.length;
              requireThat(size <= 26214400, "hosted response size exceeded");
              chunks.push(Buffer.from(r.value));
            }
          }
          return {
            status: response.status,
            headers: response.headers,
            bytes: Buffer.concat(chunks),
          };
        })(),
        new Promise((_, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(new Error("hosted request timeout"));
          }, ms);
        }),
      ]);
    } catch (e) {
      if (e.message?.includes("timeout")) throw e;
      throw new Error(
        `Hosted request failed at ${new URL(u).pathname}; check TLS, status, redirect and response bounds.`,
      );
    } finally {
      clearTimeout(timer);
      controller.abort();
    }
  }
  async function verify(entry, u) {
    if (visited.has(entry.path)) return;
    visited.add(entry.path);
    const response = await request(u);
    requireThat(
      response.status === 200,
      `resource HTTP status mismatch: ${entry.path}`,
    );
    requireThat(
      response.bytes.length === entry.size &&
        digest(response.bytes) === entry.sha256,
      `resource bytes/hash mismatch: ${entry.path}; expected ${entry.sha256}; observed ${digest(response.bytes)}`,
    );
    const mime = (response.headers.get("content-type") ?? "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    const ext = entry.path.split(".").pop().toLowerCase();
    requireThat(
      (types[ext] ?? ["application/octet-stream"]).includes(mime),
      `resource MIME mismatch: ${entry.path}`,
    );
    requireThat(
      response.headers.get("x-content-type-options") === "nosniff" &&
        /\bnoindex\b/i.test(response.headers.get("x-robots-tag") ?? "") &&
        response.headers.get("referrer-policy") ===
          "strict-origin-when-cross-origin",
      `security headers missing: ${entry.path}`,
    );
    const cache = response.headers.get("cache-control") ?? "";
    if (immutable.has(entry.path))
      requireThat(
        /^public,\s*max-age=31536000,\s*immutable$/i.test(cache),
        `immutable cache mismatch: ${entry.path}`,
      );
    else {
      requireThat(
        /^public,\s*max-age=0,\s*must-revalidate$/i.test(cache),
        `mutable freshness mismatch: ${entry.path}`,
      );
      const etag = response.headers.get("etag");
      if (etag !== null) {
        requireThat(opaqueEtag(etag) !== null, `invalid ETag: ${entry.path}`);
        const conditional = await request(u, { "If-None-Match": etag });
        requireThat(
          conditional.status === 304 &&
            opaqueEtag(conditional.headers.get("etag")) === opaqueEtag(etag),
          `ETag revalidation failed: ${entry.path}`,
        );
        freshness.push({ path: entry.path, method: "etag-304" });
      } else {
        requireThat(ext === "html", `freshness ETag missing: ${entry.path}`);
        const fresh = await request(u, {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        });
        requireThat(
          fresh.status === 200 &&
            fresh.bytes.length === entry.size &&
            digest(fresh.bytes) === entry.sha256 &&
            (fresh.headers.get("content-type") ?? "")
              .split(";")[0]
              .trim()
              .toLowerCase() === "text/html" &&
            /^public,\s*max-age=0,\s*must-revalidate$/i.test(
              fresh.headers.get("cache-control") ?? "",
            ) &&
            fresh.headers.get("x-content-type-options") === "nosniff" &&
            /\bnoindex\b/i.test(fresh.headers.get("x-robots-tag") ?? "") &&
            fresh.headers.get("referrer-policy") ===
              "strict-origin-when-cross-origin",
          `full-download freshness verification failed: ${entry.path}`,
        );
        freshness.push({ path: entry.path, method: "full-download-no-cache" });
      }
    }
    if (entry.path === "__release.json") {
      let marker;
      try {
        marker = JSON.parse(response.bytes);
      } catch {
        throw new Error("release marker JSON invalid");
      }
      requireThat(
        canonical(marker) ===
          canonical({
            schemaVersion: 1,
            sourceSha: manifest.sourceSha,
            rawDigest: manifest.rawDigest,
          }),
        "release marker identity mismatch",
      );
    }
    for (const dep of discoverDependencies(
      response.bytes.toString("utf8"),
      mime,
    )) {
      requireThat(
        !dep.split(/[?#]/)[0].split("/").includes("..") &&
          !/%|\\|[\u0000-\u0020]/.test(dep),
        "resource traversal/control forbidden",
      );
      const child = new URL(dep, u);
      requireThat(
        child.origin === base.origin &&
          child.protocol === "https:" &&
          !child.username &&
          !child.password,
        "insecure/cross-origin resource",
      );
      child.hash = "";
      await verify(resourcePath(child, manifest), child.href);
    }
  }
  await verify(resourcePath(base, manifest), base.href);
  await verify(
    resourcePath(new URL("/__release.json", base), manifest),
    new URL("/__release.json", base).href,
  );
  for (const entry of manifest.packageManifest)
    if (entry.path !== "_headers") {
      // The trusted assets configuration serves directory indexes at slash routes.
      const publicPath =
        entry.path === "index.html"
          ? ""
          : entry.path.replace(/\/index\.html$/, "/");
      await verify(entry, new URL("/" + publicPath, base).href);
    }
  const nonce = `/__r4_missing_${crypto.randomBytes(16).toString("hex")}`;
  requireThat(
    !manifest.packageManifest.some((e) => "/" + e.path === nonce),
    "404 nonce collision",
  );
  const missing = await request(new URL(nonce, base).href);
  requireThat(
    missing.status === 404 &&
      !/(?:stack trace|CLOUDFLARE_API_TOKEN|BEGIN.*PRIVATE KEY)/i.test(
        missing.bytes.toString(),
      ),
    "genuine safe 404 required",
  );
  return {
    schemaVersion: 1,
    state: "verified-http",
    sourceSha: manifest.sourceSha,
    packageDigest: manifest.packageDigest,
    url: base.href,
    resources: visited.size,
    freshness,
    elapsedMs: Date.now() - start,
    nextAction:
      "Run credential-free browser checks and persist the outcome before declaring deployment verified.",
  };
}
export async function verifyHosted(options, dependencies = {}) {
  try {
    return await verifyHostedUnchecked(options, dependencies);
  } catch (e) {
    const source = /^[a-f0-9]{40}$/.test(options.manifest?.sourceSha)
      ? options.manifest.sourceSha
      : "invalid";
    throw new Error(
      `Revision ${source}; stage hosted verification; ${e.message} Next: resolve the failed resource/identity and rerun credential-free checks.`,
    );
  }
}
async function main(args) {
  const inputs = parseArgs(args, ["--url", "--manifest"]);
  if (inputs.help) {
    console.log(
      "deploy:verify --url <allowlisted-https-origin> --manifest <package-manifest.json>\nCredential-free HTTPS/static delivery checks. Does not declare a deployment verified without browser checks and durable recording.",
    );
    return;
  }
  requireThat(
    inputs["--url"] && inputs["--manifest"],
    "--url and --manifest required; use --help",
  );
  requireThat(
    !Object.keys(process.env).some((k) =>
      /TOKEN|SECRET|PRIVATE_KEY|PASSWORD|AUTH|ACCESS_KEY|CREDENTIAL/i.test(k),
    ) && process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "0",
    "hosted verification must run in a credential-free environment with normal TLS verification",
  );
  const policy = validatePolicy(
    parseJson(await fs.readFile("hosting/policy.json")),
  );
  requireThat(
    policy.subdomain !== null,
    "verified provider host/subdomain required",
  );
  const allowedHosts = allowedHostedHosts(policy, inputs["--url"]);
  const manifest = parseJson(await fs.readFile(inputs["--manifest"]));
  const result = await verifyHosted({
    url: inputs["--url"],
    manifest,
    allowedHosts,
  });
  console.log(canonical(result));
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main(process.argv.slice(2)).catch((e) => {
    console.error(
      `Hosted verification failed: ${e.message} Next: resolve the failed stage and rerun credential-free checks.`,
    );
    process.exitCode = 1;
  });
