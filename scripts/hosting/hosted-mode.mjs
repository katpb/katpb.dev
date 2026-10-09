import { readFileSync } from "node:fs";
import {
  requireThat,
  validateEnvelope,
  parseJson,
} from "./release-records.mjs";
import { allowedHostedHosts } from "./provider.mjs";
import { validateHostedUrl } from "../verify-hosted.mjs";

export function hostedMode(env = process.env) {
  const url = env.R4_HOSTED_URL,
    manifestPath = env.R4_HOSTED_MANIFEST;
  if (!url && !manifestPath) return null;
  requireThat(
    url && manifestPath,
    "hosted mode requires both R4_HOSTED_URL and R4_HOSTED_MANIFEST",
  );
  requireThat(
    !Object.keys(env).some((k) =>
      /TOKEN|SECRET|PRIVATE_KEY|PASSWORD|AUTH|ACCESS_KEY|CREDENTIAL/i.test(k),
    ) && env.NODE_TLS_REJECT_UNAUTHORIZED !== "0",
    "hosted browser must run credential-free with normal TLS verification",
  );
  const policy = parseJson(readFileSync("hosting/policy.json"));
  const base = validateHostedUrl(url, allowedHostedHosts(policy, url));
  const manifest = validateEnvelope(parseJson(readFileSync(manifestPath)));
  return { url: base.href, manifest };
}
