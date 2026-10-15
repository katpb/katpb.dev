import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  resolvePreview,
  mutatePreview,
} from "../../scripts/release-orchestrator.mjs";

const policy = JSON.parse(await fs.readFile("hosting/policy.json"));
const sourceSha = "a".repeat(40);
const publicCanary = "T030_PUBLIC_CANARY_NOT_A_SECRET";

// Controlled API fixtures exercise the production resolver and final mutation guard.
// No GitHub/Cloudflare credential, network client, or provider process is used here.
for (const scenario of [
  "fork-with-binding",
  "fork-without-binding",
  "foreign-run-same-repository-pr",
  "same-repository-run-foreign-pr",
  "read",
  "triage",
  "none",
  "non-main-target",
]) {
  test(`T030 ${scenario}: untrusted metadata cannot consume the public canary or mutate a provider`, async (t) => {
    const run = {
      id: 30,
      run_attempt: 1,
      workflow_id: policy.workflow.id,
      name: policy.workflow.name,
      event: "pull_request",
      status: "completed",
      conclusion: "success",
      head_sha: sourceSha,
      head_branch: "t030/untrusted-canary",
      repository: { full_name: policy.repository },
      head_repository: { full_name: policy.repository },
      pull_requests: [{ number: 30 }],
    };
    const pr = {
      number: 30,
      state: "open",
      user: { login: "untrusted-contributor" },
      head: {
        sha: sourceSha,
        ref: run.head_branch,
        repo: { full_name: policy.repository },
      },
      base: { ref: "main", repo: { full_name: policy.repository } },
    };
    if (
      scenario.startsWith("fork") ||
      scenario === "foreign-run-same-repository-pr"
    )
      run.head_repository.full_name = "untrusted/katpb.dev";
    if (
      scenario.startsWith("fork") ||
      scenario === "same-repository-run-foreign-pr"
    )
      pr.head.repo.full_name = "untrusted/katpb.dev";
    if (scenario === "fork-without-binding") run.pull_requests = [];
    if (scenario === "non-main-target") pr.base.ref = "untrusted-target";
    const permission = ["read", "triage", "none"].includes(scenario)
      ? scenario
      : "write";
    const calls = { artifactReads: 0, authorizations: 0, providerMutations: 0 };
    const context = await resolvePreview(
      {
        repository: { full_name: policy.repository, default_branch: "main" },
        workflow_run: run,
      },
      policy,
      {
        controlSha: "b".repeat(40),
        orchestrationRunId: 31,
        orchestrationRunAttempt: 1,
        api: {
          get: async (endpoint) => {
            if (endpoint.endsWith("/actions/runs/30/attempts/1")) return run;
            if (endpoint.endsWith("/pulls/30")) return pr;
            if (endpoint.endsWith("/permission")) return { permission };
            assert.fail("Unexpected metadata read");
          },
          pages: async () => {
            calls.artifactReads++;
            return [{ publicCanary }];
          },
        },
        authorize: async () => {
          calls.authorizations++;
          assert.fail("Untrusted source reached artifact authorization");
        },
      },
    );
    assert.equal(context.state, "skipped-authorization");
    assert.equal(context.source, null);
    assert.equal(context.ci.artifactId, null);
    assert.equal(context.stableVerified, false);
    assert.ok(!JSON.stringify(context).includes(publicCanary));
    // Also exercise the last guard with an attempted advance of the denied record.
    const guarded = await mutatePreview(context, {
      recheck: async () => context.state,
      persist: async () => {},
      upload: async () => {
        calls.providerMutations++;
        assert.fail("Denied source reached provider mutation");
      },
    });
    assert.equal(guarded.state, "skipped-authorization");
    assert.deepEqual(calls, {
      artifactReads: 0,
      authorizations: 0,
      providerMutations: 0,
    });
    t.diagnostic(
      JSON.stringify({
        evidence: "T030 controlled denial",
        scenario,
        ...calls,
      }),
    );
  });
}
