// Fixed-schema diagnostics only: never echo provider messages or request headers.
export const accountId = "45dcbe7b47e04e1f41dc571ceb86b40e";
export const workerIds = Object.freeze({
  production: "1fe57381f57848dbb722225ef8949ea2",
  preview: "ede742fe3b12494b928f3785441dca6a",
  acceptance: "bc035ed004424484b1151cdda8c437de",
});
const messages = Object.freeze({
  none: "No provider error reported.",
  authentication: "Cloudflare reported an authentication error.",
  authorization: "Cloudflare denied this request.",
  "client-error": "Cloudflare rejected this request.",
  "rate-limit": "Cloudflare rate limited this request.",
  "provider-error": "Cloudflare reported a server error.",
  transport: "The request did not establish a usable response.",
  "response-shape":
    "The successful deployment response did not match the trusted schema.",
  "token-inactive": "Token verification did not establish an active token.",
  preflight: "A trusted provider or state check failed.",
  "preview-hosting": "Preview host, URL or served-package verification failed.",
});
const phases = [
  "before-deployment",
  "during-deployment",
  "after-deployment",
  "unknown",
];
const families = [
  "none",
  "account-token-verification",
  "worker-deployments",
  "worker-settings",
  "worker-subdomain",
  "worker-assets",
  "worker-preview",
];
export function errorCodes(body) {
  return [
    ...new Set(
      (Array.isArray(body?.errors) ? body.errors : [])
        .map((error) => error?.code)
        .filter(
          (code) =>
            Number.isSafeInteger(code) && code >= 1000 && code <= 9999999,
        ),
    ),
  ].slice(0, 16);
}
export function safeCategory(status, codes) {
  if (codes.includes(10000)) return "authentication";
  if (status === 401 || status === 403) return "authorization";
  if (status === 429) return "rate-limit";
  if (status >= 500) return "provider-error";
  if (status >= 400 || codes.length) return "client-error";
  return status === null ? "transport" : "none";
}
export function endpointFamily(endpoint) {
  if (endpoint === "/accounts/" + accountId + "/tokens/verify")
    return "account-token-verification";
  if (endpoint.includes("/assets")) return "worker-assets";
  if (endpoint.includes("/previews")) return "worker-preview";
  if (endpoint.endsWith("/deployments")) return "worker-deployments";
  if (endpoint.endsWith("/settings")) return "worker-settings";
  if (endpoint.endsWith("/subdomain")) return "worker-subdomain";
  return "none";
}
function utc(value) {
  return typeof value === "string" &&
    /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,9})?Z$/.test(value) &&
    Number.isFinite(Date.parse(value))
    ? value
    : null;
}
export function tokenSummary(response) {
  const result = response.body?.result;
  const status =
    response.body?.success === true &&
    ["active", "disabled", "expired"].includes(result?.status)
      ? result.status === "active"
        ? "active"
        : "inactive"
      : "unknown";
  return {
    succeeded:
      response.status >= 200 && response.status < 300 && status === "active",
    status,
    expiresOn: utc(result?.expires_on),
    notBefore: utc(result?.not_before),
    httpStatus: response.status,
    errorCodes: errorCodes(response.body),
  };
}
export function newDiagnostics(input, explicit) {
  const kind = input?.target ?? input?.kind;
  return {
    operation: input?.operation ?? "unknown",
    targetWorkerName: workerIds[kind] ? "katpb-dev-" + kind : null,
    workerPolicyId: workerIds[kind] ?? null,
    provider: "direct-rest",
    wranglerInvoked: false,
    accountId,
    accountIdExplicit: explicit === true,
    endpointFamily: "none",
    method: "GET",
    httpStatus: null,
    errorCodes: [],
    category: "none",
    message: messages.none,
    phase: "before-deployment",
    providerSubprocessExitCode: null,
    opExitCode: null,
    tokenVerification: {
      succeeded: false,
      status: "not-run",
      expiresOn: null,
      notBefore: null,
      httpStatus: null,
      errorCodes: [],
    },
    responseShape: null,
    requests: [],
  };
}
export function recordResponse(d, endpoint, method, response) {
  d.endpointFamily = endpointFamily(endpoint);
  d.method = method;
  d.httpStatus = response?.status ?? null;
  d.errorCodes = errorCodes(response?.body);
  setCategory(d, safeCategory(d.httpStatus, d.errorCodes));
  d.requests.push({
    endpointFamily: d.endpointFamily,
    method,
    httpStatus: d.httpStatus,
    errorCodes: d.errorCodes,
    phase: d.phase,
  });
  if (d.requests.length > 64) throw new Error("diagnostic bound");
}
export function setCategory(d, category) {
  d.category = category;
  d.message = messages[category];
}
function validStatus(value) {
  return (
    value === null || (Number.isInteger(value) && value >= 100 && value <= 599)
  );
}
function validCodes(value) {
  return (
    Array.isArray(value) &&
    value.length <= 16 &&
    value.every(
      (code) => Number.isSafeInteger(code) && code >= 1000 && code <= 9999999,
    )
  );
}
function keys(value, expected) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join(",") === expected.slice().sort().join(",")
  );
}
export function sanitizeDiagnostics(d) {
  const expected = newDiagnostics({}, false);
  const kind = Object.keys(workerIds).find(
    (kind) => d?.targetWorkerName === "katpb-dev-" + kind,
  );
  let valid =
    keys(d, Object.keys(expected)) &&
    [
      "unknown",
      "baseline",
      "own",
      "cross",
      "final",
      "cross-before",
      "cross-after",
      "preview-lifecycle",
      "diagnose-token",
    ].includes(d.operation) &&
    ((kind && d.workerPolicyId === workerIds[kind]) ||
      (d.targetWorkerName === null && d.workerPolicyId === null)) &&
    d.provider === "direct-rest" &&
    d.wranglerInvoked === false &&
    d.accountId === accountId &&
    typeof d.accountIdExplicit === "boolean" &&
    families.includes(d.endpointFamily) &&
    ["GET", "POST", "DELETE"].includes(d.method) &&
    validStatus(d.httpStatus) &&
    validCodes(d.errorCodes) &&
    Object.hasOwn(messages, d.category) &&
    d.message === messages[d.category] &&
    phases.includes(d.phase) &&
    [null, 0, 1].includes(d.providerSubprocessExitCode) &&
    (d.opExitCode === null ||
      (Number.isInteger(d.opExitCode) &&
        d.opExitCode >= 0 &&
        d.opExitCode <= 255));
  const t = d?.tokenVerification;
  valid &&=
    keys(t, [
      "succeeded",
      "status",
      "expiresOn",
      "notBefore",
      "httpStatus",
      "errorCodes",
    ]) &&
    typeof t.succeeded === "boolean" &&
    ["not-run", "active", "inactive", "unknown"].includes(t.status) &&
    (t.expiresOn === null || utc(t.expiresOn) === t.expiresOn) &&
    (t.notBefore === null || utc(t.notBefore) === t.notBefore) &&
    validStatus(t.httpStatus) &&
    validCodes(t.errorCodes);
  valid &&=
    Array.isArray(d.requests) &&
    d.requests.length <= 64 &&
    d.requests.every(
      (r) =>
        keys(r, [
          "endpointFamily",
          "method",
          "httpStatus",
          "errorCodes",
          "phase",
        ]) &&
        families.includes(r.endpointFamily) &&
        ["GET", "POST", "DELETE"].includes(r.method) &&
        validStatus(r.httpStatus) &&
        validCodes(r.errorCodes) &&
        phases.includes(r.phase),
    );
  const shape = d?.responseShape;
  valid &&=
    shape === null ||
    (keys(shape, ["idFormat", "versionsPresent", "versionsMatch"]) &&
      ["uuid", "hex32", "absent", "other"].includes(shape.idFormat) &&
      typeof shape.versionsPresent === "boolean" &&
      typeof shape.versionsMatch === "boolean");
  if (!valid) throw new Error("unsafe diagnostics rejected");
  return JSON.parse(JSON.stringify(d));
}
