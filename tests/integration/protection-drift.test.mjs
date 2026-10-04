import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  validateOwnerAudit,
  validateRulesetDrift,
  validateMainRules,
} from "../../scripts/hosting/github.mjs";

const audit = JSON.parse(readFileSync("hosting/github-ruleset-audit.json"));
const policy = JSON.parse(readFileSync("hosting/policy.json"));
const live = () =>
  audit.rulesets.map(({ purpose, bypass_actors, ...s }) => structuredClone(s));
const mainRules = () =>
  structuredClone(audit.rulesets.find((s) => s.purpose === "main").rules).map(
    (r) => ({
      ...r,
      ruleset_id: audit.rulesets.find((s) => s.purpose === "main").id,
    }),
  );

test("matching owner-audited revisions are eligible with bypass actors omitted at runtime", () => {
  validateOwnerAudit(audit, policy);
  assert.equal(validateRulesetDrift(live(), audit, policy), true);
  assert.equal(validateMainRules(mainRules(), live(), policy, audit), true);
});

test("changed, missing or unknown ruleset/revision blocks until a new owner audit", () => {
  for (const mutate of [
    (s) => (s[0].updated_at = "2099-01-01T00:00:00Z"),
    (s) => (s[0].updated_at = s[0].updated_at.replace(".667", ".667001")),
    (s) => delete s[0].updated_at,
    (s) => s.pop(),
    (s) => s.push({ ...s[0], id: 123 }),
    (s) => s.push({ ...s[0] }),
    (s) => (s[0].enforcement = "disabled"),
    (s) => (s[0].target = "tag"),
    (s) => (s[0].conditions.ref_name.include = ["refs/heads/*"]),
  ]) {
    const sets = live();
    mutate(sets);
    assert.throws(() => validateRulesetDrift(sets, audit, policy));
  }
});

test("required-check/source and force-push/deletion changes block even with unchanged revision", () => {
  for (const mutate of [
    (s) =>
      (s[0].rules.find(
        (r) => r.type === "required_status_checks",
      ).parameters.required_status_checks[0].context = "other"),
    (s) =>
      (s[0].rules.find(
        (r) => r.type === "required_status_checks",
      ).parameters.required_status_checks[0].integration_id = 1),
    (s) =>
      (s[0].rules = s[0].rules.filter((r) => r.type !== "non_fast_forward")),
    (s) => (s[0].rules = s[0].rules.filter((r) => r.type !== "deletion")),
    (s) => (s[1].rules = s[1].rules.filter((r) => r.type !== "update")),
  ]) {
    const sets = live();
    mutate(sets);
    assert.throws(() => validateRulesetDrift(sets, audit, policy));
  }
  const rules = mainRules();
  rules.pop();
  assert.throws(() => validateMainRules(rules, live(), policy, audit));
});

test("owner audit rejects main or immutable bypass and broadened archive creation exceptions", () => {
  for (const mutate of [
    (a) =>
      (a.rulesets[0].bypass_actors = [
        { actor_type: "Integration", actor_id: 5176510, bypass_mode: "always" },
      ]),
    (a) => delete a.rulesets[0].bypass_actors,
    (a) => (a.rulesets[1].bypass_actors = a.rulesets[2].bypass_actors),
    (a) => (a.rulesets[2].bypass_actors[0].actor_id = 1),
    (a) => a.rulesets[2].rules.push({ type: "update" }),
  ]) {
    const a = structuredClone(audit);
    mutate(a);
    assert.throws(() => validateOwnerAudit(a, policy));
  }
});
