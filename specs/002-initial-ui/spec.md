# Feature Specification: R2 — Initial UI

**Feature Branch**: `002-initial-ui`

**Created**: 2026-10-02

**Status**: Draft

**Input**: User description: "Build the first cohesive user-facing experience for katpb.dev as a
polished professional and personal brand website, with a distinct technical notebook, responsive
global navigation, homepage sections, Writing/Projects/About page shells, representative static
content, accessibility, and constitutional performance—without publishing, deployment, backend,
or speculative future features."

Artifact precedence: this specification governs product behavior, scope, accessibility,
performance, and acceptance outcomes. The approved
[design direction](./design/design-direction.md) governs visual direction, responsive and theme
behavior, and brand treatment subject to this specification and its resolved clarifications.
The [desktop](./design/source/desktop-home-wireframe.svg) and
[mobile](./design/source/mobile-home-wireframe.svg) wireframes govern information hierarchy and
approximate layout, rather than exact dimensions, copy, colors, or sample counts. The canonical
[brand mark](./design/source/brand-mark.svg) governs its geometry. External style references are
inspiration only and MUST NOT be copied.

## Clarifications

### Session 2026-10-02

- Q: How should the desktop identity rail behave when a visitor scrolls a long page? → A: The rail
  remains visible when it fits without hiding content; otherwise it scrolls normally with the page.
  There is one page scroll area, with no independent rail scrolling.
- Q: On mobile, where should the desktop rail's introduction and approved profile links appear?
  → A: Use compact identity at the top, the introduction and approved profile links in the
  homepage introduction, and approved profile links in the footer on every primary page.
- Q: How should visitors choose a theme, and how long should that choice last? → A: Offer System,
  Light, and Dark; default to System and follow system changes while selected. Remember the
  selected mode across pages and later visits, with System available to remove a manual override.
- Q: How should R2 handle representative content and profile links that have not been verified?
  → A: Use labelled illustrative copy where facts are unavailable, include only approved and
  verified profile links, and omit unapproved or unavailable links.
- Q: What minimum displayed width should the canonical brand mark retain on narrow screens?
  → A: At least 48 CSS pixels wide, preserving its proportions and reflowing surrounding content
  rather than shrinking it further.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Understand the Professional Identity (Priority: P1)

As a first-time visitor, I want the homepage to quickly explain who the site represents, the
person's professional focus, and the kind of work they do so that I can decide whether to explore
their writing, work, or background.

**Why this priority**: Establishing a credible identity as an experienced software engineer and
technology leader is the site's primary purpose and the foundation for every deeper journey.

**Independent Test**: Show the homepage alone to a first-time visitor on a mobile or desktop
viewport. Without opening another page, the visitor can identify the person, describe their
professional focus, and locate featured writing, selected work, and an about preview.

**Acceptance Scenarios**:

1. **Given** a first-time visitor opens the homepage, **When** they inspect the initial content,
   **Then** they see a clear identity, a concise professional introduction, and an accurate summary
   of the work and themes represented by the site.
2. **Given** the visitor continues through the homepage, **When** they review its sections, **Then**
   they encounter featured writing, selected projects or work, and an about preview in a coherent
   reading order.
3. **Given** the visitor wants more detail, **When** they use a homepage section's primary link,
   **Then** they reach the matching Writing, Projects, or About destination.
4. **Given** representative copy is not final production copy, **When** the homepage is reviewed,
   **Then** the content remains credible and specific enough to evaluate the experience without
   making unverified personal or professional claims.

---

### User Story 2 - Explore the Technical Notebook (Priority: P2)

As a technically interested visitor, I want to browse a clearly identified writing area so that I
can recognize the author's technical thinking without mistaking the entire personal site for a
documentation portal.

**Why this priority**: Writing demonstrates depth and judgment, but it must support the broader
professional identity instead of replacing it.

**Independent Test**: Open the Writing destination directly and compare it with the homepage. A
visitor can identify the area as the site's technical notebook, understand the subject and summary
of each representative entry, and still recognize it as part of the same personal brand.

**Acceptance Scenarios**:

1. **Given** a visitor enters Writing from the global navigation or homepage, **When** the page
   appears, **Then** it identifies itself as a technical notebook and provides representative
   writing entries with meaningful titles, summaries, and context.
2. **Given** the visitor compares Writing with the homepage, **When** they assess the visual and
   editorial treatment, **Then** they perceive a clear notebook-specific pattern while retaining
   the shared site identity, navigation, typography, and footer.
3. **Given** article publishing is outside R2, **When** the visitor examines the writing samples,
   **Then** no unfinished article route, authoring control, subscription prompt, or publishing
   workflow is presented as functional.

---

### User Story 3 - Review Selected Work (Priority: P2)

As a prospective collaborator, employer, or peer, I want to review selected projects and work so
that I can understand the person's areas of contribution, leadership, and technical judgment.

**Why this priority**: Selected work substantiates the professional introduction and makes the
brand credible to high-intent visitors.

**Independent Test**: Open the Projects destination directly. A visitor can scan representative
items, distinguish them from writing entries, and understand the problem or context, contribution,
and outcome conveyed by each item without relying on private or unverifiable details.

**Acceptance Scenarios**:

1. **Given** a visitor opens Projects, **When** they scan the page, **Then** they see a clear page
   introduction and a representative selection of project or work summaries.
2. **Given** a visitor reviews a project summary, **When** they read its available details, **Then**
   they can distinguish its context, the nature of the contribution, and its outcome or value.
3. **Given** R2 supplies sample rather than final portfolio content, **When** a project has no
   approved image or external destination, **Then** the presentation remains complete without a
   broken image, empty control, or misleading link: omit the absent image region and destination
   action, and retain the readable project summary without implying it is clickable.

---

### User Story 4 - Learn More About the Person (Priority: P3)

As a visitor seeking context beyond individual projects or articles, I want an About destination
that connects professional experience, leadership perspective, and personal voice so that I can
form a more complete and credible impression.

**Why this priority**: The About experience deepens trust after the homepage, writing, and work
have established the primary value proposition.

**Independent Test**: Open About directly. A visitor can understand the page's purpose, follow its
narrative in a logical order, and return to other primary areas through the shared navigation.

**Acceptance Scenarios**:

1. **Given** a visitor opens About, **When** they read the page, **Then** they receive a coherent
   representative narrative covering professional perspective, leadership or collaboration, and
   a measured personal dimension.
2. **Given** final biography copy and imagery are outside R2, **When** the page is reviewed, **Then**
   it remains visually evaluable without lorem ipsum, fabricated credentials, or required portrait
   photography.

---

### User Story 5 - Navigate Reliably on Any Supported Viewport (Priority: P1)

As any visitor, including a keyboard or assistive-technology user, I want consistent navigation,
structure, and feedback across the site so that I can move between destinations and understand my
location on mobile or desktop.

**Why this priority**: The visual experience is not usable or credible if primary destinations are
hard to reach, inaccessible, unstable, or inconsistent.

**Independent Test**: Starting from each primary page at representative mobile and desktop sizes,
use only the keyboard and then a screen reader's structural navigation to reach every global
destination, identify the current page, skip repeated navigation, and inspect the footer without a
trap, hidden content, or horizontal page scrolling.

**Acceptance Scenarios**:

1. **Given** a visitor is on any primary page, **When** they use the global header, **Then** Home,
   Writing, Projects, and About are visible in that order and directly reachable, with an
   underline or equivalent non-color marker and an assistive-technology indication identifying
   the current page.
2. **Given** the viewport is narrow or text is enlarged to 200%, **When** the visitor navigates or
   reads any primary page, **Then** all content and navigation remain available without horizontal
   page scrolling or overlapping controls.
3. **Given** the visitor uses a keyboard, **When** focus moves through interactive elements,
   **Then** the order is logical, focus is visibly unobscured, repeated navigation can be skipped,
   and no keyboard trap occurs.
4. **Given** the visitor prefers reduced motion, **When** the interface changes state or content is
   revealed, **Then** non-essential motion is removed or reduced without loss of information.
5. **Given** optional client-side behavior is unavailable, **When** a visitor opens a primary page,
   **Then** the core content and navigation remain readable and usable.
6. **Given** a desktop visitor scrolls a long page, **When** the identity rail fits within the
   available height, **Then** it remains visible without obstructing the main content; if reduced
   height, zoom, or enlarged text prevents it from fitting, it scrolls normally with the page and
   all rail content remains reachable through the single page scroll area.
7. **Given** a visitor opens any primary page on mobile, **When** they inspect its shared structure,
   **Then** compact identity appears at the top and approved profile links appear in the footer;
   on Home, the professional introduction and approved profile links also appear in the
   introduction section, with all content in normal document flow and no fixed sidebar.
8. **Given** no theme choice has been saved, **When** a visitor opens a primary page, **Then** its
   appearance follows the operating system; selecting Light or Dark overrides that preference
   across navigation and later visits, and selecting System restores following system changes.
9. **Given** a visitor views the site identity in either theme or on a narrow screen, **When** the
   brand mark is displayed, **Then** its canonical proportions and geometry remain unchanged,
   its width is at least 48 CSS pixels, and its color is deep violet in light appearance or pale
   lavender in dark appearance. Assistive technologies identify the adjacent site name and any
   Home destination without announcing the decorative mark separately.

### Edge Cases

- A representative writing or project title is substantially longer than the typical sample.
- A summary contains a long unbroken technical term, URL-like text, or unusually long word.
- A project has no approved image, external link, technology label, or quantified outcome.
- A visitor lands directly on Writing, Projects, or About rather than entering through Home.
- The active destination must remain clear when color perception is limited or styles do not load
  fully.
- The navigation must remain usable at 320 CSS pixels, at 200% zoom, with large system text, and
  when labels wrap to multiple lines.
- A visitor prefers reduced motion, high contrast, dark appearance, or light appearance.
- Representative sample content is later replaced by longer final copy without changing the
  intended page hierarchy.
- A local or external destination is unavailable; the remaining card or preview must not become
  misleading or unusable.
- Optional decorative media fails to load; identity, meaning, and navigation must remain intact.
- The desktop identity rail exceeds the available height because of a short window, zoom, or
  enlarged text; it must join normal page scrolling rather than hide content or scroll separately.
- A saved theme preference cannot be read or retained; appearance must fall back to the system
  preference without blocking content, navigation, or an available manual selection.
- The system appearance changes while a manual Light or Dark override is selected; the override
  must remain unchanged until the visitor selects another mode.
- No external profile destinations have been approved; omit the links and any empty profile-link
  grouping while retaining complete identity, introductions, and navigation.
- The compact identity cannot fit the brand mark, site name, and theme control on one line;
  reflow surrounding content while preserving the mark's minimum width, proportions, and reachability.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The experience MUST present katpb.dev as a cohesive professional and personal brand
  whose primary impression is an experienced software engineer and technology leader.
- **FR-002**: Every primary page MUST include a consistent global header, site identity, primary
  navigation, main-content region, and footer.
- **FR-003**: The global navigation MUST provide direct access to Home, Writing, Projects, and About
  in that order from every primary page. Writing is the canonical navigation label; Blog MUST NOT
  replace it. Selecting a navigation link MUST open the corresponding primary page, and the site
  identity MUST provide a clearly named Home destination.
- **FR-004**: The current primary destination MUST be identifiable visually and semantically
  without relying on color alone, using an underline or equivalent non-color marker and an
  assistive-technology indication of the current page. Focus and current-page states MUST remain
  distinguishable, and the active indication MUST identify the page rather than a scrolled section.
- **FR-005**: On desktop and mobile, all four primary navigation links MUST remain visible without
  opening a menu. Narrow-screen navigation MUST remain operable at 320 CSS pixels and 200% zoom;
  links MUST reflow or wrap when necessary rather than disappear or require horizontal scrolling.
- **FR-006**: The homepage MUST include a prominent introduction that identifies the person,
  communicates a concise professional focus, and establishes the relationship between engineering,
  technology leadership, and personal perspective.
- **FR-007**: The homepage MUST include separate featured-writing, selected-projects-or-work, and
  about-preview sections, each with a clear heading and a path to its corresponding destination.
- **FR-008**: The homepage MUST contain at least three representative writing previews and at least
  three representative project or work previews so that repetition, hierarchy, and responsive
  behavior can be evaluated.
- **FR-009**: The Writing destination MUST have a clear page title, an introduction framing it as a
  technical notebook, and at least four representative entries spanning more than one technical
  theme.
- **FR-010**: Each representative writing entry MUST provide a meaningful title, a concise summary,
  and enough contextual information to distinguish it from the other entries.
- **FR-011**: The Writing experience MUST use a recognizable notebook-specific visual and editorial
  pattern while retaining the shared site identity, global navigation, typography family, and
  footer. The notebook distinction MUST come from scannable editorial entries with title, summary,
  technical-theme context, clear hierarchy, and restrained separators or emphasis, rather than
  color or a notebook label alone. Homepage featured writing MUST echo this editorial pattern.
- **FR-012**: Notebook-specific treatment MUST NOT make the homepage, Projects, or About resemble a
  documentation portal or application reference manual.
- **FR-013**: The Projects destination MUST have a clear page title, an introduction, and at least
  three representative project or work summaries.
- **FR-014**: Each project or work summary MUST communicate its context or problem, the nature of
  the contribution, and an outcome or value without requiring unapproved confidential details.
- **FR-015**: The About destination MUST have a clear page title and a representative narrative
  that connects professional experience, leadership or collaboration, and personal perspective.
- **FR-016**: Representative content MUST be specific and coherent enough to evaluate tone,
  hierarchy, line length, wrapping, and repeated patterns; lorem ipsum and empty placeholders are
  prohibited.
- **FR-017**: Representative content MUST avoid fabricated credentials, employers, metrics,
  endorsements, client names, or personal claims. Content not approved as final MUST be clearly
  labelled as illustrative sample copy at the relevant section or item, rather than presented as
  established biography, delivered work, or published writing. Wireframe names, topics, and claims
  MUST NOT be treated as verified facts solely because they appear in the layout artifacts.
- **FR-018**: Reusable visual patterns MUST provide consistent treatment for page introductions,
  section headings, summaries, metadata, links, calls to action, cards or list items, and supporting
  text across the experience.
- **FR-019**: Typography, spacing, color, borders, surfaces, and emphasis MUST form a coherent visual
  hierarchy across all primary pages while preserving the distinct notebook treatment.
- **FR-020**: The visual presentation MUST remain credible and professional without depending on
  decorative media, animation, or a completed personal photography library.
- **FR-021**: Every primary page MUST provide a unique, descriptive page title and description, plus
  appropriate discovery and sharing metadata for a public page.
- **FR-022**: Heading levels, landmarks, lists, navigation labels, links, and reading order MUST
  communicate the same structure visually and to assistive technologies.
- **FR-023**: Every primary page MUST provide a keyboard-operable way to bypass repeated global
  navigation and reach its main content.
- **FR-024**: All interactive elements MUST support keyboard operation, a logical focus order, and a
  visible focus indicator that is not obscured by other content.
- **FR-025**: Information, state, destination, and emphasis MUST NOT be communicated by color alone.
- **FR-026**: Text and controls MUST remain readable and usable at 200% zoom and at viewports as
  narrow as 320 CSS pixels without horizontal page scrolling or loss of content.
- **FR-027**: The experience MUST honor reduced-motion preferences and MUST NOT require motion to
  understand content, navigation, or state. Decorative animation is excluded from R2.
- **FR-028**: Core page content and navigation MUST remain available when optional client-side
  behavior fails or is disabled.
- **FR-029**: All primary pages MUST meet WCAG 2.2 Level AA requirements applicable to the R2
  experience, with both automated checks and recorded manual keyboard, responsive, and
  representative-browser review.
- **FR-030**: The homepage, Writing, Projects, and About pages MUST each meet mobile lab thresholds
  of Largest Contentful Paint no more than 2.5 seconds, Interaction to Next Paint no more than 200
  milliseconds, and Cumulative Layout Shift no more than 0.1 at the 75th percentile.
- **FR-031**: Images, fonts, scripts, and third-party resources MUST be included only when their
  visitor value is explicit and their accessibility, privacy, and performance cost is acceptable.
- **FR-032**: The R2 experience MUST collect no personal data, set no non-essential cookies, and
  include no analytics, authentication, visitor-submitted content, comments, search, newsletter
  integration, or external content service. Retaining the visitor's theme mode on their device
  MUST NOT introduce personal-data collection or transmission.
- **FR-033**: Primary content MUST remain readable and usable without contacting an external
  service or loading an external embed.
- **FR-034**: The footer MUST be consistent on every primary page and provide site identity plus a
  concise way to orient or continue navigating. On mobile, it MUST also include available approved
  profile links as specified in FR-038 without repeating the full professional introduction.
- **FR-035**: The R2 experience MUST NOT expose inactive controls, empty destinations, broken sample
  links, unfinished article pages, or speculative future-feature placeholders.
- **FR-036**: R2 MUST preserve the existing reproducible local validation and build-artifact
  expectations established by the project foundation without introducing production deployment.
- **FR-037**: On desktop, every primary page MUST present an identity rail containing the brand
  mark, site name, concise introduction, and approved profile links. The rail MUST remain visible
  while the page scrolls when its full content fits within the available height without
  obstruction; otherwise it MUST scroll normally with the page. The experience MUST use a single
  page scroll area and MUST NOT create independent scrolling within the identity rail.
- **FR-038**: On mobile, the desktop identity rail MUST restructure into compact top identity
  containing the brand mark, site name, and short identity descriptor. The professional
  introduction and approved profile links MUST appear in the homepage introduction; approved
  profile links MUST also appear in the footer on every primary page. All mobile content MUST
  follow normal document flow, with no fixed sidebar or repeated full introduction above
  Writing, Projects, or About.
- **FR-039**: Every primary page MUST support System, Light, and Dark theme selection. System
  MUST be the default when no valid saved selection exists and MUST follow operating-system
  appearance changes. Manual Light or Dark selection MUST override the operating system until
  changed, and the selected mode MUST persist across pages and later visits on the same device
  when preferences can be retained. Selecting System MUST restore system-following behavior.
  The theme control MUST have an accessible name and convey the selected mode without relying
  on its icon or color alone. Preference failures MUST NOT block the experience or expose an
  inactive control.
- **FR-040**: R2 MUST use labelled illustrative content where approved factual content is
  unavailable. Profile and contact links MUST appear only when their destinations are approved
  and verified; otherwise the link and any empty grouping MUST be omitted. Samples MUST NOT
  imply publication dates, reading times, delivered outcomes, or other facts that have not been
  verified. Writing samples MUST NOT link to nonexistent article pages; homepage section links
  MUST lead to the corresponding available primary page.
- **FR-041**: All brand-mark appearances MUST use the single canonical
  `specs/002-initial-ui/design/source/brand-mark.svg` with `currentColor`, preserving its geometry
  and aspect ratio. At the same viewport its dimensions MUST remain identical across themes.
  The displayed mark MUST be at least 48 CSS pixels wide; surrounding content MUST reflow rather
  than shrink, crop, distort, or replace the mark. Its color MUST be `#5B1A78` in light appearance
  and `#E6D9FF` in dark appearance. Beside the visible site name, the mark MUST be decorative to
  assistive technologies and MUST NOT create a duplicate announcement or independent keyboard
  stop. If the combined identity is a Home link, its accessible name MUST identify katpb.dev and
  the Home destination without depending on recognizing the silhouette.
- **FR-042**: Project summaries without approved images MUST omit the image region and remain
  visually complete as text. Without an approved and verified destination, a summary MUST omit
  the destination action and remain non-interactive, with no empty image frame, broken media,
  disabled action, or misleading clickable appearance. Approved destinations may be linked;
  missing destinations MUST NOT cause an invented project-detail page to be added to R2.

### Key Entities

- **Primary Page**: One of Home, Writing, Projects, or About; has a unique purpose, title,
  description, main heading, active navigation state, page introduction, shared header, and shared
  footer.
- **Navigation Destination**: A globally available site destination with a visible label, accessible name,
  destination, current-state behavior, and defined narrow-screen presentation.
- **Writing Preview**: A representative technical-notebook item with a title, summary, theme or
  context, and optional supporting metadata; it does not imply an R2 publishing workflow or
  complete article library.
- **Project Summary**: A representative work item describing context or problem, contribution, and
  outcome or value, with optional media or supporting labels.
- **Profile Narrative**: The professional and personal story expressed through the homepage
  introduction, about preview, and About destination without unapproved biographical claims.
- **Visual Pattern**: A reusable presentation rule for hierarchy, spacing, color, typography,
  focus, links, summaries, lists, cards, or metadata that maintains consistency across pages.
- **Theme Preference**: System, Light, or Dark; System follows the operating system, and a manual
  Light or Dark choice overrides it until changed. The preference applies across primary pages
  and later visits on the same device when retention is available.
- **Brand Mark**: The canonical cat-and-laptop silhouette, shared across appearances with unchanged
  geometry, a minimum displayed width of 48 CSS pixels, specified theme colors, and decorative
  accessibility treatment beside the named site identity.

### Scope Boundaries

R2 includes the four primary page experiences, their shared navigation and footer, representative
static sample content, the visual language needed to evaluate them, and the accessibility,
responsive, privacy, and performance behavior defined above.

R2 excludes:

- article authoring, editorial review, preview, scheduling, or publishing workflow;
- a content management system, external content source, or complete article library;
- production hosting, deployment configuration, release automation, or hosting-provider work;
- search, comments, newsletter integration, authentication, analytics, or personal-data capture;
- backend services, APIs, databases, or dynamic user accounts;
- final production copy, final personal photography, or exhaustive project history; and
- decorative animation, dormant controls, empty routes, or abstractions created only for
  speculative later features.

### Constitution Compliance

- **User value and content integrity**: Every included page supports a defined visitor journey;
  representative content must be credible, reviewable, and free of misleading claims.
- **Accessibility and progressive enhancement**: WCAG 2.2 AA, semantic structure, keyboard access,
  visible focus, reduced motion, responsive reflow, and content without optional client-side
  behavior are explicit acceptance requirements.
- **Performance**: All four primary pages retain the constitution's LCP, INP, and CLS targets.
- **Privacy and security**: R2 collects no personal data and introduces no analytics, non-essential
  cookies, visitor-submitted content, authentication, external content service, or backend trust
  boundary. Theme preferences remain on the visitor's device without personal-data transmission.
- **Simplicity and verifiable quality**: The slice contains only the UI and static representative
  content needed to evaluate the approved journeys. No constitutional exception is requested.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: In a five-second homepage comprehension check, at least 80% of representative
  first-time reviewers identify the site as belonging to an experienced software engineer or
  technology leader and can state at least one area of professional focus.
- **SC-002**: At least 90% of representative reviewers can locate Writing, Projects, and About from
  the homepage and reach any chosen destination in no more than one action on desktop or two
  actions on mobile.
- **SC-003**: At least 80% of representative reviewers distinguish Writing as a technical notebook
  within the personal brand while recognizing all four primary pages as parts of the same website.
- **SC-004**: All four primary pages display their complete core content and navigation at 320 CSS
  pixels, at a representative desktop viewport, and at 200% zoom with no horizontal page scrolling,
  overlap that blocks content, or loss of functionality. Desktop rail content remains reachable
  through one page scroll area even when the rail cannot fit the available height; mobile uses
  compact identity and normal document flow with visible primary navigation.
- **SC-005**: A keyboard-only reviewer can traverse every primary page, identify focus at every
  step, activate all navigation, bypass repeated content, and reach the main region with zero traps
  or obscured focus states.
- **SC-006**: Automated accessibility evaluation finds zero applicable WCAG 2.2 A/AA violations,
  and recorded manual review finds no blocking semantic, keyboard, reading-order, zoom, contrast,
  reduced-motion, or responsive issue.
- **SC-007**: With optional client-side behavior disabled, 100% of primary navigation destinations,
  page introductions, representative writing entries, project summaries, and About content remain
  readable and reachable.
- **SC-008**: In repeatable mobile lab testing, every primary page achieves p75 LCP <=2.5 seconds,
  local INP <=200 milliseconds for its available interactions, and CLS <=0.1 across five unchanged
  runs.
- **SC-009**: Review of the delivered R2 experience finds zero personal-data collection points,
  analytics calls, non-essential cookies, external content dependencies, broken links, empty
  controls, or speculative feature placeholders.
- **SC-010**: The homepage contains all three required preview sections, Writing contains at least
  four representative entries, Projects contains at least three representative summaries, and
  About contains a complete representative narrative suitable for visual evaluation.
- **SC-011**: At least 80% of representative reviewers rate the combined experience as credible,
  thoughtful, modern, and personal, with no one of those four qualities receiving a majority
  negative assessment.
- **SC-012**: On all four primary pages, theme checks confirm System follows both initial and
  changed operating-system appearance, manual Light and Dark override system changes, each
  selected mode survives navigation and a later visit when preferences can be retained, and
  selecting System restores following the operating system. Unavailable preference retention
  causes no blocked content, navigation, or inactive control.
- **SC-013**: Brand-mark review at mobile and desktop sizes in both appearances confirms identical
  canonical geometry and theme-independent dimensions, width >=48 CSS pixels, light color
  `#5B1A78`, dark color `#E6D9FF`, and no duplicate screen-reader announcement or keyboard stop.

## Assumptions

- The primary audience includes prospective collaborators, employers, engineering peers, and
  readers interested in software engineering and technology leadership.
- Qualitative comprehension and perception checks use at least five first-time representative
  reviewers drawn from at least two of the intended audience groups.
- The initial experience is in English and does not require localization in R2.
- Home, Writing, Projects, and About are the complete primary navigation set for this slice.
- Representative content is static, truthful in tone, and intentionally provisional until final
  production copy is approved in later work. Unverified content is labelled as illustrative;
  missing approved content or profile destinations do not block evaluating the bounded UI slice.
- A portrait, project screenshot, company logo, or decorative illustration is optional; the UI
  must remain complete when such media is absent.
- Writing previews demonstrate the notebook presentation; article-detail routes are excluded
  from R2, and writing summaries do not imply an available article destination.
- Project summaries may describe representative problem, contribution, and outcome structures
  without naming confidential organizations or inventing measurable impact.
- The completed R1 project foundation, local validation command, reproducible build behavior, and
  performance acceptance protocol remain available and must continue to pass.
- No exception to the project constitution is necessary for this feature.
