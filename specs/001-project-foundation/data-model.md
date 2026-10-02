# Data Model: R1 Project Foundation

## Scope

R1 has **no persistent application-domain data model**. It introduces no user records, articles,
database, API payloads, sessions, forms, analytics events, cookies, or runtime state.

The structures below are build-time and validation concepts needed to make the foundation
testable. They are not product entities and do not establish the R3 publishing model.

## Build-Time Structures

### Foundation Page

Represents the single statically generated route.

| Field            | Type                      | Rule                                                                     |
| ---------------- | ------------------------- | ------------------------------------------------------------------------ |
| `route`          | Literal `/`               | Unique route in R1.                                                      |
| `language`       | BCP 47 language tag       | Must be present on the document root.                                    |
| `title`          | Non-empty string          | Must identify katpb.dev.                                                 |
| `description`    | Non-empty string          | Must describe the foundation page without future-feature claims.         |
| `siteName`       | Literal `katpb.dev`       | Must be visible in primary content.                                      |
| `statusMessage`  | Non-empty string          | Must state that the project foundation is operational.                   |
| `skipLinkTarget` | Local fragment identifier | Must target the primary content and work by keyboard without JavaScript. |
| `resources`      | List of local paths       | Must not require cross-origin runtime requests.                          |

**Identity**: The canonical identity within R1 is the root route `/`.

**Validation**:

- Exactly one primary heading.
- Semantic HTML and readable core content with JavaScript disabled.
- No personal-data input, authentication, analytics, cookies, external embeds, or placeholder
  future features.
- Page-level accessibility and performance rules are defined in
  [foundation-page.md](./contracts/foundation-page.md).

### Project Configuration

Represents the tracked inputs that determine local and build behavior.

| Field               | Source                              | Rule                                                               |
| ------------------- | ----------------------------------- | ------------------------------------------------------------------ |
| Runtime version     | `.nvmrc`, `package.json`            | Node 24.21.0 acceptance baseline; incompatible tools fail clearly. |
| Dependency graph    | `package.json`, `package-lock.json` | Lockfile must match the manifest and be committed.                 |
| Astro configuration | `astro.config.mjs`                  | Static output, MDX, loopback server, and strict ports only.        |
| Type policy         | `tsconfig.json`                     | Extend Astro's strict configuration.                               |
| Format policy       | `prettier.config.mjs`               | Cover every tracked R1 source/document type.                       |
| Command surface     | `package.json` scripts              | Must match the developer command contract.                         |

**Identity**: The tracked file path uniquely identifies each configuration input.

**Validation**:

- Configuration contains no credentials or machine-specific absolute paths.
- No production adapter, Worker entry point, or deployment command.
- Dependency changes update both dependency manifests.

### Build Artifact Manifest

Ephemeral representation used to compare two production builds.

| Field          | Type                              | Rule                                                  |
| -------------- | --------------------------------- | ----------------------------------------------------- |
| `entries`      | Ordered list                      | Sorted lexicographically by normalized relative path. |
| `entry.path`   | POSIX-style relative path         | Unique within the manifest; must not escape `dist/`.  |
| `entry.sha256` | 64-character lowercase hex string | Hash of file bytes only.                              |

**Identity**: `entry.path` uniquely identifies an artifact file.

**Equality rule**: Two manifests represent the same generated files and substantive content only
when they contain the same paths in the same normalized order and every matching path has the same
SHA-256 value. Only explicitly identified volatile filesystem metadata—timestamps, ownership, and
permissions—is excluded; generated file bytes are substantive content.

### Validation Result

Ephemeral evidence produced by a command or manual acceptance run.

| Field          | Type             | Rule                                                                                       |
| -------------- | ---------------- | ------------------------------------------------------------------------------------------ |
| `check`        | String           | Stable name such as format, diagnostics, browser, accessibility, or build reproducibility. |
| `status`       | `pass` or `fail` | Failure prevents repository health from passing.                                           |
| `environment`  | String/map       | Records applicable runtime, browser, OS, viewport, and throttling details.                 |
| `measurements` | Optional map     | Stores raw/p75 performance values where applicable.                                        |
| `message`      | String           | Names the failed stage and gives actionable recovery when status is `fail`.                |

Validation results are console output or review evidence; R1 does not create a persistent result
store.

## Relationships

```text
Project Configuration
        │
        ├── controls ──> Foundation Page build
        │
        └── controls ──> Validation commands
                              │
Foundation Page source ───────┴──> dist/ files ──> Build Artifact Manifest
                                                        │
                                                        └── compared across two builds
```

## State Transitions

```text
tracked source/config
        │ npm run build
        ▼
fresh static dist/
        │ npm run test:e2e / test:reproducible
        ▼
validated artifact
```

- A new build replaces stale generated output rather than merging with it.
- An interrupted setup returns to a valid state by rerunning `npm ci`.
- An interrupted development, validation, or build command returns to a valid state by rerunning
  the same command.
- Generated output never transitions into tracked source.

## Explicit Non-Entities

The following are intentionally not modeled in R1: article, author, tag, category, publication,
subscriber, account, deployment, Worker binding, analytics event, search document, form
submission, and environment secret.
