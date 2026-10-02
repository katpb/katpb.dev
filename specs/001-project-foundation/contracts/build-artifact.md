# Contract: Static Build Artifact

## Producer

`npm run build`

## Location and Shape

- Root directory: `dist/`
- Root route document: `dist/index.html`
- Supporting assets: local files referenced by relative or same-origin URLs
- Output type: static HTML, CSS, and assets only

R1 must not emit or require a Worker entry point, server bundle, server-side route, runtime
database, binding, secret, or deployment manifest.

## Completeness

The artifact is complete when:

- `dist/index.html` can be served by the local preview command;
- the foundation page contract passes against that preview;
- all referenced local resources exist within `dist/`;
- no runtime network dependency is necessary to render core content; and
- a static asset host can serve the directory without application server logic.

## Reproducibility

Reproducibility means that both builds contain the same generated files and substantive file
content. R1 tests substantive content with one SHA-256 hash of each generated file's bytes.

Two consecutive builds from clean generated-output states are equivalent when:

1. normalized, sorted relative file paths are identical; and
2. the SHA-256 hash of each matching file's bytes is identical.

Only explicitly identified volatile filesystem metadata—modification times, ownership, and
filesystem permissions—is excluded. Generated file bytes are substantive content, not volatile
metadata.

The comparison must also verify that tracked source has the same state before and after each build.
Pre-existing unrelated working-tree changes are preserved and compared rather than erased.

## Recovery

- The build command replaces stale `dist/` output.
- If a build is interrupted, rerunning the same command is sufficient.
- No manual deletion of `dist/`, `.astro/`, or dependency caches is required.

## Future Cloudflare Boundary

This artifact is deliberately compatible with a later Cloudflare Workers Static Assets
configuration whose asset directory points to `./dist`. R1 does not create that configuration,
install Wrangler or a Cloudflare adapter, or define deployment commands.
