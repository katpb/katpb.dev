# Contract: Developer Commands

## Purpose

This contract defines the stable local command surface for R1. Implementations may change internal
scripts, but contributors must be able to rely on these names, effects, and failure behaviors.

## Supported Environment

- macOS on Apple Silicon (arm64); record the exact tested macOS version during acceptance
- Git
- Node.js 24.21.0 LTS
- npm 11.x
- Initial network access for npm packages and pinned Playwright browsers

R1 acceptance targets macOS on Apple Silicon, but it does not pin support to one macOS release.
Only Node.js is pinned to an exact version; npm remains constrained to its documented major.
Broader operating-system support is not implied.

## Commands

### `npm ci`

**Preconditions**: Compatible Node/npm, a clean checkout, network access or a complete npm cache,
and committed matching `package.json` / `package-lock.json`.

**Success**:

- Installs the exact locked dependency graph.
- Replaces stale or partial `node_modules/`.
- Does not modify `package.json` or `package-lock.json`.
- Can be safely rerun after interruption.

**Failure**: Exits nonzero and identifies an incompatible runtime, lock mismatch, unavailable
dependency, or filesystem problem.

### `npm run test:install`

**Preconditions**: Completed npm setup and initial network access.

**Success**: Installs the Playwright-pinned Chromium and WebKit binaries needed by automated
browser tests. Repeating the command is safe.

### `npm run dev [-- --port <port>]`

**Default endpoint**: `http://127.0.0.1:4321/`

**Success**:

- Starts the Astro development server on loopback.
- Prints the reachable address.
- Reflects application source changes through hot reload without setup or a production build.
- Uses only local project dependencies and assets after setup.

**Port conflict**:

- Exits nonzero instead of choosing another port.
- Identifies the occupied port.
- Prints `npm run dev -- --port <free-port>` as the recovery command.

**Shutdown**: `Ctrl-C` stops the foreground process cleanly.

### `npm run build`

**Success**:

- Performs a full static build into `dist/`.
- Replaces stale generated output.
- Produces a complete, directly servable root page and local assets.
- Does not modify tracked source.
- Uses no network after setup.
- Can be safely rerun after interruption.

**Failure**: Exits nonzero, identifies the failing build stage, and leaves source unchanged. The
recovery action is to rerun the same command after correcting the reported cause.

### `npm run preview [-- --port <port>]`

**Default purpose**: Serves the current `dist/` on loopback for local validation only.

**Contract**: This is not a production server or deployment mechanism. The test suite uses fixed
port 4322 and strict port behavior.

### `npm run format`

Formats supported tracked source and documentation. This is intentionally mutating and is not
invoked by the non-mutating verification entry point.

### `npm run format:check`

Checks formatting without modifying files. Exits nonzero and lists nonconforming files.

### `npm run check`

Runs Astro and TypeScript diagnostics. Warnings and errors fail the command. The command does not
modify tracked source.

### `npm run test:e2e`

Starts the built-site preview on loopback port 4322 and runs pinned Chromium and WebKit projects.
It verifies the page contract, progressive enhancement, representative viewports, local-only
resources, keyboard behavior, and automated WCAG checks.

### `npm run test:workflow`

Runs dependency-free Node integration tests for command behavior, including occupied development
port failure and recovery guidance.

### `npm run test:reproducible`

Treats the existing `dist/` as build one, runs `npm run build` for build two, and compares sorted
normalized relative paths plus one SHA-256 hash of each file's bytes. Matching paths and hashes
represent the same generated files and substantive content. The comparison ignores only explicitly
identified volatile filesystem metadata—timestamps, ownership, and permissions—and fails if
tracked source changes.

### `npm run verify`

The single repository-health entry point runs, in order:

1. formatting check;
2. Astro/TypeScript diagnostics;
3. one production build;
4. browser/accessibility tests;
5. workflow integration tests;
6. reproducibility validation, including the second production build.

Every stage must stop on failure, return a nonzero exit status, and identify the failed command.
On success, the final `dist/` is valid and tracked source is unchanged.

## Offline Contract

After `npm ci` and `npm run test:install` have succeeded once:

- `npm run dev`, `npm run build`, and `npm run verify` must succeed without network access.
- Commands must not install or update packages, invoke version-floating `npx` commands, fetch
  remote content, load remote fonts/scripts, or call external test services.
- Astro telemetry is disabled for project-owned commands.

## Compatibility and Change Control

Renaming or removing a command is a contract change and requires updates to the feature
specification or a later approved specification, README, CONTRIBUTING guide, quickstart, and
applicable tests.
