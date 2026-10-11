import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { generatedConfig, providerArguments } from "./provider.mjs";
import { canonical, requireThat, SHA } from "./release-records.mjs";
import { root, previewTarget } from "./preview-runtime.mjs";

// Cleanup deliberately has no package/build dependency: expired CI artifacts cannot
// authorize a Worker deletion or prevent safe removal of an authoritative closed PR.
export async function deleteNamedPreview(
  { policy, name, controlSha, credential, recheck },
  dependencies = {},
) {
  const target = previewTarget(policy, name);
  requireThat(
    SHA.test(controlSha) &&
      credential?.workerId === target.workerId &&
      typeof credential.token === "string" &&
      /^[A-Za-z0-9_-]{20,256}$/.test(credential.token),
    "preview-only cleanup credential/control required",
  );
  const pinned = JSON.parse(
    await fs.readFile(path.join(root, "node_modules/wrangler/package.json")),
  );
  requireThat(pinned.version === "4.147.0", "pinned Wrangler required");
  const parent = path.join(root, ".deploy/cleanup-provider");
  await fs.mkdir(parent, { recursive: true });
  const scratch = await fs.mkdtemp(path.join(parent, "attempt-"));
  const configPath = path.join(scratch, "wrangler.json");
  try {
    await fs.mkdir(path.join(scratch, "assets"));
    await fs.writeFile(
      configPath,
      canonical(generatedConfig(target, path.join(scratch, "assets"))) + "\n",
      { flag: "wx", mode: 0o600 },
    );
    const args = providerArguments({
      target,
      operation: "cleanup",
      sourceSha: controlSha,
      attemptId: "1-1",
      configPath,
    });
    const env = {
      PATH: path.dirname(process.execPath) + ":/usr/bin:/bin",
      HOME: scratch,
      XDG_CONFIG_HOME: scratch,
      CI: "true",
      WRANGLER_SEND_METRICS: "false",
      WRANGLER_LOG_PATH: path.join(scratch, "provider.log"),
      CLOUDFLARE_ACCOUNT_ID: target.accountId,
      CLOUDFLARE_API_TOKEN: credential.token,
    };
    // This authoritative read is last, after config/pinned-tool setup, just before mutation.
    await recheck();
    const execute =
      dependencies.execute ??
      (async () =>
        new Promise((resolve, reject) => {
          const child = spawn(
            process.execPath,
            [path.join(root, "node_modules/wrangler/bin/wrangler.js"), ...args],
            {
              cwd: scratch,
              env,
              shell: false,
              stdio: ["ignore", "ignore", "ignore"],
            },
          );
          const timer = setTimeout(() => {
            child.kill("SIGTERM");
            setTimeout(() => child.kill("SIGKILL"), 1000).unref();
            reject(Error("cleanup timeout"));
          }, 120000);
          child.on("error", () => {
            clearTimeout(timer);
            reject(Error("cleanup unavailable"));
          });
          child.on("close", (code) => {
            clearTimeout(timer);
            code === 0 ? resolve() : reject(Error("cleanup failed"));
          });
        }));
    // Read only this exact named preview, never a Worker/route/DNS endpoint.
    const inspect = async () => {
      const response = await (dependencies.fetch ?? fetch)(
        `https://api.cloudflare.com/client/v4/accounts/${target.accountId}/workers/workers/${target.workerName}/previews/${name}`,
        {
          redirect: "error",
          signal: AbortSignal.timeout(15000),
          headers: { Authorization: `Bearer ${credential.token}` },
        },
      );
      const text = await response.text();
      requireThat(
        text.length <= 1024 * 1024,
        "cleanup response bound exceeded",
      );
      const body = JSON.parse(text);
      if (
        response.status === 404 &&
        body.success === false &&
        body.errors?.some((e) => e.code === 10025)
      )
        return "absent";
      requireThat(
        response.ok && body.success === true && body.result?.name === name,
        "named-preview state unavailable",
      );
      return "present";
    };
    if ((await inspect()) === "absent")
      return { state: "deleted", absenceVerified: true };
    await recheck();
    await execute({ args, env, cwd: scratch, target });
    requireThat(
      (await inspect()) === "absent",
      "named-preview absence not established",
    );
    return { state: "deleted", absenceVerified: true };
  } catch {
    throw Error(
      "Named preview cleanup failed or absence is unresolved; retain inactive state and retry guidance.",
    );
  } finally {
    await fs.rm(scratch, { recursive: true, force: true });
  }
}
