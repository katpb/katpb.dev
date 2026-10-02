# Contract: Foundation Page

## Endpoint

`GET /` on the local development or preview server.

## Successful Response

- HTTP status 200.
- HTML document with a declared language, non-empty title, and non-empty description.
- Visible `katpb.dev` identity.
- One primary heading.
- Visible statement that the project foundation is operational.
- Keyboard-operable in-page skip link targeting the primary content.
- Semantic document landmarks and a logical reading order.
- Core content fully present in the server/build-produced HTML and readable with JavaScript
  disabled.

The exact visual presentation is not part of R1.

## Resource Boundary

- Every stylesheet, image, font, and script used by the page is local to the built artifact.
- The page does not require external APIs, embeds, analytics, cookies, authentication, credentials,
  or personal-data input.
- No dormant controls, routes, or placeholder implementations represent excluded future features.
- No client-side JavaScript is emitted unless a documented accessibility need justifies it.

## Responsive and Accessibility Behavior

- No horizontal page overflow or loss of content at 320 CSS pixels or the representative desktop
  viewport.
- Text remains readable at 200% zoom.
- Keyboard focus is visible whenever focusable content exists; there is no keyboard trap.
- The skip link works without client-side JavaScript and supplies the qualifying pointer/keyboard
  interaction used by the local INP protocol.
- Meaning does not rely on color alone.
- Automated axe scans return no applicable WCAG A/AA violations.
- Manual Chrome and Safari review covers WCAG 2.2 AA aspects not determinable by automation,
  including VoiceOver reading order.

## Performance Acceptance

On the documented five-run Chrome mobile lab protocol, nearest-rank p75 must meet:

| Metric                          | Threshold          |
| ------------------------------- | ------------------ |
| Largest Contentful Paint        | <=2.5 seconds      |
| Local Interaction to Next Paint | <=200 milliseconds |
| Cumulative Layout Shift         | <=0.1              |

The evidence must identify the machine, macOS/Chrome versions, viewport, throttling preset, five
raw measurements, and p75 calculation. Production field data is not part of R1.

## Automated Smoke Assertions

The browser suite must fail if:

- the route is unavailable;
- expected identity/status text or metadata is absent;
- the page requests a cross-origin resource;
- core content disappears when JavaScript is disabled;
- the page overflows at the acceptance viewport;
- a tested keyboard action is blocked; or
- axe reports an applicable violation.
