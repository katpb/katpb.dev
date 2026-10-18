import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { requestProduction } from "../../scripts/request-production.mjs";
import { selectProductionSource } from "../../scripts/hosting/production-runtime.mjs";
import { archiveClient } from "../../scripts/hosting/github.mjs";
const sha = "a".repeat(40),
  requestId = "12345678-1234-1234-1234-123456789abc";
const policy = { repository: "katpb/katpb.dev", workflow: { id: 1 } };
function fixture(changes = {}) {
  const writes = [];
  let polls = 0;
  const run = {
    id: 10,
    run_attempt: 1,
    head_sha: sha,
    head_branch: "main",
    event: "push",
    status: "completed",
    conclusion: "success",
    workflow_id: 1,
    ...changes.run,
  };
  const dispatched = {
    id: 20,
    run_attempt: 1,
    display_title: `Production ${sha} request ${requestId}`,
    head_sha: sha,
    head_branch: "main",
    event: "workflow_dispatch",
    workflow_id: 2,
    repository: { full_name: policy.repository },
    actor: { login: "katpb" },
    status: "completed",
    conclusion: changes.conclusion ?? "failure",
  };
  return {
    writes,
    d: {
      policy,
      actor: "katpb",
      requestId,
      maxPolls: 2,
      sleep: async () => {},
      log: () => {},
      authorize: async (i) => ({ ...i, controlSha: sha }),
      api: {
        get: async (p) => {
          if (p.endsWith("/git/ref/heads/main"))
            return { object: { sha: changes.main ?? sha } };
          if (p.endsWith("/permission"))
            return { permission: changes.permission ?? "write" };
          if (p.endsWith("/actions/workflows/deploy.yml"))
            return {
              id: 2,
              path: ".github/workflows/deploy.yml",
              state: "active",
            };
          if (p.endsWith("/actions/runs/20")) return dispatched;
          return run;
        },
        pages: async (p) => {
          if (p.includes("/ci.yml/runs")) return [run];
          if (p.includes("/artifacts"))
            return [
              {
                id: 9,
                name: `r4-raw-${sha}-10-1`,
                expired: false,
                digest: `sha256:${"b".repeat(64)}`,
              },
            ];
          if (p.endsWith("/releases")) return [];
          return polls++ === 0 ? [] : [dispatched];
        },
        post: async (p, body) => {
          writes.push({ p, body });
        },
      },
    },
  };
}
test("local production command supports help, rejects credentials and unknown inputs", () => {
  for (const [args, env, success] of [
    [["--help"], {}, true],
    [["--token", "x"], {}, false],
    [
      ["--source-sha", sha],
      { CLOUDFLARE_API_TOKEN: "public-canary-never-read" },
      false,
    ],
  ]) {
    const r = spawnSync(
      process.execPath,
      ["scripts/request-production.mjs", ...args],
      { encoding: "utf8", env: { PATH: process.env.PATH, ...env } },
    );
    assert.equal(r.status === 0, success);
    assert.doesNotMatch(r.stdout + r.stderr, /public-canary-never-read/);
  }
});
test("dispatch requires current-main writer and successful eligible exact CI; rejected requests never dispatch", async (t) => {
  for (const changes of [
    { main: "b".repeat(40) },
    { permission: "read" },
    { run: { conclusion: "failure" } },
    { run: { head_branch: "feature" } },
    { run: { event: "workflow_dispatch" } },
  ])
    await t.test(JSON.stringify(changes), async () => {
      const f = fixture(changes);
      await assert.rejects(requestProduction({ "--source-sha": sha }, f.d));
      assert.equal(f.writes.length, 0);
    });
  const f = fixture();
  await assert.rejects(
    selectProductionSource(
      {
        sourceSha: sha,
        actor: "katpb",
        ref: "refs/heads/feature",
        controlSha: sha,
        eventName: "workflow_dispatch",
      },
      policy,
      f.d.api,
      f.d.authorize,
    ),
  );
  assert.equal(f.writes.length, 0);
});
test("wrapper dispatches trusted main, correlates exact request, shows workflow and rejects non-verified completion", async () => {
  for (const conclusion of ["failure", "success"]) {
    const f = fixture({ conclusion });
    const logs = [];
    f.d.log = (v) => logs.push(v);
    await assert.rejects(
      requestProduction({ "--source-sha": sha }, f.d),
      conclusion === "success"
        ? /durable production receipt/
        : /failed or unresolved/,
    );
    assert.equal(f.writes.length, 1);
    assert.equal(f.writes[0].body.ref, "main");
    assert.equal(f.writes[0].body.inputs.source_sha, sha);
    assert.equal(f.writes[0].body.inputs.request_id, requestId);
    assert.match(logs[0], /actions\/runs\/20/);
    assert.ok(!logs.some((l) => l.includes("; verified;")));
  }
});
test("archive API supports empty dispatch response and strips credentials from download redirects", async () => {
  const calls = [];
  const api = archiveClient({
    token: "public-canary",
    fetch: async (url, options) => {
      calls.push({ url: String(url), options });
      if (String(url).includes("dispatches"))
        return new Response(null, { status: 204 });
      if (String(url).includes("api.github.com"))
        return new Response(null, {
          status: 302,
          headers: {
            location:
              "https://release-assets.githubusercontent.com/blob?signature=opaque",
          },
        });
      return new Response(Buffer.from("bytes"));
    },
  });
  assert.equal(
    await api.post("/repos/katpb/katpb.dev/actions/workflows/2/dispatches", {
      ref: "main",
    }),
    null,
  );
  assert.equal((await api.download(1)).toString(), "bytes");
  assert.equal(calls.at(-1).options.headers, undefined);
});

test("wrapper shows final verified result only after reading exact attempt archive", async () => {
  const f = fixture({ conclusion: "success" });
  const logs = [];
  f.d.log = (line) => logs.push(line);
  const pages = f.d.api.pages;
  f.d.api.pages = async (p) =>
    p.endsWith("/releases")
      ? [{ id: 5, tag_name: "r4-attempt-20-1" }]
      : pages(p);
  let reads = 0;
  f.d.readArchive = async (api, release) => {
    reads++;
    assert.equal(api, f.d.api);
    assert.equal(release.tag_name, "r4-attempt-20-1");
    return { sourceSha: sha, outcome: "verified" };
  };
  const r = await requestProduction({ "--source-sha": sha }, f.d);
  assert.equal(reads, 1);
  assert.equal(r.state, "verified");
  assert.match(logs.at(-1), /target production; verified/);
});
test("environment preflight rejects absent, unprotected, wildcard or reviewed ordinary environments", async () => {
  const { validateProductionEnvironments } =
    await import("../../scripts/hosting/production-runtime.mjs");
  const api = {
    get: async (p) => ({
      name: p.split("/").at(-1),
      can_admins_bypass: false,
      deployment_branch_policy: {
        protected_branches: false,
        custom_branch_policies: true,
      },
      protection_rules: [],
    }),
    pages: async () => [{ name: "main", type: "branch" }],
  };
  await validateProductionEnvironments(api);
  await assert.rejects(
    validateProductionEnvironments({
      ...api,
      get: async () => {
        throw Error("404");
      },
    }),
  );
  await assert.rejects(
    validateProductionEnvironments({
      ...api,
      pages: async () => [{ name: "*", type: "branch" }],
    }),
  );
  await assert.rejects(
    validateProductionEnvironments({
      ...api,
      pages: async () => [{ name: "main", type: "tag" }],
    }),
  );
  await assert.rejects(
    validateProductionEnvironments({
      ...api,
      get: async (p) => ({ ...(await api.get(p)), can_admins_bypass: true }),
    }),
  );
  await assert.rejects(
    validateProductionEnvironments({
      ...api,
      get: async (p) => ({
        ...(await api.get(p)),
        protection_rules: [{ type: "required_reviewers" }],
      }),
    }),
  );
});
