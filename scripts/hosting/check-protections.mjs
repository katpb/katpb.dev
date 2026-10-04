import fs from "node:fs/promises";
import { lookupProtections } from "./github.mjs";

try {
  if (process.argv.length !== 2)
    throw new Error("protection check takes no arguments");
  const policy = JSON.parse(
    await fs.readFile(
      new URL("../../hosting/policy.json", import.meta.url),
      "utf8",
    ),
  );
  const { observation } = await lookupProtections(policy, {
    token: process.env.GH_TOKEN,
  });
  await fs.mkdir(".deploy/handoff", { recursive: true });
  await fs.writeFile(
    ".deploy/handoff/runtime-protection.json",
    JSON.stringify(observation) + "\n",
  );
  console.log(JSON.stringify(observation));
} catch (error) {
  console.error(`Protection drift check blocked: ${error.message}`);
  process.exitCode = 1;
}
