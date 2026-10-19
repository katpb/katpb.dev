// Controlled, file-backed GitHub archive API substitute. Never contacts GitHub.
// T036 observes transaction fault semantics here; live App/archive authority is
// deliberately unavailable until the owner's later production activation.
import fs from "node:fs/promises";
import path from "node:path";
import { digest, requireThat } from "./release-records.mjs";

export async function acceptanceArchiveStore(root) {
  await fs.mkdir(root, { recursive: false });
  const tags = new Map(),
    releases = [],
    assets = new Map();
  const calls = [];
  let nextAsset = 1;
  const fault = {
    quota: false,
    corrupt: null,
    receiptWrite: false,
    receiptRead: false,
  };
  const api = {
    async post(endpoint, body) {
      calls.push({ operation: "post", endpoint });
      if (endpoint.endsWith("/git/refs")) {
        requireThat(!tags.has(body.ref), "tag exists");
        await fs.writeFile(
          path.join(root, body.ref.split("/").at(-1) + ".tag"),
          body.sha,
          { flag: "wx" },
        );
        tags.set(body.ref, body.sha);
        return {};
      }
      requireThat(
        endpoint.endsWith("/releases") && body.draft === true,
        "draft only",
      );
      const release = {
        id: releases.length + 1,
        tag_name: body.tag_name,
        draft: true,
      };
      await fs.mkdir(path.join(root, String(release.id)));
      await fs.writeFile(
        path.join(root, String(release.id), "release.json"),
        JSON.stringify(release),
        { flag: "wx" },
      );
      releases.push(release);
      assets.set(release.id, []);
      return release;
    },
    async get(endpoint) {
      const name = endpoint.split("/").at(-1);
      requireThat(tags.has("refs/tags/" + name), "tag missing");
      return { object: { type: "commit", sha: tags.get("refs/tags/" + name) } };
    },
    async pages(endpoint) {
      if (endpoint.endsWith("/releases")) return structuredClone(releases);
      const id = Number(endpoint.split("/").at(-2));
      requireThat(assets.has(id), "release missing");
      return structuredClone(assets.get(id));
    },
    async upload(id, name, bytes) {
      calls.push({ operation: "asset-write", release: id, name });
      requireThat(!fault.quota, "controlled archive quota rejection");
      requireThat(
        !(fault.receiptWrite && name.startsWith("outcome-")),
        "controlled receipt append rejection",
      );
      requireThat(
        /^[a-z0-9.-]+$/.test(name) && assets.has(id),
        "asset invalid",
      );
      requireThat(!assets.get(id).some((a) => a.name === name), "asset exists");
      const asset = {
        id: nextAsset++,
        name,
        state: "uploaded",
        size: bytes.length,
        digest: "sha256:" + digest(bytes),
      };
      await fs.writeFile(path.join(root, String(id), name), bytes, {
        flag: "wx",
      });
      await fs.writeFile(
        path.join(root, String(id), name + ".metadata.json"),
        JSON.stringify(asset),
        { flag: "wx" },
      );
      assets.get(id).push(asset);
      return asset;
    },
    async download(id) {
      for (const [release, list] of assets) {
        const asset = list.find((a) => a.id === id);
        if (!asset) continue;
        calls.push({ operation: "asset-read", release, name: asset.name });
        requireThat(
          !(fault.receiptRead && asset.name.startsWith("outcome-")),
          "controlled receipt readback unavailable",
        );
        const bytes = await fs.readFile(
          path.join(root, String(release), asset.name),
        );
        return fault.corrupt === asset.name
          ? Buffer.concat([bytes, Buffer.from("corrupt")])
          : bytes;
      }
      throw Error("asset missing");
    },
  };
  return { api, calls, fault, tags, releases };
}
