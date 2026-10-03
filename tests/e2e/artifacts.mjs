import { readFileSync, mkdirSync, writeFileSync } from "node:fs";

export const canonicalBrand = readFileSync(
  "specs/002-initial-ui/design/source/brand-mark.svg",
  "utf8",
);

export function builtDocument(route) {
  return readFileSync(`dist${route}index.html`, "utf8");
}

export function saveAudit(file, result) {
  mkdirSync(new URL(".", `file://${file}`), { recursive: true });
  writeFileSync(file, JSON.stringify(result, null, 2));
}
