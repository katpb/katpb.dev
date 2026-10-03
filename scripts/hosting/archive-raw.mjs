import fs from "node:fs/promises";
import {
  canonical,
  digest,
  requireThat,
  scanFiles,
  encodeArchive,
} from "./release-records.mjs";
import { sourceState } from "./validate-local.mjs";

try {
  requireThat(process.argv.length === 2, "archive-raw accepts no arguments");
  const evidence = JSON.parse(await fs.readFile(".deploy/validation.json"));
  const state = sourceState();
  requireThat(
    evidence.sourceSha === state.sha &&
      state.status === "" &&
      evidence.validationResult === "success" &&
      evidence.clean === true,
    "exact clean successful validation required",
  );
  const raw = await scanFiles("dist");
  requireThat(
    digest(raw.entries) === evidence.rawDigest,
    "raw digest differs from validation",
  );
  await fs.mkdir(".deploy/handoff");
  await fs.writeFile(".deploy/handoff/raw.tar", encodeArchive(raw.files), {
    flag: "wx",
  });
  await fs.writeFile(
    ".deploy/handoff/raw-manifest.json",
    canonical(raw.entries) + "\n",
    { flag: "wx" },
  );
  await fs.writeFile(
    ".deploy/handoff/provenance.json",
    canonical(evidence) + "\n",
    { flag: "wx" },
  );
  console.log(
    `Raw handoff ${evidence.sourceSha}; digest ${evidence.rawDigest}; no provider credentials or configuration.`,
  );
} catch {
  console.error(
    "Raw handoff failed: exact clean validation or archive inputs invalid. Re-run the complete credential-free gate.",
  );
  process.exitCode = 1;
}
