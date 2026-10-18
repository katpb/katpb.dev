import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { parseArgs } from "./prepare-release.mjs";
import { SHA, requireThat } from "./hosting/release-records.mjs";
import { archiveClient, lookupSource } from "./hosting/github.mjs";
import {
  selectProductionSource,
  readProductionArchive,
} from "./hosting/production-runtime.mjs";
import { repo, policyFile } from "./hosting/preview-runtime.mjs";

export async function requestProduction(
  input,
  {
    api,
    authorize,
    policy,
    actor,
    requestId = randomUUID(),
    sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
    log = console.log,
    maxPolls = 240,
    readArchive = readProductionArchive,
  } = {},
) {
  const sourceSha = input["--source-sha"];
  requireThat(
    Object.keys(input).length === 1 && SHA.test(sourceSha),
    "exact --source-sha required; use --help",
  );
  const main = await api.get(`${repo}/git/ref/heads/main`);
  const source = await selectProductionSource(
    {
      sourceSha,
      actor,
      ref: "refs/heads/main",
      controlSha: main.object?.sha,
      eventName: "workflow_dispatch",
    },
    policy,
    api,
    authorize,
  );
  requireThat(
    source.controlSha === sourceSha,
    "current-main source authority required",
  );
  const workflow = await api.get(`${repo}/actions/workflows/deploy.yml`);
  requireThat(
    workflow.path === ".github/workflows/deploy.yml" &&
      workflow.state === "active" &&
      Number.isSafeInteger(workflow.id),
    "trusted main workflow unavailable",
  );
  const prior = await api.pages(
    `${repo}/actions/workflows/${workflow.id}/runs?event=workflow_dispatch`,
    "workflow_runs",
  );
  const seen = new Set(prior.map((r) => r.id));
  await api.post(`${repo}/actions/workflows/${workflow.id}/dispatches`, {
    ref: "main",
    inputs: {
      operation: "release",
      source_sha: sourceSha,
      request_id: requestId,
    },
  });
  let selected = null;
  for (let n = 0; n < maxPolls; n++) {
    if (!selected) {
      const runs = await api.pages(
        `${repo}/actions/workflows/${workflow.id}/runs?event=workflow_dispatch`,
        "workflow_runs",
      );
      const matches = runs.filter(
        (r) =>
          !seen.has(r.id) &&
          r.display_title === `Production ${sourceSha} request ${requestId}` &&
          r.event === "workflow_dispatch" &&
          r.head_branch === "main" &&
          r.head_sha === sourceSha &&
          r.workflow_id === workflow.id &&
          r.repository?.full_name === policy.repository &&
          r.actor?.login === actor,
      );
      requireThat(
        matches.length <= 1,
        "ambiguous production request; inspect trusted workflow manually",
      );
      if (matches.length) {
        selected = matches[0];
        log(
          `Workflow https://github.com/${policy.repository}/actions/runs/${selected.id}`,
        );
      }
    }
    if (selected) {
      const run = await api.get(`${repo}/actions/runs/${selected.id}`);
      requireThat(
        run.id === selected.id &&
          run.workflow_id === workflow.id &&
          run.head_branch === "main" &&
          run.head_sha === sourceSha &&
          run.event === "workflow_dispatch",
        "followed workflow identity changed",
      );
      if (run.status === "completed") {
        requireThat(
          run.conclusion === "success",
          `Production ${sourceSha} failed or unresolved; inspect workflow ${selected.id} before retrying`,
        );
        const tag = `r4-attempt-${run.id}-${run.run_attempt}`;
        const releases = await api.pages(`${repo}/releases`);
        const release = releases.find((r) => r.tag_name === tag);
        requireThat(
          release,
          "workflow completed without durable production receipt",
        );
        const record = await readArchive(api, release);
        requireThat(
          record.sourceSha === sourceSha && record.outcome === "verified",
          "upload/workflow completion is not durable verified success",
        );
        log(
          `Source ${sourceSha}; target production; verified; archive ${tag}. Hosted HTTPS/browser checks and durable receipt passed.`,
        );
        return { runId: run.id, archiveId: tag, state: "verified" };
      }
    }
    await sleep(5000);
  }
  throw Error(
    `Production result pending; follow ${selected ? `https://github.com/${policy.repository}/actions/runs/${selected.id}` : `https://github.com/${policy.repository}/actions/workflows/deploy.yml`}. Request ${requestId}; do not infer success or dispatch again.`,
  );
}

async function main(args) {
  const input = parseArgs(args, ["--source-sha"]);
  if (input.help) {
    console.log(
      "deploy:production --source-sha <exact-current-main-sha>\nDispatch trusted main workflow and follow durable verified result. Uses GitHub writer authorization; accepts no Cloudflare credentials and performs no local upload.",
    );
    return;
  }
  requireThat(
    Object.keys(input).length === 1 && SHA.test(input["--source-sha"]),
    "exact --source-sha required; use --help",
  );
  requireThat(
    !Object.keys(process.env).some((key) =>
      /CLOUDFLARE.*(?:TOKEN|KEY)|CF_API_(?:TOKEN|KEY)/i.test(key),
    ),
    "local production command rejects provider credentials; remove them before requesting dispatch",
  );
  const token =
    process.env.GH_TOKEN ||
    execFileSync("gh", ["auth", "token"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  const api = archiveClient({ token });
  // /user is intentionally outside the repository-only metadata helper.
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  requireThat(response.ok, "authenticated GitHub writer identity unavailable");
  const actor = (await response.json()).login;
  await requestProduction(input, {
    api,
    policy: await policyFile(),
    actor,
    authorize: (i) => policyFile().then((p) => lookupSource(i, p, { token })),
  });
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main(process.argv.slice(2)).catch((error) => {
    console.error(`Production request failed: ${error.message}`);
    process.exitCode = 1;
  });
