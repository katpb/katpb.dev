# Theme Contract: R2 — Initial UI

**Branch**: `002-initial-ui` | **Date**: 2026-10-02

Authority: FR-039/041, SC-012/013 in `specs/002-initial-ui/spec.md`.

## Preference and appearance

- Modes are System, Light, Dark. System is default and follows initial and subsequent OS
  appearance. Manual modes override OS changes until the visitor chooses another mode.
- Device key is `katpb.theme`; valid stored manual values are `light` and `dark`. System is
  represented by no override/key. Missing, invalid, or unreadable stored values mean System.
- Root `data-theme` is present only for manual Light/Dark. System removes it. CSS defines light
  defaults and dark `prefers-color-scheme` values only when there is no manual override. Explicit
  manual values take precedence. Native `color-scheme` matches effective appearance.
- Brand token is exactly `#5B1A78` in effective light and `#E6D9FF` in effective dark. Appearance
  changes do not change mark geometry/dimensions, content hierarchy, or metadata.

## Initialization without incorrect-theme flashing

One tiny synchronous Astro `is:inline` script resides in `BaseLayout` head before theme-dependent
style application and rendered body. It guards all access to storage, reads the preference,
validates it, and establishes the manual root attribute before first paint. It performs no fetch,
DOM-size measurement, telemetry, async import, or transition. Invalid data does not block rendering.

CSS System behavior is available without JavaScript. The later bundled component script reads
the initialized root mode, attaches the select handler, sets its selected option, then reveals the
working control. It must not briefly overwrite a saved preference with System during initialization.
No duplicated initializer and no client-router lifecycle are needed.

Acceptance must include opposite-system saved manual modes at direct entry on all four routes.
Inspect built HTML order and root/paint state at the first rendered frame, plus a throttled cold-load
filmstrip. A screenshot taken only after initialization is not evidence that no flash occurred.

## Manual control and retention

- A native select with visible “Theme” label provides text options System, Light, Dark and exposes
  the selected mode. Keyboard and assistive technology can identify and change it; no icon-only cycle.
- Light/Dark updates the root synchronously for the current document and attempts to save the
  matching value. System removes the root override immediately and attempts to remove the key.
- Reserve intended control space during initialization to avoid layout shift. Hide the unbound
  control from display/assistive technology/focus; reveal only when its handler works. With disabled
  JavaScript or initialization failure, show no inactive selector. A brief System explanation is
  permitted but is not required for core navigation.
- Guard obtaining storage, reading, writing, and removal. If read fails, begin System. If retention
  fails, current-document manual changes still work; later navigation/visits cannot be promised to
  retain them. If a failed removal leaves an old valid key, a later document may restore that value;
  do not silently claim successful reset persistence.
- With working retention, every mode survives normal navigation and later visits on the same
  origin/device; System's absent override follows whatever OS preference is then current.
- No cookie, profile identifier, remote transmission, cross-device sync, or third-party resource.

## Required test transitions

Test on every route: fresh light/dark OS, invalid/missing key, System→Light→Dark→System, live OS
change in System, live OS change during each manual override, reload/navigation/later visit,
storage-access/read/write/removal failure, JavaScript disabled in both OS appearances, visible
label/selected option/focus, stable mark dimensions/colors, and absence of initial wrong-theme paint.

Related contracts: `specs/002-initial-ui/contracts/site-ui.md` and
`specs/002-initial-ui/contracts/validation.md`.
