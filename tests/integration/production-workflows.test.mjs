import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { parse } from "yaml";

test("production workflow isolates exact permissions, environments, credentials and candidate data", async () => {
  const w = parse(await fs.readFile(".github/workflows/deploy.yml", "utf8"));
  assert.deepEqual(w.permissions, {});
  assert.deepEqual(w.concurrency, {
    group: "r4-hosting",
    "cancel-in-progress": false,
    queue: "max",
  });
  assert.deepEqual(w.on.workflow_dispatch.inputs.operation.options, [
    "release",
  ]);
  assert.equal(w.on.workflow_dispatch.inputs.source_sha.required, true);
  assert.match(
    w.jobs.production_prepare.if,
    /github.ref == 'refs\/heads\/main'/,
  );
  assert.match(w.jobs.production_prepare.if, /workflow_run.event == 'push'/);
  assert.match(
    w.jobs.production_prepare.if,
    /workflow_run.conclusion == 'success'/,
  );
  const production = Object.entries(w.jobs).filter(([n]) =>
    n.startsWith("production_"),
  );
  assert.deepEqual(
    production
      .filter(([, j]) => j.permissions.contents === "write")
      .map(([n]) => n),
    ["production_archive", "production_record"],
  );
  assert.deepEqual(
    production
      .filter(([, j]) => j.permissions.deployments === "write")
      .map(([n]) => n),
    ["production_announce", "production_report"],
  );
  assert.deepEqual(
    production
      .filter(([, j]) => j.environment?.name === "production")
      .map(([n]) => n),
    ["production_provider"],
  );
  assert.deepEqual(
    production
      .filter(([, j]) => JSON.stringify(j).includes("CLOUDFLARE_API_TOKEN"))
      .map(([n]) => n),
    ["production_provider"],
  );
  assert.deepEqual(
    production
      .filter(([, j]) =>
        JSON.stringify(j).includes("R4_ARCHIVE_APP_PRIVATE_KEY"),
      )
      .map(([n]) => n),
    ["production_archive", "production_record"],
  );
  for (const [name, j] of production) {
    assert.equal(j.env, undefined);
    const checkout = j.steps.find((s) =>
      s.uses?.startsWith("actions/checkout@"),
    );
    assert.equal(checkout.with["persist-credentials"], false);
    assert.equal(
      checkout.with.ref,
      name === "production_prepare"
        ? "refs/heads/main"
        : "${{ needs.production_prepare.outputs.control_sha }}",
    );
    const text = JSON.stringify(j);
    assert.doesNotMatch(
      text,
      /acceptance|secrets\.(?:PREVIEW|ACCEPTANCE)|npx|routes:|custom_domain|dns|certificate/i,
    );
    for (const step of j.steps) {
      if (step.uses) assert.match(step.uses, /^actions\/[a-z-]+@[a-f0-9]{40}$/);
      if (step.env?.CLOUDFLARE_API_TOKEN) {
        assert.equal(name, "production_provider");
        assert.match(step.run, /--production-stage provider$/);
      }
      if (step.env?.R4_ARCHIVE_APP_PRIVATE_KEY)
        assert.ok(["production_archive", "production_record"].includes(name));
      if (step.run?.includes("npm ci")) {
        assert.match(step.run, /--ignore-scripts/);
        assert.equal(step.env, undefined);
      }
    }
    if (name === "production_verify") {
      assert.equal(j.environment, undefined);
      assert.doesNotMatch(text, /secrets\.|GH_TOKEN|CLOUDFLARE|PRIVATE_KEY/);
    }
  }
  assert.ok(w.jobs.production_provider.needs.includes("production_archive"));
  assert.ok(w.jobs.production_report.needs.includes("production_record"));
  assert.match(w.jobs.production_record.if, /always\(\)/);
});
