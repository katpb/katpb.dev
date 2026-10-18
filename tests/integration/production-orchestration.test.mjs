import test from "node:test";
import assert from "node:assert/strict";
import {
  mutateProduction,
  verifyProduction,
  recordProduction,
} from "../../scripts/release-orchestrator.mjs";
const c = {
  archiveId: "r4-attempt-10-1",
  attemptId: "10-1",
  sourceSha: "a".repeat(40),
  packageDigest: "b".repeat(64),
  previousKnownGoodArchiveId: "r4-attempt-9-1",
};
function fixture(fail) {
  const calls = [];
  const step = (name, value) => async () => {
    calls.push(name);
    if (fail === name) throw Error("controlled");
    return value;
  };
  return {
    calls,
    d: {
      archivedPackage: step("archive"),
      configure: step("config"),
      recheck: step("live-main"),
      upload: step("upload", {
        providerDeploymentId: "version",
        stableUrl: "https://example.test",
      }),
      persist: step("persist"),
    },
  };
}
test("production re-downloads archived bytes and checks live-main immediately before upload", async () => {
  const { calls, d } = fixture();
  const result = await mutateProduction(c, d);
  assert.equal(result.state, "uploaded");
  assert.deepEqual(calls, [
    "archive",
    "config",
    "live-main",
    "upload",
    "persist",
  ]);
  assert.equal(result.previousKnownGoodArchiveId, c.previousKnownGoodArchiveId);
});
test("archive/integrity/configuration/live-main rejection makes zero provider mutations", async (t) => {
  for (const stage of ["archive", "config", "live-main"])
    await t.test(stage, async () => {
      const { calls, d } = fixture(stage);
      const result = await mutateProduction(c, d);
      assert.equal(result.state, "not-uploaded");
      assert.equal(
        result.previousKnownGoodArchiveId,
        c.previousKnownGoodArchiveId,
      );
      assert.equal(calls.includes("upload"), false);
    });
});
test("uncertain upload and failed result recording never imply verified success", async () => {
  const f = fixture("upload");
  assert.equal((await mutateProduction(c, f.d)).state, "unresolved");
  const p = fixture("persist");
  await assert.rejects(mutateProduction(c, p.d));
});
test("credential-free HTTPS/browser checks precede durable receipt and success", async (t) => {
  const uploaded = { ...c, state: "uploaded", providerDeploymentId: "version" };
  for (const fail of [null, "https", "browser"])
    await t.test(String(fail), async () => {
      const calls = [];
      const step = (n) => async () => {
        calls.push(n);
        if (fail === n) throw Error("controlled");
      };
      const checked = await verifyProduction(uploaded, {
        https: step("https"),
        browser: step("browser"),
        persist: step("persist"),
      });
      const recorded = await recordProduction(c, {
        provider: uploaded,
        verification: checked,
        providerJob: "success",
        verifyJob: fail ? "failure" : "success",
        append: step("append"),
        readback: async () => {
          calls.push("readback");
          return fail ? "unresolved" : "verified";
        },
        persist: step("final"),
      });
      assert.equal(recorded.state, fail ? "unresolved" : "verified");
      assert.ok(calls.indexOf("append") < calls.indexOf("readback"));
      assert.ok(calls.indexOf("readback") < calls.indexOf("final"));
    });
});
test("missing upload/checks, append failure and readback failure preserve previous known-good", async () => {
  const uploaded = { ...c, state: "uploaded", providerDeploymentId: "version" };
  const verification = {
    ...uploaded,
    state: "checks-passed",
    checks: { https: true, browser: true },
  };
  for (const [provider, check] of [
    [null, verification],
    [uploaded, null],
    [null, null],
  ]) {
    let final;
    await recordProduction(c, {
      provider,
      verification: check,
      providerJob: "success",
      verifyJob: "success",
      append: async (r) => {
        final = r;
      },
      readback: async () => "unresolved",
      persist: async () => {},
    });
    assert.equal(final.state, "unresolved");
    assert.equal(
      final.previousKnownGoodArchiveId,
      c.previousKnownGoodArchiveId,
    );
  }
  for (const failure of ["append", "readback"]) {
    let persisted = false;
    await assert.rejects(
      recordProduction(c, {
        provider: uploaded,
        verification,
        providerJob: "success",
        verifyJob: "success",
        append: async () => {
          if (failure === "append") throw Error("write");
        },
        readback: async () => "unresolved",
        persist: async () => {
          persisted = true;
        },
      }),
    );
    assert.equal(persisted, false);
  }
});

test("failed hosted verification preserves its exact failed stage in durable outcome", async () => {
  const provider = { ...c, state: "uploaded", providerDeploymentId: "version" };
  const verification = {
    ...provider,
    state: "unresolved",
    failedStage: "browserChecks",
    checks: { https: true, browser: false },
    stages: { httpsSmoke: "success", browserChecks: "failure" },
  };
  const final = await recordProduction(c, {
    provider,
    verification,
    providerJob: "success",
    verifyJob: "failure",
    append: async () => {},
    readback: async () => "unresolved",
    persist: async () => {},
  });
  assert.equal(final.failedStage, "browserChecks");
  assert.equal(final.checks.https, true);
});
