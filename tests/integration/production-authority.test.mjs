import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import ts from "typescript";

const load = async (file) =>
  ts.createSourceFile(
    file,
    await fs.readFile(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
function descendants(node, predicate) {
  const found = [];
  function visit(child) {
    if (predicate(child)) found.push(child);
    ts.forEachChild(child, visit);
  }
  visit(node);
  return found;
}
const calls = (node, name) =>
  descendants(
    node,
    (n) => ts.isCallExpression(n) && n.expression.getText() === name,
  );
const fn = (file, name) =>
  file.statements.find(
    (n) => ts.isFunctionDeclaration(n) && n.name?.text === name,
  );
const stage = (main, name) =>
  descendants(
    main,
    (n) =>
      ts.isIfStatement(n) &&
      ts.isBinaryExpression(n.expression) &&
      n.expression.left.getText() === "stage" &&
      ts.isStringLiteral(n.expression.right) &&
      n.expression.right.text === name,
  )[0]?.thenStatement;

test("archive stages get their exclusive write client from the approved App factory", async () => {
  const file = await load("scripts/hosting/production-runtime.mjs");
  const factory = fn(file, "archiveApi");
  assert.ok(factory);
  assert.equal(calls(factory, "archiveClient").length, 1);
  assert.equal(calls(factory, "mintArchiveToken").length, 1);
  const client = calls(factory, "archiveClient")[0];
  const token = client.arguments[0].properties.find(
    (p) => p.name.getText() === "token",
  ).initializer;
  assert.equal(ts.isAwaitExpression(token), true);
  assert.equal(token.expression.expression.getText(), "mintArchiveToken");
  assert.match(
    factory.getText(),
    /privateKey:\s*process\.env\.R4_ARCHIVE_APP_PRIVATE_KEY/,
  );
  assert.doesNotMatch(factory.getText(), /GH_TOKEN|GITHUB_TOKEN/);
  const main = fn(file, "productionMain");
  assert.equal(calls(main, "archiveApi").length, 2);
  assert.equal(calls(main, "archiveClient").length, 0);
  for (const name of ["archive", "record"]) {
    const block = stage(main, name);
    assert.ok(block);
    const bindings = descendants(
      block,
      (n) => ts.isVariableDeclaration(n) && n.name.getText() === "archive",
    );
    assert.equal(bindings.length, 1);
    assert.equal(bindings[0].initializer.getText(), "await archiveApi()");
    for (const helper of [
      "createProductionArchive",
      "appendArchiveAsset",
      "readProductionArchive",
      "writeArchivedHandoff",
    ]) {
      for (const call of calls(block, helper))
        assert.equal(
          call.arguments[0].getText(),
          "archive",
          `${name}: ${helper}`,
        );
    }
    assert.equal(calls(block, "api.post").length, 0);
    assert.equal(calls(block, "api.upload").length, 0);
    if (name === "archive") {
      assert.equal(calls(block, "createProductionArchive").length, 1);
      assert.equal(calls(block, "appendArchiveAsset").length, 1);
      assert.equal(
        calls(block, "loadProductionHistory")[0]
          .arguments.map((n) => n.getText())
          .join(","),
        "archive,api",
      );
    } else {
      // This includes the actual outcome-append callback passed to recordProduction.
      assert.equal(calls(block, "appendArchiveAsset").length, 1);
      assert.match(
        calls(block, "appendArchiveAsset")[0].arguments[2].getText(),
        /outcome-/,
      );
    }
  }
  assert.equal(
    calls(fn(file, "createProductionArchive"), "api.post").length,
    2,
  );
  assert.equal(calls(fn(file, "appendArchiveAsset"), "api.upload").length, 1);
});

test("ordinary production GitHub-token writes are confined to explicit deployment reporting", async () => {
  const file = await load("scripts/hosting/production-runtime.mjs");
  const main = fn(file, "productionMain");
  const writes = calls(main, "api.post");
  const reporting = ["announce", "report"].flatMap((name) =>
    calls(stage(main, name), "api.post"),
  );
  assert.equal(writes.length, 3);
  assert.deepEqual(writes, reporting);
  for (const call of writes)
    assert.match(call.arguments[0].getText(), /\/deployments/);
  assert.equal(calls(main, "api.upload").length, 0);
  const history = fn(file, "loadProductionHistory");
  assert.equal(calls(history, "reportApi.pages").length, 1);
  assert.equal(calls(history, "reportApi.post").length, 0);
  assert.equal(calls(history, "reportApi.upload").length, 0);
  const environments = fn(file, "validateProductionEnvironments");
  assert.equal(calls(environments, "api.get").length, 1);
  assert.equal(calls(environments, "api.pages").length, 1);
  assert.equal(calls(environments, "api.post").length, 0);
  assert.equal(calls(environments, "api.upload").length, 0);
});
