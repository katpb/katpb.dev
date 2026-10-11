import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { parseArgs } from "./prepare-release.mjs";
import {
  SHA,
  canonical,
  requireThat,
  strictFields,
} from "./hosting/release-records.mjs";
import {
  sourceState,
  credentialFreeEnvironment,
} from "./hosting/validate-local.mjs";
import { deleteNamedPreview } from "./hosting/preview-delete-provider.mjs";
import {
  root,
  repo,
  positive,
  apiClient,
  policyFile,
  workflowGuard,
  previewTarget,
  writeJson,
  readJson,
  validateContext,
  markInactive,
  outputs,
  summary,
} from "./hosting/preview-runtime.mjs";

function closed(pr, number, policy) {
  requireThat(
    pr?.number === number &&
      pr.state === "closed" &&
      pr.head?.repo?.full_name === policy.repository &&
      pr.base?.repo?.full_name === policy.repository &&
      pr.base?.ref === "main" &&
      SHA.test(pr.head?.sha),
    "authoritative closed same-repository PR targeting main required",
  );
  return pr;
}
export async function resolveCleanup(number, policy, { read, controlSha }) {
  requireThat(
    positive(number) && SHA.test(controlSha),
    "valid PR and pinned control identity required",
  );
  const pr = closed(await read(), number, policy);
  previewTarget(policy, `pr-${number}`);
  return {
    schemaVersion: 1,
    previewName: `pr-${number}`,
    pullRequest: number,
    sourceSha: pr.head.sha,
    controlSha,
    state: "cleanup-requested",
    inactive: false,
    retryRequired: true,
    capacityReleased: false,
    guidance:
      "Mark closed PR deployments inactive; delete only the named preview under the hosting lock.",
  };
}
export function resolveLocalCleanup(name, policy, controlSha) {
  requireThat(
    /^local-katpb-[a-f0-9]{32}$/.test(name) && SHA.test(controlSha),
    "explicit validated local preview name and control required",
  );
  previewTarget(policy, name);
  return {
    schemaVersion: 1,
    previewName: name,
    pullRequest: null,
    sourceSha: null,
    controlSha,
    state: "cleanup-requested",
    inactive: false,
    retryRequired: true,
    capacityReleased: false,
    guidance:
      "Delete only the explicitly requested local preview; full source identity is unavailable without its original receipt.",
  };
}
export async function performCleanup(
  context,
  policy,
  { read, inactive, remove, persist },
) {
  const c = structuredClone(context);
  previewTarget(policy, c.previewName);
  const recheck = async () => {
    if (c.pullRequest) closed(await read(), c.pullRequest, policy);
    else
      requireThat(
        /^local-katpb-[a-f0-9]{32}$/.test(c.previewName),
        "invalid local cleanup name",
      );
  };
  try {
    await recheck();
    await inactive();
    c.inactive = true;
    c.state = "deleting";
    await persist(c);
    await recheck();
    const deletion = await remove(
      previewTarget(policy, c.previewName),
      recheck,
    );
    requireThat(
      deletion?.absenceVerified === true,
      "named preview absence must be confirmed before releasing quota",
    );
    c.state = "deleted";
    c.retryRequired = false;
    c.capacityReleased = true;
    c.guidance =
      "Named preview absence verified; parent Worker preserved. No production or acceptance operation occurred.";
  } catch {
    c.state = "failed-deletion";
    c.retryRequired = true;
    c.capacityReleased = false;
    c.guidance =
      "Keep quota charged while deletion/absence is unconfirmed; retry only after authoritative closure and scoped permission checks.";
  }
  c.finishedAt = new Date().toISOString();
  await persist(c);
  return c;
}
const directory = path.join(root, ".deploy/cleanup");
async function localMain(name, policy) {
  requireThat(
    !process.env.CLOUDFLARE_API_TOKEN,
    "wrapper must not inherit resolved provider credentials",
  );
  const before = sourceState(root);
  requireThat(
    before.status === "",
    "use a separate clean protected-main control checkout",
  );
  const c = resolveLocalCleanup(name, policy, before.sha);
  const api = apiClient();
  const main = await api.get(`${repo}/git/ref/heads/main`);
  requireThat(
    main.object?.sha === before.sha,
    "exact current protected main required",
  );
  const { lookupProtections } = await import("./hosting/github.mjs");
  await lookupProtections(policy, { token: process.env.GH_TOKEN });
  const lock = path.join(root, ".deploy/r4-hosting.lock");
  await fs.mkdir(path.dirname(lock), { recursive: true });
  await fs.mkdir(lock);
  const folder = path.join(
    root,
    ".deploy/local-cleanup",
    randomBytes(16).toString("hex"),
  );
  const request = path.join(folder, "request.json");
  await writeJson(request, c);
  let confirmed = false;
  try {
    c.state = "deleting";
    await writeJson(path.join(folder, "result.json"), c);
    const result = spawnSync(
      "op",
      [
        "run",
        "--",
        process.execPath,
        path.join(root, "scripts/cleanup-preview.mjs"),
        "--stage",
        "local-provider",
        "--request",
        request,
      ],
      {
        cwd: root,
        env: {
          ...credentialFreeEnvironment(),
          CLOUDFLARE_API_TOKEN: "op://katpb-dev/katpb-r4-preview/credential",
        },
        encoding: "utf8",
        timeout: 180000,
        maxBuffer: 1024 * 1024,
      },
    );
    requireThat(
      result.status === 0 && !result.error,
      "owner cleanup subprocess failed",
    );
    const final = await readJson(path.join(folder, "result.json"));
    requireThat(
      final.state === "deleted" &&
        final.capacityReleased === true &&
        final.previewName === name,
      "cleanup absence receipt required",
    );
    confirmed = true;
    console.log(canonical(final));
  } catch {
    c.state = "failed-deletion";
    c.retryRequired = true;
    c.capacityReleased = false;
    c.guidance =
      "Owner cleanup failed or state is unresolved; inspect this receipt and reconcile before retrying under the retained local lock.";
    await writeJson(path.join(folder, "result.json"), c);
    console.error(canonical(c));
    process.exitCode = 1;
  } finally {
    if (confirmed) await fs.rmdir(lock);
  }
}
async function main(args) {
  const input = parseArgs(args, ["--name", "--stage", "--request"]);
  if (input.help) {
    console.log(
      "deploy:cleanup --name local-katpb-<32-source-sha-hex>\nOwner terminal; clean separate protected-main control checkout; coordinate with hosted runs. Resolves only preview-scoped 1Password reference in a separate masked provider subprocess. Named preview only; no parent Worker deletion. Failure is nonzero and retains retry/quota evidence. Workflow-only stages: resolve|inactive|provider|report.",
    );
    return;
  }
  const policy = await policyFile();
  if (!input["--stage"]) {
    requireThat(
      input["--name"] && !input["--request"],
      "explicit --name required; use --help",
    );
    return localMain(input["--name"], policy);
  }
  requireThat(!input["--name"], "do not mix workflow stages and local names");
  const stage = input["--stage"];
  if (stage === "local-provider") {
    const request = path.resolve(input["--request"] ?? "");
    requireThat(
      request.startsWith(path.join(root, ".deploy/local-cleanup") + path.sep),
      "trusted cleanup request required",
    );
    const c = await readJson(request);
    strictFields(c, [
      "schemaVersion",
      "previewName",
      "pullRequest",
      "sourceSha",
      "controlSha",
      "state",
      "inactive",
      "retryRequired",
      "capacityReleased",
      "guidance",
    ]);
    const current = sourceState(root);
    requireThat(
      current.status === "" && current.sha === c.controlSha,
      "clean pinned control required",
    );
    const authoritative = resolveLocalCleanup(
      c.previewName,
      policy,
      c.controlSha,
    );
    requireThat(
      canonical(c) === canonical(authoritative),
      "untrusted local cleanup request",
    );
    const token = process.env.CLOUDFLARE_API_TOKEN;
    delete process.env.CLOUDFLARE_API_TOKEN;
    const result = await performCleanup(c, policy, {
      read: async () => null,
      inactive: async () => {},
      remove: async (_target, recheck) =>
        deleteNamedPreview({
          policy,
          name: c.previewName,
          controlSha: c.controlSha,
          credential: { token, workerId: policy.targets.preview.workerId },
          recheck,
        }),
      persist: (value) =>
        writeJson(path.join(path.dirname(request), "result.json"), value),
    });
    if (result.state !== "deleted") process.exitCode = 1;
    return;
  }
  requireThat(
    !input["--request"] &&
      ["resolve", "inactive", "provider", "report"].includes(stage),
    "valid workflow stage required",
  );
  const controlSha = await workflowGuard("preview-cleanup.yml", policy);
  const api = apiClient();
  if (stage === "resolve") {
    await outputs({ control_sha: controlSha, eligible: "false" });
    const event = await readJson(process.env.GITHUB_EVENT_PATH);
    requireThat(
      ["pull_request_target", "workflow_dispatch"].includes(
        process.env.GITHUB_EVENT_NAME,
      ),
      "trusted closure or main retry event required",
    );
    if (process.env.GITHUB_EVENT_NAME === "pull_request_target")
      requireThat(event.action === "closed", "closure event required");
    const value =
      process.env.GITHUB_EVENT_NAME === "workflow_dispatch"
        ? event.inputs?.pr_number
        : event.pull_request?.number;
    requireThat(
      /^[1-9]\d*$/.test(String(value)),
      "positive PR number required",
    );
    const number = Number(value);
    const c = await resolveCleanup(number, policy, {
      controlSha,
      read: () => api.get(`${repo}/pulls/${number}`),
    });
    if (process.env.GITHUB_EVENT_NAME === "workflow_dispatch") {
      requireThat(
        /^[a-zA-Z0-9-]{1,39}$/.test(process.env.GITHUB_ACTOR),
        "retry actor required",
      );
      const permission = (
        await api.get(
          `${repo}/collaborators/${process.env.GITHUB_ACTOR}/permission`,
        )
      ).permission;
      requireThat(
        ["write", "maintain", "admin"].includes(permission),
        "writer-authorized cleanup retry required",
      );
    }
    c.orchestrationRunId = Number(process.env.GITHUB_RUN_ID);
    c.orchestrationRunAttempt = Number(process.env.GITHUB_RUN_ATTEMPT);
    c.logUrl = `https://github.com/${policy.repository}/actions/runs/${c.orchestrationRunId}/attempts/${c.orchestrationRunAttempt}`;
    c.startedAt = new Date().toISOString();
    await writeJson(path.join(directory, "context.json"), c);
    await outputs({ eligible: "true" });
    return;
  }
  const c = validateContext(
    await readJson(path.join(directory, "context.json")),
    controlSha,
  );
  const read = () => api.get(`${repo}/pulls/${c.pullRequest}`);
  requireThat(
    c.previewName === `pr-${c.pullRequest}` && positive(c.pullRequest),
    "PR cleanup target binding required",
  );
  if (stage === "inactive") {
    closed(await read(), c.pullRequest, policy);
    await markInactive(c.pullRequest, api);
  } else if (stage === "provider") {
    const token = process.env.CLOUDFLARE_API_TOKEN;
    delete process.env.CLOUDFLARE_API_TOKEN;
    const result = await performCleanup(c, policy, {
      read,
      inactive: async () => {},
      remove: async (_target, recheck) =>
        deleteNamedPreview({
          policy,
          name: c.previewName,
          controlSha,
          credential: { token, workerId: policy.targets.preview.workerId },
          recheck,
        }),
      persist: (value) =>
        writeJson(
          path.join(root, ".deploy/cleanup-provider/result.json"),
          value,
        ),
    });
    if (result.state !== "deleted") process.exitCode = 1;
  } else {
    let result;
    try {
      result = validateContext(
        await readJson(path.join(root, ".deploy/cleanup-provider/result.json")),
        controlSha,
      );
      requireThat(
        result.previewName === c.previewName &&
          result.sourceSha === c.sourceSha,
        "cleanup result identity mismatch",
      );
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
      result = {
        ...c,
        state: "failed-deletion",
        retryRequired: true,
        capacityReleased: false,
        guidance:
          "Provider job or receipt missing; retain quota accounting and retry after closure recheck.",
      };
    }
    const live = await read();
    if (live.state === "closed") {
      closed(live, c.pullRequest, policy);
      await markInactive(c.pullRequest, api);
      result.inactive = true;
    }
    await writeJson(
      path.join(root, ".deploy/cleanup-final/result.json"),
      result,
    );
    await summary(result);
    if (result.state !== "deleted") process.exitCode = 1;
  }
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main(process.argv.slice(2)).catch(() => {
    console.error(
      "Preview cleanup failed; no deletion/absence success established. Check authoritative closure, preview scope and retained retry evidence; use --help.",
    );
    process.exitCode = 1;
  });
