import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { parseDeployResult } from "../../scripts/hosting/provider.mjs";

test("Wrangler 4.147.0 structured deploy writer emits full HTTPS workers.dev targets", async () => {
  assert.equal(
    JSON.parse(fs.readFileSync("node_modules/wrangler/package.json")).version,
    "4.147.0",
  );
  const source = fs.readFileSync(
    "node_modules/wrangler/wrangler-dist/cli.js",
    "utf8",
  );
  // Execute the installed pinned provider's target mapping and deploy writer,
  // with only the network mutation and output-file IO replaced. No stdout parsing.
  const mapping = source.match(
    /const targets = completedDeployments\.flatMap[\s\S]*?\n  \);/,
  )[0];
  const deploy = source.slice(
    source.indexOf("async function deploy(props,"),
    source.indexOf("async function deployWorker(props,"),
  );
  const writer = source.slice(
    source.indexOf("function writeOutput(entry)"),
    source.indexOf("function getOutputFilePath()"),
  );
  let output = "";
  const target = {
    kind: "acceptance",
    workerName: "katpb-dev-acceptance",
    subdomain: "fixture",
    previewName: null,
  };
  const id = "12345678-1234-1234-1234-123456789abc";
  const context = vm.createContext({
    completedDeployments: [
      { targets: ["katpb-dev-acceptance.fixture.workers.dev"] },
    ],
    deployWorker: async () => ({
      workerTag: "fixture-tag",
      versionId: id,
      targets: context.targets,
    }),
    outputFilePath: "/fixture/structured.jsonl",
    fs14: {
      mkdirSync() {},
      appendFileSync(_path, bytes) {
        output += bytes;
      },
    },
    path28: { dirname: () => "/fixture" },
  });
  vm.runInContext(
    `${mapping}\nglobalThis.targets = targets;\n${writer}\n${deploy}`,
    context,
  );
  await context.deploy({ name: target.workerName }, {}, {}, {});
  const record = JSON.parse(output);
  assert.deepEqual(record, {
    type: "deploy",
    version: 1,
    worker_name: target.workerName,
    worker_tag: "fixture-tag",
    version_id: id,
    targets: ["https://katpb-dev-acceptance.fixture.workers.dev"],
    worker_name_overridden: false,
    timestamp: record.timestamp,
  });
  assert.ok(Number.isFinite(Date.parse(record.timestamp)));
  assert.deepEqual(parseDeployResult(record, target), {
    providerDeploymentId: id,
    stableUrl: "https://katpb-dev-acceptance.fixture.workers.dev/",
    uniqueUrl: null,
    state: "uploaded",
  });
});

test("deploy acknowledgement rejects altered identity, routes and URL syntax", () => {
  const target = {
    kind: "acceptance",
    workerName: "katpb-dev-acceptance",
    subdomain: "fixture",
    previewName: null,
  };
  const url = "https://katpb-dev-acceptance.fixture.workers.dev";
  const record = {
    type: "deploy",
    version: 1,
    worker_name: target.workerName,
    version_id: "12345678-1234-1234-1234-123456789abc",
    targets: [url],
  };
  for (const targets of [
    [],
    [url, url],
    [url, "example.com/*"],
    [null],
    [url.slice(8)],
    ["https://example.com"],
    [url + "/path"],
    [url + "/a/.."],
    [url + "?"],
    [url + "#"],
    [url + "?q=x"],
    [url + "#fragment"],
    [url + ":443"],
    [url + ":8443"],
    [url.replace("https://", "https://user:pass@")],
    [url.replace("https:", "http:")],
    [" " + url],
    [url + "/\\path"],
  ]) {
    assert.throws(
      () => parseDeployResult({ ...record, targets }, target),
      JSON.stringify(targets),
    );
  }
  for (const patch of [
    { type: "preview" },
    { version: 2 },
    { version: "1" },
    { worker_name: "katpb-dev-production" },
    { version_id: "invalid" },
    { version_id: null },
  ])
    assert.throws(() => parseDeployResult({ ...record, ...patch }, target));
  assert.equal(
    parseDeployResult({ ...record, targets: [url + "/"] }, target).stableUrl,
    url + "/",
  );
});
