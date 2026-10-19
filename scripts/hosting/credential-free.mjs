// SSH agent socket location is explicitly approved; it contains no credential.
const harmlessVariables = new Set(["SSH_AUTH_SOCK"]);
export function isCredentialFreeEnvironment(env = process.env) {
  return (
    !Object.keys(env).some(
      (name) =>
        !harmlessVariables.has(name) &&
        /TOKEN|SECRET|PRIVATE.?KEY|PASSWORD|AUTH|ACCESS_KEY|CREDENTIAL|^OP_/i.test(
          name,
        ),
    ) && env.NODE_TLS_REJECT_UNAUTHORIZED !== "0"
  );
}
