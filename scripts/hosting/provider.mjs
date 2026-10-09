import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn as nodeSpawn } from "node:child_process";
import {
  canonical,
  SHA,
  requireThat,
  strictFields,
  validatePackage,
} from "./release-records.mjs";

const controlRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
export function validatePolicy(p) {
  strictFields(p, [
    "schemaVersion",
    "repository",
    "accountId",
    "subdomain",
    "workflow",
    "quotas",
    "targets",
    "owner",
    "maintainerCount",
  ]);
  requireThat(
    p.schemaVersion === 1 &&
      p.repository === "katpb/katpb.dev" &&
      /^[a-f0-9]{32}$/.test(p.accountId) &&
      p.owner === "katpb" &&
      Number.isSafeInteger(p.maintainerCount) &&
      p.maintainerCount >= 1,
    "policy identity invalid",
  );
  requireThat(
    p.subdomain === null ||
      /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(p.subdomain),
    "policy subdomain invalid",
  );
  strictFields(p.workflow, ["id", "path", "name", "check", "checkAppId"]);
  requireThat(
    (p.workflow.id === null ||
      (Number.isSafeInteger(p.workflow.id) && p.workflow.id > 0)) &&
      p.workflow.path === ".github/workflows/ci.yml" &&
      p.workflow.name === "CI" &&
      p.workflow.check === "repository-health" &&
      p.workflow.checkAppId === 15368,
    "policy workflow invalid",
  );
  const quotaKeys = [
    "maxFiles",
    "maxFileBytes",
    "maxPreviews",
    "maxPreviewDeployments",
  ];
  requireThat(
    Object.keys(p.quotas).every((k) =>
      [...quotaKeys, "maxHeaderRules", "maxHeaderLineBytes"].includes(k),
    ) &&
      quotaKeys.every(
        (k) => Number.isSafeInteger(p.quotas[k]) && p.quotas[k] > 0,
      ),
    "policy quota field invalid",
  );
  for (const [k, max] of Object.entries({
    maxFiles: 20000,
    maxFileBytes: 26214400,
    maxPreviews: 100,
    maxPreviewDeployments: 100,
    maxHeaderRules: 100,
    maxHeaderLineBytes: 2000,
  }))
    requireThat(
      p.quotas[k] === undefined ||
        (Number.isSafeInteger(p.quotas[k]) &&
          p.quotas[k] > 0 &&
          p.quotas[k] <= max),
      "policy exceeds Free quota",
    );
  strictFields(p.targets, ["production", "preview", "acceptance"]);
  for (const kind of Object.keys(p.targets)) {
    const t = p.targets[kind];
    strictFields(t, [
      "workerName",
      "workerId",
      "verified",
      "workersDev",
      "previewUrls",
    ]);
    requireThat(
      t.workerName === `katpb-dev-${kind}` &&
        t.workersDev === true &&
        t.previewUrls === (kind === "preview") &&
        typeof t.verified === "boolean" &&
        (t.workerId === null ||
          (typeof t.workerId === "string" &&
            /^[a-zA-Z0-9_-]{1,128}$/.test(t.workerId))),
      "policy Worker invalid",
    );
    requireThat(
      !t.verified || (t.workerId !== null && p.subdomain !== null),
      "unverified Worker identity",
    );
  }
  return p;
}
export function resolveTarget(policy, input) {
  validatePolicy(policy);
  requireThat(
    Object.keys(input).every((k) =>
      ["kind", "environment", "workflowRef", "previewName"].includes(k),
    ),
    "unknown target field",
  );
  const { kind, environment, workflowRef, previewName = null } = input;
  requireThat(
    ["production", "preview", "acceptance"].includes(kind) &&
      workflowRef === "refs/heads/main",
    "target kind/main authorization invalid",
  );
  requireThat(
    kind === "preview"
      ? environment === "preview"
      : ["production", "production-recovery"].includes(environment),
    "target/environment isolation invalid",
  );
  requireThat(
    kind === "preview"
      ? /^(?:pr-[1-9]\d*|local-katpb-(?:[a-f0-9]{32}|[a-f0-9]{40}))$/.test(
          previewName,
        )
      : previewName === null,
    "invalid preview name",
  );
  const t = policy.targets[kind];
  requireThat(
    t.verified && t.workerId && policy.subdomain,
    "target unverified; provisioning readback required",
  );
  return {
    kind,
    environment,
    workflowRef,
    previewName,
    accountId: policy.accountId,
    workerName: t.workerName,
    workerId: t.workerId,
    workersDev: t.workersDev,
    previewUrls: t.previewUrls,
    subdomain: policy.subdomain,
    quota: policy.quotas,
  };
}
export function validateProviderUrl(target, value, { unique = false } = {}) {
  requireThat(
    typeof value === "string" && value.length <= 2048,
    "provider URL invalid",
  );
  const u = new URL(value);
  requireThat(
    u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      !u.port &&
      !u.search &&
      !u.hash &&
      u.hostname
        .split(".")
        .every((label) => label.length > 0 && label.length <= 63) &&
      u.pathname === "/",
    "unsafe provider URL",
  );
  const suffix = `${target.workerName}.${target.subdomain}.workers.dev`;
  const stable = target.previewName
    ? `${target.previewName}-${suffix}`
    : suffix;
  const prefix = u.hostname.endsWith(`-${suffix}`)
    ? u.hostname.slice(0, -suffix.length - 1)
    : "";
  requireThat(
    unique
      ? target.kind === "preview" &&
          /^(?:[a-f0-9]{8,32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/.test(
            prefix,
          )
      : u.hostname === stable,
    "provider hostname is not allowlisted",
  );
  return u.href;
}
export function allowedHostedHosts(policy, value) {
  validatePolicy(policy);
  const u = new URL(value);
  const allowed = [];
  for (const kind of Object.keys(policy.targets)) {
    const t = policy.targets[kind];
    if (!t.verified || !policy.subdomain) continue;
    const suffix = `${t.workerName}.${policy.subdomain}.workers.dev`;
    if (u.hostname === suffix) {
      allowed.push(u.hostname);
      continue;
    }
    if (kind === "preview" && u.hostname.endsWith("-" + suffix)) {
      const prefix = u.hostname.slice(0, -suffix.length - 1);
      if (
        /^(?:pr-[1-9]\d*|local-katpb-(?:[a-f0-9]{32}|[a-f0-9]{40})|[a-f0-9]{8,32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/.test(
          prefix,
        ) &&
        u.hostname
          .split(".")
          .every((label) => label.length > 0 && label.length <= 63)
      )
        allowed.push(u.hostname);
    }
  }
  return allowed;
}
export function generatedConfig(target, assetsDir) {
  requireThat(
    target.workersDev === true &&
      target.previewUrls === (target.kind === "preview"),
    "required workers.dev Preview host configuration missing",
  );
  requireThat(
    path.isAbsolute(assetsDir) && assetsDir.split(path.sep).includes(".deploy"),
    "trusted assets directory required",
  );
  return {
    name: target.workerName,
    account_id: target.accountId,
    compatibility_date: "2026-10-02",
    workers_dev: target.workersDev,
    preview_urls: target.previewUrls,
    assets: {
      directory: assetsDir,
      html_handling: "auto-trailing-slash",
      not_found_handling: "none",
    },
    ...(target.kind === "preview" ? { previews: {} } : {}),
  };
}
export async function writeConfig(policy, input, packageDir) {
  const target = resolveTarget(policy, input);
  await validatePackage(packageDir);
  const config = generatedConfig(target, path.resolve(packageDir, "assets"));
  const file = path.resolve(packageDir, "wrangler.json");
  await fs.writeFile(file, canonical(config) + "\n", { flag: "wx" });
  return { target, configPath: file };
}
export function providerArguments({
  target,
  operation,
  sourceSha,
  attemptId,
  configPath,
}) {
  requireThat(
    path.isAbsolute(configPath) &&
      configPath.split(path.sep).includes(".deploy") &&
      path.basename(configPath) === "wrangler.json",
    "trusted config path required",
  );
  requireThat(
    SHA.test(sourceSha) &&
      /^(?:[1-9]\d*-[1-9]\d*|local-[a-z0-9-]+-[a-f0-9]{32})$/.test(attemptId),
    "provider source/attempt identity invalid",
  );
  if (operation === "deploy") {
    requireThat(
      target.kind !== "preview",
      "preview cannot deploy parent Worker",
    );
    return [
      "deploy",
      "--config",
      configPath,
      "--name",
      target.workerName,
      "--tag",
      sourceSha,
      "--message",
      attemptId,
      "--autoconfig=false",
    ];
  }
  if (operation === "preview") {
    requireThat(target.kind === "preview", "preview-only operation required");
    return [
      "preview",
      "--config",
      configPath,
      "--worker-name",
      target.workerName,
      "--name",
      target.previewName,
      "--tag",
      sourceSha,
      "--message",
      attemptId,
      "--json",
      "--ignore-base-config",
    ];
  }
  if (operation === "cleanup") {
    requireThat(target.kind === "preview", "preview-only cleanup required");
    return [
      "preview",
      "delete",
      "--config",
      configPath,
      "--worker-name",
      target.workerName,
      "--name",
      target.previewName,
      "--skip-confirmation",
    ];
  }
  throw new Error("unknown provider operation");
}
function runProcess(binary, args, options, spawn) {
  return new Promise((resolve, reject) => {
    let child,
      stdout = "",
      stderr = "",
      settled = false;
    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      error ? reject(error) : resolve(result);
    };
    const timer = setTimeout(() => {
      child?.kill("SIGTERM");
      setTimeout(() => child?.kill("SIGKILL"), 1000).unref();
      finish(new Error("provider timeout; served state unresolved"));
    }, options.timeoutMs);
    try {
      child = spawn(binary, args, {
        cwd: options.cwd,
        env: options.env,
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch {
      finish(new Error("provider process unavailable"));
      return;
    }
    const collect = (channel, b) => {
      if (channel === "stdout") stdout += b;
      else stderr += b;
      if (stdout.length + stderr.length > 1024 * 1024) {
        child.kill("SIGTERM");
        finish(
          new Error("provider output bound exceeded; served state unresolved"),
        );
      }
    };
    child.stdout.on("data", (b) => collect("stdout", b));
    child.stderr.on("data", (b) => collect("stderr", b));
    child.on("error", () =>
      finish(new Error("provider execution failed; served state unresolved")),
    );
    child.on("close", (code) => finish(null, { code, stdout, stderr }));
  });
}
export function parseDeployResult(record, target) {
  requireThat(
    record?.type === "deploy" &&
      record.version === 1 &&
      record.worker_name === target.workerName &&
      /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(
        record.version_id,
      ) &&
      Array.isArray(record.targets),
    "typed deployment result invalid",
  );
  requireThat(
    record.targets.length === 1 &&
      typeof record.targets[0] === "string" &&
      /^[a-z0-9.-]+$/.test(record.targets[0]),
    "unexpected deployment routes/targets",
  );
  return {
    providerDeploymentId: record.version_id,
    stableUrl: validateProviderUrl(target, `https://${record.targets[0]}/`),
    uniqueUrl: null,
    state: "uploaded",
  };
}
export async function invokeProvider(input, { spawn = nodeSpawn } = {}) {
  const {
    policy,
    target,
    operation,
    sourceSha,
    attemptId,
    configPath,
    credential,
    authorization,
  } = input;
  const trusted = resolveTarget(policy, {
    kind: target?.kind,
    environment: target?.environment,
    workflowRef: target?.workflowRef,
    previewName: target?.previewName,
  });
  requireThat(
    canonical(trusted) === canonical(target),
    "target differs from trusted policy",
  );
  requireThat(
    credential &&
      typeof credential.token === "string" &&
      /^[A-Za-z0-9_-]{20,256}$/.test(credential.token) &&
      credential.workerId === target.workerId,
    "missing credential or wrong Worker scope",
  );
  requireThat(
    authorization?.sourceSha === sourceSha &&
      SHA.test(authorization.controlSha) &&
      authorization.validationResult === "success",
    "authoritative validation required",
  );
  const args = providerArguments({
    target,
    operation,
    sourceSha,
    attemptId,
    configPath,
  });
  const config = JSON.parse(await fs.readFile(configPath));
  requireThat(
    canonical(config) ===
      canonical(
        generatedConfig(
          target,
          path.resolve(path.dirname(configPath), "assets"),
        ),
      ),
    "untrusted provider configuration",
  );
  const manifest = await validatePackage(path.dirname(configPath));
  requireThat(manifest.sourceSha === sourceSha, "package/source mismatch");
  const pinned = JSON.parse(
    await fs.readFile(
      path.join(controlRoot, "node_modules/wrangler/package.json"),
    ),
  );
  requireThat(
    pinned.version === "4.147.0",
    "pinned local Wrangler unavailable",
  );
  const cli = path.join(controlRoot, "node_modules/wrangler/bin/wrangler.js");
  const scratch = await fs.mkdtemp(
    path.join(path.dirname(configPath), "provider-"),
  );
  const output = path.join(scratch, "output.jsonl");
  // No inherited HOME, NODE_OPTIONS, npm hooks, auth variables, dotenv discovery, or candidate cwd.
  const env = {
    PATH: path.dirname(process.execPath) + ":/usr/bin:/bin",
    HOME: scratch,
    XDG_CONFIG_HOME: scratch,
    CI: "true",
    WRANGLER_SEND_METRICS: "false",
    WRANGLER_LOG_PATH: path.join(scratch, "wrangler.log"),
    WRANGLER_OUTPUT_FILE_PATH: output,
    CLOUDFLARE_ACCOUNT_ID: target.accountId,
    CLOUDFLARE_API_TOKEN: credential.token,
  };
  try {
    const result = await runProcess(
      process.execPath,
      [cli, ...args],
      { cwd: scratch, env, timeoutMs: 120000 },
      spawn,
    );
    requireThat(
      result.code === 0,
      "provider failed; served state unresolved; reconcile before another mutation",
    );
    if (operation === "cleanup")
      return {
        state: "deleted",
        providerDeploymentId: null,
        stableUrl: null,
        uniqueUrl: null,
      };
    if (operation === "preview") {
      const record = JSON.parse(result.stdout);
      return parsePreviewResult(record, target);
    }
    const records = (await fs.readFile(output, "utf8"))
      .trim()
      .split("\n")
      .map((x) => JSON.parse(x));
    const deploys = records.filter((r) => r.type === "deploy");
    requireThat(
      deploys.length === 1,
      "missing typed deployment record; served state unresolved",
    );
    return parseDeployResult(deploys[0], target);
  } catch {
    throw new Error(
      "Provider mutation did not establish a validated result; served state unresolved. Reconcile the recorded attempt before retrying.",
    );
  } finally {
    await fs.rm(scratch, { recursive: true, force: true });
  }
}
export function parsePreviewResult(record, target) {
  requireThat(
    record?.preview?.name === target.previewName &&
      /^[a-f0-9-]{8,36}$/.test(record.deployment?.id) &&
      Array.isArray(record.preview.urls) &&
      record.preview.urls.length === 1 &&
      Array.isArray(record.deployment.urls) &&
      record.deployment.urls.length === 1,
    "typed preview identity invalid",
  );
  const uniqueUrl = validateProviderUrl(target, record.deployment.urls[0], {
    unique: true,
  });
  requireThat(
    new URL(uniqueUrl).hostname.startsWith(record.deployment.id + "-"),
    "preview deployment ID/URL mismatch",
  );
  return {
    providerDeploymentId: record.deployment.id,
    stableUrl: validateProviderUrl(target, record.preview.urls[0]),
    uniqueUrl,
    state: "uploaded",
  };
}
