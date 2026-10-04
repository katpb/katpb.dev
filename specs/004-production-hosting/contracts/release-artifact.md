# Contract: R4 Release Artifact and Static Delivery

## Producers and inputs

R1 produces `dist/` with `npm run verify`. R4 preparation reads this output without altering it
and writes ignored `.deploy/`. Inputs are the selected source SHA, raw output/manifest, trusted
control revision/policy, and a hash-validated historical immutable-asset manifest for production.
All inputs must be explicit; time, target, actor, and run ID do not enter static file bytes.

## Package shape

```text
.deploy/
├── raw/                         # Exact validated dist/ copy
├── assets/                      # Selected raw files plus historical immutable assets
│   ├── index.html
│   ├── _astro/                  # When real fingerprinted assets exist
│   ├── _headers                 # Trusted provider delivery policy
│   └── __release.json           # Deterministic public revision identity
├── raw-manifest.json
├── package-manifest.json
├── retained-manifest.json
├── provenance.json
└── wrangler.json                # Trusted generated config; outside served directory
```

Only `assets/` is uploaded. Manifests, provenance, and operational receipts remain outside it.
The package-manifest envelope includes schema version, source SHA, raw digest, packaging-policy
digest, retained-input digest, and the expected marker fields. The verifier can therefore resolve
expected identity from the manifest without trusting the currently served marker.
Manifest entries use normalized POSIX relative paths, sizes, and SHA-256 hashes in lexical
order. Digests hash canonical JSON. Ignore only R1-permitted filesystem metadata, never file
bytes. Packaging the same raw input, retained input, and policy twice must match exactly.

Reserve raw `_headers`, `_redirects`, `_worker.js`, `__release.json`, `.git`, environment files,
and Wrangler configuration paths; reject them at the boundary. Future approved features needing
provider controls must extend the trusted contract explicitly. Never honor artifact configuration,
dependency manifests, install hooks, shell commands, or executable flags. Validate all archive
entries before extraction and enforce regular-file, size, count, and collision constraints.

## Release identity

`/__release.json` is schema-versioned JSON containing only `schemaVersion`, `sourceSha`, and
`rawDigest`. It has no time, target, initiator, token, account diagnostic, or other secret data.
Reject a candidate already using the reserved path. Root HTML remains the exact R1 build bytes.
Hosted checks require both expected marker identity and exact root-document hash, so a matching
marker alone cannot certify incorrect HTML. Raw/page identity remains useful after later R2 changes.

## Immutable assets and recovery

Only genuinely generated, content-versioned `/_astro/` paths qualify as immutable. Disallow
unprocessed `public/_astro/` inputs and verify unchanged immutable addresses always have identical
bytes. Repeated immutable path with different hash is a pre-upload error.

Production preparation copies the chosen raw artifact, then adds the latest archived immutable
union. Add new immutable files before archiving the attempt and never replace old immutable
bytes. Recovery uses an older verified raw artifact with the newest union, including files from
failed or unresolved candidates. It never restores an old package's obsolete aggregate as the
entire current package. Old HTML and mutable public assets are not retained as active pages.

No automatic pruning. Count historical retained assets in quota checks and fail before mutation
if limits would be exceeded. The archive and retention chain must be complete; missing history
cannot be treated as an empty first release. A genuine first release has an explicit null predecessor.

## Trusted provider configuration

Generate an explicit assets-only JSON configuration from protected-main policy. Set the exact
allowlisted Worker/account, `compatibility_date: 2026-10-02`, `workers_dev: true`, asset directory,
`assets.html_handling: auto-trailing-slash`, and `assets.not_found_handling: none`. Preview config
includes `previews: {}`. No application `main`, custom routes/domains, build hooks, runtime
bindings, or secrets. Execute the local pinned Wrangler binary from the trusted workspace with
this config; candidate files never control discovery or process arguments.

The provider-managed no-op used for an assets-only deployment is infrastructure, not an
application backend or an Astro server artifact.

## HTTP delivery

| Resource                            | Required behavior                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------------- |
| `/`                                 | HTTPS 200, `text/html`, expected exact root bytes and readable foundation content.    |
| `/__release.json`                   | HTTPS 200, JSON type, expected SHA/raw digest, freshness revalidation.                |
| Generated fingerprinted `/_astro/*` | Correct MIME/hash, `public, max-age=31536000, immutable`.                             |
| HTML and non-versioned assets       | `public, max-age=0, must-revalidate` and ETag or equivalent verified freshness check. |
| Missing page/asset                  | Genuine 404, no fallback 200, no secret/stack trace.                                  |
| Technical preview/production URLs   | Noindex during R4 technical acceptance.                                               |

Author only the immutable cache override; preserve the provider's default freshness for all
other assets. `_headers` may also set noindex, nosniff, and a conservative referrer policy.
Avoid overlapping cache rules, since repeated header values can be combined. Every resource
receiving immutable caching must satisfy the immutable manifest contract.

## Hosted verification

Use normal TLS certificate validation and the allowlisted HTTPS hostname. Require exact marker
and root identity, referenced local HTML/CSS assets recursively including srcset/import/url
references, expected types and hashes, and no HTTP/cross-origin resource dependency. Resolve
relative URLs safely against the document and asset origins; reject traversal or forbidden
redirects. Check missing paths with a nonce known absent from the manifest.

Check immutable headers, unchanged asset reuse, HTML/mutable ETag revalidation, and freshness
after a release and recovery. Conditional GET requires 304 and the same valid opaque ETag,
using HTTP weak comparison (RFC 9110 sections 8.8.3.2 and 13.1.2). Only when HTML has no ETag,
the equivalent freshness check is a bounded second full GET with `Cache-Control: no-cache`
and `Pragma: no-cache`, requiring 200, exact manifest bytes/hash, HTML MIME and all required
freshness/security headers. Missing validators on other mutable assets, malformed validators,
changed validators and unsuccessful conditional responses remain failures.
A credential-free browser job checks rendering, JavaScript-disabled
readability, requests, and applicable R1 accessibility expectations. No certificate bypass,
credential-bearing browser execution, or dynamic health endpoint is allowed.

Use bounded request/total deadlines and retries, reporting attempted URLs, revision, stage,
expected/observed non-secret identity, and next action. Never swallow a failed check.
