import assert from "node:assert/strict";
import { once } from "node:events";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

test("development startup fails with actionable guidance when port 4321 is occupied", async () => {
  const occupiedPort = net.createServer();
  occupiedPort.listen(4321, "127.0.0.1");
  await once(occupiedPort, "listening");

  try {
    const child = spawn(process.execPath, ["scripts/dev.mjs"], {
      cwd: repositoryRoot,
      env: {
        ...process.env,
        ASTRO_TELEMETRY_DISABLED: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let output = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk) => {
      output += chunk;
    });

    const [exitCode] = await once(child, "exit");

    assert.notEqual(exitCode, 0);
    assert.match(output, /4321/);
    assert.match(output, /npm run dev -- --port <free-port>/);
  } finally {
    occupiedPort.close();
    await once(occupiedPort, "close");
  }
});
