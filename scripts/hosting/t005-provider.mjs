// Owner-only T005 subprocess: built-ins only, no children, logs or credential files.
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  accountId,
  workerIds,
  newDiagnostics,
  recordResponse,
  setCategory,
  tokenSummary,
  sanitizeDiagnostics,
} from "./t005-diagnostics.mjs";
export { sanitizeDiagnostics } from "./t005-diagnostics.mjs";

export const kinds = ["production", "preview", "acceptance"];
const root = fileURLToPath(new URL("../../", import.meta.url));
const account = accountId;
const scripts = "/accounts/" + account + "/workers/scripts/";
const workers = "/accounts/" + account + "/workers/workers/";
const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const hash = /^[a-f0-9]{64}$/;
const previewPattern = /^local-katpb-(?:[a-f0-9]{32}|[a-f0-9]{40})$/;
const sha256 = (bytes) =>
  crypto.createHash("sha256").update(bytes).digest("hex");
class Failure extends Error {
  constructor(stage, status) {
    super("T005 failed");
    this.stage = stage;
    if (Number.isInteger(status) && status >= 100 && status <= 599)
      this.status = status;
  }
}
function check(value, stage = "input") {
  if (!value) throw new Failure(stage);
}
function canonical(value) {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object")
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonical(value[key]))
        .join(",") +
      "}"
    );
  return JSON.stringify(value);
}
function success(response, stage) {
  if (!(
    response.status >= 200 &&
    response.status < 300 &&
    response.body?.success === true
  ))
    throw new Failure(stage, response.status);
  return response.body.result;
}
export function authorizationDenied(response, diagnostics) {
  // Numeric codes are optional. Only this verified, explicitly bound deployment
  // request can establish isolation; a generic provider failure cannot.
  return (
    response.status === 403 &&
    response.body?.success === false &&
    Array.isArray(response.body.errors) &&
    response.body.errors.every(
      (error) => error && typeof error === "object" && !Array.isArray(error),
    ) &&
    diagnostics?.operation === "cross" &&
    diagnostics.accountId === account &&
    diagnostics.accountIdExplicit === true &&
    diagnostics.tokenVerification.succeeded === true &&
    diagnostics.tokenVerification.status === "active" &&
    diagnostics.endpointFamily === "worker-deployments" &&
    diagnostics.method === "POST" &&
    diagnostics.phase === "during-deployment"
  );
}
export function controlledPackage(stage) {
  check(["create", "update"].includes(stage));
  const content = Buffer.from(
    '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="robots" content="noindex"><title>T005 permission test</title><p>T005 ' +
      stage +
      "</p></html>\n",
  );
  return {
    content,
    // Precomputed with pinned Wrangler 4.147.0's BLAKE3(base64 + extension).
    assetHash:
      stage === "create"
        ? "d452046b4ed196aa939bd2424be7b26a"
        : "8417e9b66ff91787f545a9e53890b97f",
    sha256: sha256(content),
  };
}
export async function boundedBody(response, max = 1024 * 1024) {
  const parts = [];
  let size = 0;
  for await (const part of response.body ?? []) {
    size += part.length;
    check(size <= max, "response");
    parts.push(Buffer.from(part));
  }
  return Buffer.concat(parts);
}
export function providerRequest(token) {
  check(
    typeof token === "string" && /^[A-Za-z0-9_-]{20,256}$/.test(token),
    "credential",
  );
  return async (endpoint, method = "GET", body, uploadToken) => {
    check(
      (endpoint.startsWith("/accounts/" + account + "/workers/") ||
        (endpoint === "/accounts/" + account + "/tokens/verify" &&
          method === "GET" &&
          body === undefined)) &&
        !endpoint.includes(".."),
    );
    try {
      const form = body instanceof FormData;
      const raw = body instanceof Blob;
      const response = await fetch(
        "https://api.cloudflare.com/client/v4" + endpoint,
        {
          method,
          redirect: "error",
          signal: AbortSignal.timeout(30000),
          headers: {
            Authorization: "Bearer " + (uploadToken ?? token),
            ...(!form && body !== undefined
              ? { "Content-Type": raw ? body.type : "application/json" }
              : {}),
          },
          ...(body !== undefined
            ? { body: form || raw ? body : JSON.stringify(body) }
            : {}),
        },
      );
      const bytes = await boundedBody(response);
      let parsed = null;
      try {
        parsed = JSON.parse(bytes.toString("utf8"));
      } catch {}
      return { status: response.status, body: parsed };
    } catch {
      // Original errors can contain request diagnostics; never emit them.
      throw new Failure("request");
    }
  };
}
export async function publicAsset(
  url,
  expected,
  retry = false,
  observe = () => {},
) {
  const tries = retry ? 8 : 1;
  let status = null;
  for (let attempt = 0; attempt < tries; attempt++) {
    status = null;
    try {
      const response = await fetch(url, {
        redirect: "error",
        signal: AbortSignal.timeout(10000),
        headers: { "Cache-Control": "no-cache" },
      });
      status = response.status;
      const bytes = await boundedBody(response, 32768);
      const passed = Boolean(
        response.status === 200 &&
        bytes.length === expected.size &&
        sha256(bytes) === expected.sha256 &&
        response.headers.get("x-robots-tag")?.includes("noindex"),
      );
      observe(status, passed);
      if (passed) return;
    } catch {
      /* A failed GET never authorizes a mutation. */
      observe(status, false);
    }
    if (attempt + 1 < tries)
      await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  throw new Failure("served-package", status);
}
async function snapshot(
  kind,
  request,
  verify = publicAsset,
  deploymentId = null,
  includeDeploymentId = false,
) {
  const expected = JSON.parse(
    await fs.readFile(path.join(root, "hosting/t005-baseline.json"), "utf8"),
  );
  check(
    expected.accountId === account && expected.subdomain === "katpb",
    "policy",
  );
  const name = "katpb-dev-" + kind;
  const deployments = success(
    await request(scripts + name + "/deployments"),
    "baseline",
  );
  const latest = (
    Array.isArray(deployments) ? deployments : deployments?.deployments
  )?.[0];
  if (deploymentId !== null)
    check(
      typeof latest?.id === "string" &&
        latest.id.replaceAll("-", "") === deploymentId.replaceAll("-", ""),
      "deployment-readback",
    );
  check(
    latest?.versions?.length === 1 &&
      latest.versions[0].percentage === 100 &&
      uuid.test(latest.versions[0].version_id) &&
      latest.versions[0].version_id.startsWith(
        expected.versionPrefixes[kind] + "-",
      ),
    "baseline",
  );
  const settings = success(
    await request(scripts + name + "/settings"),
    "settings",
  );
  check(
    settings?.compatibility_date === "2026-10-04" &&
      Array.isArray(settings.bindings) &&
      settings.bindings.length === 0,
    "settings",
  );
  const subdomain = success(
    await request(scripts + name + "/subdomain"),
    "settings",
  );
  check(
    subdomain?.enabled === true &&
      subdomain.previews_enabled === (kind === "preview"),
    "settings",
  );
  for (const file of expected.packageManifest.filter(
    (file) => file.path !== "_headers",
  )) {
    const publicPath = file.path.replace(/(^|\/)index\.html$/, "$1");
    await verify("https://" + name + ".katpb.workers.dev/" + publicPath, file);
  }
  // Provider settings stay in memory. Only non-reversible digests escape.
  return {
    versionId: latest.versions[0].version_id,
    settingsDigest: sha256(canonical(settings)),
    subdomainDigest: sha256(canonical(subdomain)),
    ...(includeDeploymentId ? { deploymentId: latest.id } : {}),
  };
}
function validBaseline(value) {
  return (
    value &&
    Object.keys(value).sort().join(",") ===
      "settingsDigest,subdomainDigest,versionId" &&
    uuid.test(value.versionId) &&
    hash.test(value.settingsDigest) &&
    hash.test(value.subdomainDigest)
  );
}
function unchanged(actual, expected) {
  check(
    validBaseline(expected) && canonical(actual) === canonical(expected),
    "base-state",
  );
}
async function uploadPackage(request, stage) {
  const pkg = controlledPackage(stage);
  const session = success(
    await request(scripts + "katpb-dev-preview/assets-upload-session", "POST", {
      manifest: {
        "/index.html": { hash: pkg.assetHash, size: pkg.content.length },
      },
    }),
    "asset-upload",
  );
  check(
    typeof session?.jwt === "string" &&
      session.jwt.length < 16384 &&
      Array.isArray(session.buckets),
    "asset-upload",
  );
  check(
    session.buckets.length <= 1 &&
      session.buckets.every(
        (bucket) =>
          Array.isArray(bucket) &&
          bucket.length === 1 &&
          bucket[0] === pkg.assetHash,
      ),
    "asset-upload",
  );
  let completion = session.jwt;
  let singleUpload = false;
  try {
    singleUpload =
      JSON.parse(Buffer.from(session.jwt.split(".")[1], "base64url"))
        .wrangler_single_asset_uploads === true;
  } catch {
    /* Legacy session uses bulk multipart upload. */
  }
  for (const bucket of session.buckets) {
    const form = new FormData();
    form.set(
      bucket[0],
      new File([pkg.content.toString("base64")], bucket[0], {
        type: "text/html",
      }),
    );
    const uploaded = success(
      await request(
        "/accounts/" +
          account +
          "/workers/assets/upload" +
          (singleUpload ? "/" + pkg.assetHash : "?base64=true"),
        "POST",
        singleUpload ? new Blob([pkg.content], { type: "text/html" }) : form,
        session.jwt,
      ),
      "asset-upload",
    );
    check(
      typeof uploaded?.jwt === "string" && uploaded.jwt.length < 16384,
      "asset-upload",
    );
    completion = uploaded.jwt;
  }
  const form = new FormData();
  form.set(
    "metadata",
    JSON.stringify({
      compatibility_date: "2026-10-04",
      env: {},
      assets: {
        jwt: completion,
        config: {
          html_handling: "auto-trailing-slash",
          not_found_handling: "none",
          run_worker_first: false,
        },
      },
      annotations: { "workers/message": "T005 controlled " + stage },
    }),
  );
  form.append(
    "files",
    new File(
      ["/*\n  X-Robots-Tag: noindex\n  X-Content-Type-Options: nosniff\n"],
      "_headers",
      { type: "text/plain" },
    ),
  );
  return { form, pkg };
}
function absent(response) {
  return (
    response.status === 404 &&
    response.body?.success === false &&
    response.body.errors?.some((error) => error.code === 10025)
  );
}
export function validatePreviewUrl(value, slug, deploymentId = null) {
  check(typeof value === "string" && value.length <= 2048, "preview-url");
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Failure("preview-url");
  }
  const suffix = "-katpb-dev-preview.katpb.workers.dev";
  const prefix = url.hostname.endsWith(suffix)
    ? url.hostname.slice(0, -suffix.length)
    : "";
  check(
    url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      !url.search &&
      !url.hash &&
      url.pathname === "/" &&
      url.hostname
        .split(".")
        .every((label) => label.length > 0 && label.length <= 63),
    "preview-url",
  );
  check(
    deploymentId === null
      ? prefix === slug && /^[a-z0-9][a-z0-9-]{0,62}$/.test(slug)
      : /^(?:[a-f0-9]{8,32}|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})$/.test(
          prefix,
        ) &&
          deploymentId
            .replaceAll("-", "")
            .startsWith(prefix.replaceAll("-", "")),
    "preview-url",
  );
  // Calculations constrain the allowlist; fetch uses the exact API-returned value.
  return value;
}
function returnedPreviewUrls(values, slug, deploymentId = null) {
  check(Array.isArray(values) && values.length === 1, "preview-url");
  return values.map((value) => validatePreviewUrl(value, slug, deploymentId));
}
export function sanitizePreviewEvidence(e) {
  const keys = (value, fields) =>
    value &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join(",") === fields.sort().join(",");
  check(
    keys(e, [
      "resourceCreated",
      "previewName",
      "previewSlug",
      "stableUrls",
      "deployments",
      "servedRequests",
    ]) &&
      typeof e.resourceCreated === "boolean" &&
      previewPattern.test(e.previewName) &&
      (e.previewSlug === null ||
        (typeof e.previewSlug === "string" &&
          /^[a-z0-9][a-z0-9-]{0,62}$/.test(e.previewSlug))) &&
      Array.isArray(e.stableUrls) &&
      e.stableUrls.length <= 1 &&
      Array.isArray(e.deployments) &&
      e.deployments.length <= 2 &&
      Array.isArray(e.servedRequests) &&
      e.servedRequests.length <= 32,
    "response",
  );
  for (const url of e.stableUrls) validatePreviewUrl(url, e.previewSlug);
  for (const d of e.deployments) {
    check(
      keys(d, ["stage", "id", "urls", "servedVerified"]) &&
        ["create", "update"].includes(d.stage) &&
        uuid.test(d.id) &&
        typeof d.servedVerified === "boolean" &&
        Array.isArray(d.urls) &&
        d.urls.length <= 1,
      "response",
    );
    for (const url of d.urls) validatePreviewUrl(url, e.previewSlug, d.id);
  }
  for (const r of e.servedRequests) {
    check(
      keys(r, ["url", "httpStatus", "passed"]) &&
        typeof r.passed === "boolean" &&
        (r.httpStatus === null ||
          (Number.isInteger(r.httpStatus) &&
            r.httpStatus >= 100 &&
            r.httpStatus <= 599)) &&
        [...e.stableUrls, ...e.deployments.flatMap((d) => d.urls)].includes(
          r.url,
        ),
      "response",
    );
  }
  return JSON.parse(JSON.stringify(e));
}
async function previewLifecycle(input, request, verify = publicAsset) {
  const previewName = input.previewName;
  check(previewPattern.test(previewName) && input.kind === "preview");
  const host = success(
    await request(scripts + "katpb-dev-preview/subdomain"),
    "preview-host",
  );
  check(
    host?.enabled === true && host.previews_enabled === true,
    "preview-host",
  );
  const endpoint = workers + "katpb-dev-preview/previews/" + previewName;
  check(absent(await request(endpoint)), "preview-preflight");
  let attemptedCreate = false,
    created = false,
    updated = false,
    cleanup = false,
    failure;
  const previewEvidence = {
    resourceCreated: false,
    previewName,
    previewSlug: null,
    stableUrls: [],
    deployments: [],
    servedRequests: [],
  };
  try {
    attemptedCreate = true;
    const resource = success(
      await request(
        workers + "katpb-dev-preview/previews?ignore_base_config=true",
        "POST",
        { name: previewName },
      ),
      "preview-create",
    );
    check(resource?.name === previewName, "preview-create");
    previewEvidence.resourceCreated = true;
    check(
      typeof resource.slug === "string" &&
        /^[a-z0-9][a-z0-9-]{0,62}$/.test(resource.slug),
      "preview-url",
    );
    previewEvidence.previewSlug = resource.slug;
    previewEvidence.stableUrls = returnedPreviewUrls(
      resource.urls,
      resource.slug,
    );
    for (const stage of ["create", "update"]) {
      const { form, pkg } = await uploadPackage(request, stage);
      const deployment = success(
        await request(endpoint + "/deployments", "POST", form),
        "preview-" + stage,
      );
      check(uuid.test(deployment?.id), "preview-" + stage);
      const record = {
        stage,
        id: deployment.id,
        urls: [],
        servedVerified: false,
      };
      previewEvidence.deployments.push(record);
      record.urls = returnedPreviewUrls(
        deployment.urls,
        resource.slug,
        deployment.id,
      );
      for (const url of [...previewEvidence.stableUrls, ...record.urls])
        await verify(
          url,
          { size: pkg.content.length, sha256: pkg.sha256 },
          true,
          (httpStatus, passed) =>
            previewEvidence.servedRequests.push({ url, httpStatus, passed }),
        );
      const latest = success(
        await request(endpoint + "/deployments/latest"),
        "preview-" + stage,
      );
      check(latest?.id === deployment.id, "preview-" + stage);
      record.servedVerified = true;
      if (stage === "create") created = true;
      else updated = true;
    }
  } catch (error) {
    failure = error instanceof Failure ? error : new Failure("request");
  } finally {
    // Reconcile even a timed-out create; never delete a pre-existing Preview.
    if (attemptedCreate) {
      try {
        const current = await request(endpoint);
        if (!absent(current)) {
          success(current, "preview-delete");
          success(await request(endpoint, "DELETE"), "preview-delete");
        }
        cleanup = absent(await request(endpoint));
        check(cleanup, "preview-delete");
      } catch {
        failure ??= new Failure("preview-delete");
      }
    }
  }
  return {
    pass: created && updated && cleanup && !failure,
    stage: failure?.stage ?? "complete",
    created,
    updated,
    cleanup,
    previewEvidence: sanitizePreviewEvidence(previewEvidence),
    ...(failure?.status ? { status: failure.status } : {}),
  };
}
export async function runOperation(
  input,
  {
    request: originalRequest,
    verify,
    verifyToken = false,
    accountIdExplicit = false,
    enforceAccountBinding = false,
  } = {},
) {
  const diagnostics = newDiagnostics(input, accountIdExplicit);
  const request = async (endpoint, method = "GET", body, uploadToken) => {
    try {
      if (method !== "GET") diagnostics.phase = "during-deployment";
      const response = await originalRequest(
        endpoint,
        method,
        body,
        uploadToken,
      );
      recordResponse(diagnostics, endpoint, method, response);
      if (
        method !== "GET" &&
        response.status >= 200 &&
        response.status < 300 &&
        response.body?.success === true
      )
        diagnostics.phase = "after-deployment";
      return response;
    } catch (error) {
      recordResponse(diagnostics, endpoint, method, {
        status: error?.status ?? null,
      });
      setCategory(diagnostics, "transport");
      throw error;
    }
  };
  const finish = (result) => {
    diagnostics.providerSubprocessExitCode = result.pass ? 0 : 1;
    return { ...result, diagnostics: sanitizeDiagnostics(diagnostics) };
  };
  try {
    check(
      input &&
        kinds.includes(input.kind) &&
        Object.keys(input).every((key) =>
          [
            "operation",
            "kind",
            "target",
            "baseline",
            "previewName",
            "deploymentId",
          ].includes(key),
        ),
    );
    if (enforceAccountBinding || input.operation === "cross")
      check(accountIdExplicit, "account-binding");
    const policy = JSON.parse(
      await fs.readFile(path.join(root, "hosting/policy.json"), "utf8"),
    );
    check(
      policy.accountId === account &&
        kinds.every(
          (kind) =>
            policy.targets[kind]?.workerName === "katpb-dev-" + kind &&
            policy.targets[kind]?.workerId === workerIds[kind] &&
            policy.targets[kind]?.verified === true &&
            policy.targets[kind]?.workersDev === true &&
            policy.targets[kind]?.previewUrls === (kind === "preview"),
        ),
      "policy",
    );
    if (
      input.operation === "diagnose-token" ||
      verifyToken ||
      input.operation === "cross"
    ) {
      const response = await request("/accounts/" + account + "/tokens/verify");
      diagnostics.tokenVerification = tokenSummary(response);
      if (!diagnostics.tokenVerification.succeeded) {
        if (diagnostics.category === "none")
          setCategory(diagnostics, "token-inactive");
        throw new Failure("token-verification", response.status);
      }
      if (input.operation === "diagnose-token")
        return finish({
          pass: true,
          stage: "complete",
          status: response.status,
        });
    }
    if (input.operation === "preview-lifecycle") {
      const result = await previewLifecycle(input, request, verify);
      if (["preview-url", "served-package"].includes(result.stage))
        setCategory(diagnostics, "preview-hosting");
      return finish(result);
    }
    if (
      ["baseline", "final", "cross-before", "cross-after"].includes(
        input.operation,
      )
    ) {
      const crossState = input.operation.startsWith("cross-");
      if (input.operation === "cross-after")
        check(
          typeof input.deploymentId === "string" &&
            /^(?:[a-f0-9]{32}|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})$/.test(
              input.deploymentId,
            ),
        );
      const state = await snapshot(
        input.kind,
        request,
        verify,
        input.operation === "cross-after" ? input.deploymentId : null,
        crossState,
      );
      const { deploymentId, ...baseline } = state;
      if (input.operation !== "baseline") unchanged(baseline, input.baseline);
      if (crossState)
        check(
          typeof deploymentId === "string" &&
            /^(?:[a-f0-9]{32}|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})$/.test(
              deploymentId,
            ),
          "deployment-readback",
        );
      return finish({
        pass: true,
        stage: "complete",
        baseline,
        ...(crossState ? { deploymentId } : {}),
      });
    }
    check(
      ["own", "cross"].includes(input.operation) &&
        kinds.includes(input.target) &&
        validBaseline(input.baseline),
    );
    check((input.operation === "own") === (input.kind === input.target));
    const recorded = JSON.parse(
      await fs.readFile(path.join(root, "hosting/t005-baseline.json"), "utf8"),
    );
    check(
      input.baseline.versionId.startsWith(
        recorded.versionPrefixes[input.target] + "-",
      ),
      "baseline",
    );
    if (input.operation === "own")
      unchanged(await snapshot(input.kind, request, verify), input.baseline);
    diagnostics.phase = "during-deployment";
    const response = await request(
      scripts + "katpb-dev-" + input.target + "/deployments",
      "POST",
      {
        strategy: "percentage",
        versions: [{ version_id: input.baseline.versionId, percentage: 100 }],
        annotations: {
          "workers/message": "T005 same-package authorization probe",
        },
      },
    );
    if (input.operation === "cross") {
      const denied = authorizationDenied(response, diagnostics);
      const allowed = response.status >= 200 && response.status < 300;
      return finish({
        pass: denied,
        stage: denied
          ? "complete"
          : allowed
            ? "security-boundary"
            : "authorization",
        outcome: denied
          ? "denied-as-expected"
          : allowed
            ? "security-boundary-failed"
            : "unexpected-failure",
        status: response.status,
      });
    }
    const deployment = success(response, "authorization");
    diagnostics.phase = "after-deployment";
    const deploymentId = deployment?.id;
    diagnostics.responseShape = {
      idFormat:
        deploymentId === undefined
          ? "absent"
          : uuid.test(deploymentId)
            ? "uuid"
            : typeof deploymentId === "string" &&
                /^[a-f0-9]{32}$/.test(deploymentId)
              ? "hex32"
              : "other",
      versionsPresent: Array.isArray(deployment?.versions),
      versionsMatch: Boolean(
        deployment?.versions?.length === 1 &&
        deployment.versions[0].version_id === input.baseline.versionId &&
        deployment.versions[0].percentage === 100,
      ),
    };
    check(
      ["uuid", "hex32"].includes(diagnostics.responseShape.idFormat) &&
        (deployment?.versions === undefined ||
          Array.isArray(deployment.versions)) &&
        (!diagnostics.responseShape.versionsPresent ||
          diagnostics.responseShape.versionsMatch),
      "deployment-response",
    );
    unchanged(
      await snapshot(input.kind, request, verify, deploymentId),
      input.baseline,
    );
    return finish({ pass: true, stage: "complete", status: response.status });
  } catch (error) {
    const failure = error instanceof Failure ? error : new Failure("request");
    if (failure.stage === "deployment-response")
      setCategory(diagnostics, "response-shape");
    else if (
      failure.stage === "preview-host" &&
      diagnostics.category === "none"
    )
      setCategory(diagnostics, "preview-hosting");
    else if (diagnostics.category === "none")
      setCategory(diagnostics, "preflight");
    return finish({
      pass: false,
      stage: failure.stage,
      ...(failure.status ? { status: failure.status } : {}),
    });
  }
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  let result;
  try {
    check(process.env.T005_OWNER_SUBPROCESS === "1", "input");
    let token = process.env.CLOUDFLARE_API_TOKEN;
    delete process.env.CLOUDFLARE_API_TOKEN;
    const request = providerRequest(token);
    token = undefined;
    let text = "";
    for await (const chunk of process.stdin) {
      text += chunk;
      check(text.length <= 8192);
    }
    result = await runOperation(JSON.parse(text), {
      request,
      verifyToken: true,
      enforceAccountBinding: true,
      accountIdExplicit: process.env.CLOUDFLARE_ACCOUNT_ID === account,
    });
  } catch {
    result = { pass: false, stage: "input" };
  }
  process.stdout.write(JSON.stringify(result) + "\n");
  process.exitCode = result.pass ? 0 : 1;
}
