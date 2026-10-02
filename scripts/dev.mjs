import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const host = "127.0.0.1";
const defaultPort = 4321;
const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const astroCli = path.join(
  repositoryRoot,
  "node_modules",
  "astro",
  "bin",
  "astro.mjs",
);

function readPort(argumentsList) {
  if (argumentsList.length === 0) {
    return defaultPort;
  }

  let value;

  if (argumentsList[0] === "--port" && argumentsList.length === 2) {
    value = argumentsList[1];
  } else if (
    argumentsList.length === 1 &&
    argumentsList[0].startsWith("--port=")
  ) {
    value = argumentsList[0].slice("--port=".length);
  } else {
    throw new Error("Usage: npm run dev -- --port <free-port>");
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(
      `Invalid port "${value}". Choose an integer from 1 to 65535.`,
    );
  }

  return port;
}

function assertPortAvailable(port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once("error", reject);
    server.listen({ host, port, exclusive: true }, () => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  });
}

let port;

try {
  port = readPort(process.argv.slice(2));
  await assertPortAvailable(port);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);

  if (error && typeof error === "object" && "code" in error) {
    console.error(`Port ${port ?? defaultPort} is unavailable on ${host}.`);
    console.error("Start the development server on another port with:");
    console.error("npm run dev -- --port <free-port>");
  } else {
    console.error(message);
  }

  process.exitCode = 1;
}

if (process.exitCode !== 1) {
  const child = spawn(
    process.execPath,
    [astroCli, "dev", "--ignore-lock", "--host", host, "--port", String(port)],
    {
      cwd: repositoryRoot,
      env: {
        ...process.env,
        ASTRO_TELEMETRY_DISABLED: "1",
      },
      stdio: "inherit",
    },
  );

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, () => {
      child.kill(signal);
    });
  }

  child.once("error", (error) => {
    console.error(`Unable to start Astro: ${error.message}`);
    process.exitCode = 1;
  });

  child.once("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exitCode = code ?? 1;
  });
}
