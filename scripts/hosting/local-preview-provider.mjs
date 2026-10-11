import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "../prepare-release.mjs";
import { canonical, requireThat, strictFields } from "./release-records.mjs";
import { invokeProvider } from "./provider.mjs";
import { sourceState } from "./validate-local.mjs";
import { localPreviewName } from "./preview-lifecycle.mjs";

// Owner-run credential boundary. No build/install/browser/candidate code is executed here.
async function main(args) {
  const inputs = parseArgs(args, ["--request"]);
  requireThat(
    inputs["--request"] && !inputs.help,
    "explicit trusted request required",
  );
  const root = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../..",
  );
  const request = path.resolve(inputs["--request"]);
  requireThat(
    request.startsWith(path.join(root, ".deploy/local-attempts") + path.sep),
    "request outside local attempts",
  );
  const input = JSON.parse(await fs.readFile(request));
  strictFields(input, [
    "policy",
    "target",
    "operation",
    "sourceSha",
    "attemptId",
    "configPath",
    "authorization",
  ]);
  const policy = JSON.parse(
    await fs.readFile(path.join(root, "hosting/policy.json")),
  );
  requireThat(
    canonical(input.policy) === canonical(policy),
    "request policy differs from trusted control",
  );
  const state = sourceState(root);
  requireThat(
    state.status === "" && state.sha === input.authorization.controlSha,
    "clean pinned control required",
  );
  requireThat(
    input.operation === "preview" &&
      input.target.previewName ===
        localPreviewName(policy.owner, input.sourceSha),
    "source-bound local preview only",
  );
  requireThat(
    path.resolve(input.configPath) ===
      path.join(path.dirname(request), "package/wrangler.json"),
    "config outside recorded attempt",
  );
  const token = process.env.CLOUDFLARE_API_TOKEN;
  delete process.env.CLOUDFLARE_API_TOKEN;
  const result = await invokeProvider({
    ...input,
    credential: { token, workerId: policy.targets.preview.workerId },
  });
  console.log(canonical(result));
}
main(process.argv.slice(2)).catch(() => {
  console.error(
    "Preview provider failed; served state unresolved. Reconcile the recorded attempt before retrying.",
  );
  process.exitCode = 1;
});
