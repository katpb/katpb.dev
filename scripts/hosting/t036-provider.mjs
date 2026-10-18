// Only this owner-spawned child receives the existing acceptance-only token.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { invokeProvider, writeConfig } from "./provider.mjs";
import { requireThat, validatePackage } from "./release-records.mjs";
import { acceptanceOrigin } from "./t036-acceptance.mjs";

export async function acceptanceProvider(
  mode,
  packageDir,
  env = process.env,
  { fetch = globalThis.fetch } = {},
) {
  const check = (value) =>
    requireThat(value, "acceptance provider boundary rejected");
  check(
    env.T036_OWNER_SUBPROCESS === "1" && ["upload", "reject"].includes(mode),
  );
  check(
    path.isAbsolute(packageDir) &&
      packageDir.split(path.sep).includes(".deploy"),
  );
  const policy = JSON.parse(
    await fs.readFile(new URL("../../hosting/policy.json", import.meta.url)),
  );
  check(
    policy.accountId === "45dcbe7b47e04e1f41dc571ceb86b40e" &&
      policy.targets.acceptance.workerName === "katpb-dev-acceptance" &&
      policy.targets.acceptance.workerId === "bc035ed004424484b1151cdda8c437de",
  );
  check(
    typeof env.CLOUDFLARE_API_TOKEN === "string" &&
      /^[A-Za-z0-9_-]{20,256}$/.test(env.CLOUDFLARE_API_TOKEN),
  );
  check(
    !Object.keys(env).some(
      (k) =>
        k !== "CLOUDFLARE_API_TOKEN" &&
        /TOKEN|SECRET|PRIVATE_KEY|PASSWORD|AUTH|ACCESS_KEY|CREDENTIAL/i.test(k),
    ),
  );
  const envelope = await validatePackage(packageDir);
  if (mode === "reject") {
    // Invalid version of this exact acceptance Worker: a real provider rejection,
    // never a request to any production/preview Worker or a permission probe.
    const response = await fetch(
      "https://api.cloudflare.com/client/v4/accounts/45dcbe7b47e04e1f41dc571ceb86b40e/workers/scripts/katpb-dev-acceptance/deployments",
      {
        method: "POST",
        redirect: "error",
        headers: {
          Authorization: "Bearer " + env.CLOUDFLARE_API_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          strategy: "percentage",
          versions: [
            {
              version_id: "00000000-0000-0000-0000-000000000000",
              percentage: 100,
            },
          ],
        }),
        signal: AbortSignal.timeout(15000),
      },
    );
    const body = await response.json();
    check(
      response.status === 400 &&
        body.success === false &&
        Array.isArray(body.errors) &&
        body.errors.length > 0,
    );
    return { state: "rejected", status: response.status };
  }
  const input = {
    kind: "acceptance",
    environment: "production",
    workflowRef: "refs/heads/main",
  };
  // Controlled resets reuse the validated config without overwriting evidence.
  const configFile = path.join(packageDir, "wrangler.json");
  let configuration;
  try {
    await fs.access(configFile);
    configuration = {
      target: (await import("./provider.mjs")).resolveTarget(policy, input),
      configPath: configFile,
    };
  } catch {
    configuration = await writeConfig(policy, input, packageDir);
  }
  const result = await invokeProvider({
    policy,
    ...configuration,
    operation: "deploy",
    sourceSha: envelope.sourceSha,
    attemptId: "1-1",
    credential: {
      token: env.CLOUDFLARE_API_TOKEN,
      workerId: policy.targets.acceptance.workerId,
    },
    authorization: {
      sourceSha: envelope.sourceSha,
      controlSha: envelope.sourceSha,
      validationResult: "success",
    },
  });
  check(result.stableUrl === acceptanceOrigin + "/");
  return {
    state: "uploaded",
    providerDeploymentId: result.providerDeploymentId,
    stableUrl: result.stableUrl,
  };
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  if (process.argv.length !== 4) process.exitCode = 1;
  else
    acceptanceProvider(process.argv[2], process.argv[3])
      .then((r) => console.log(JSON.stringify(r)))
      .catch(() => {
        console.error(
          "Acceptance provider operation failed; no raw diagnostics retained.",
        );
        process.exitCode = 1;
      });
}
