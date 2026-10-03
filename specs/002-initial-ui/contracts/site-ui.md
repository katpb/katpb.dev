# UI Contract: R2 — Initial UI

**Branch**: `002-initial-ui` | **Date**: 2026-10-02

Authority: `specs/002-initial-ui/spec.md` and approved design artifacts. This is a browser-facing
static UI contract, not an API or publishing contract.

## Routes and document shell

- `/`, `/writing/`, `/projects/`, `/about/` return complete static HTML with status 200 through
  the existing production preview. Build output contains their four corresponding HTML pages
  and local resources. Direct entry and ordinary link navigation both work.
- Every page has English document language, viewport metadata, a unique meaningful title and
  description, one global header, one main region, one H1, and one consistent footer. Lists,
  headings, and landmarks reflect the visible hierarchy; no duplicate main or H1.
- First keyboard action can expose “Skip to main content”; activation focuses `main-content`.
  All actions have meaningful names and visible unobscured focus in logical order.
- Header primary links remain visible in order Home, Writing, Projects, About, with direct
  destinations. Exactly one has `aria-current="page"` and a non-color underline/equivalent.
  Focus uses a distinct outline. Footer navigation is separately labelled and uses the same paths.
- The visible identity names katpb.dev and its Home destination without depending on the mark.
  No hamburger, Search/Blog substitution, hidden menu, disabled action, or future route.

## Responsive identity and scrolling

- Desktop has the approved identity rail: mark/site name/descriptor, concise introduction, and
  available approved profiles. It remains visible during page scrolling when the full rail fits
  with clearances. When it does not fit, it scrolls in ordinary document flow. Only one page
  scroll area exists; no rail clipping or independent overflow scrollbar.
- Mobile has compact mark/name/short descriptor at the top, then visible navigation and content
  in normal flow. Home has professional introduction and approved profile links; every mobile
  footer has those profiles when available. Writing/Projects/About do not repeat the full rail
  introduction above their page intros. Empty profile groups are omitted.
- Desktop/mobile identity markup is mutually exclusive for visibility, assistive exposure, and
  keyboard stops. No-JS normal-flow rail is a safe fallback to the optional fit enhancement.
- All pages reflow at 320 CSS pixels and actual 200% browser zoom, including wrapping nav,
  long titles/technical tokens, and header control rows. No horizontal page scrolling or blocked
  content. Resize across the rail breakpoint and short/tall heights without losing content.

## Page content and visual distinction

- Home: professional introduction, ≥3 writing previews, ≥3 work previews, About preview, and
  real section links to Writing/Projects/About.
- Writing: technical-notebook introduction and ≥4 meaningful title/summary/context entries
  spanning multiple technical themes. Editorial hierarchy and restrained separators distinguish
  it while retaining shared font family, identity, navigation, and footer. Featured writing echoes
  this pattern; Home/Projects/About do not become documentation pages.
- Projects: introduction and ≥3 complete context/contribution/value summaries, visually distinct
  from writing. Without an approved image omit the region; without an approved destination omit
  the action. Such summaries are noninteractive, not disabled or clickable-looking.
- About: complete representative professional, leadership/collaborative, and personal narrative;
  it requires neither a portrait nor final biography.
- Clear relevant section/item labels identify illustrative unapproved prose. No lorem ipsum,
  fake credentials/employers/metrics/delivered outcomes, unverifiable dates/reading times, or
  broken sample links. No article-detail pages or writing-entry actions to missing pages.
- Only approved, verified profile/contact/project destinations are included. Live third-party
  availability is not a build dependency. No external images/fonts/embeds/content services.

## Brand and shared visual states

- Every mark uses `specs/002-initial-ui/design/source/brand-mark.svg` through native Astro import.
  Its viewBox/path geometry/currentColor remain unchanged; no second source or optimizer.
- Mark width ≥48 CSS pixels, proportional height, identical dimensions at the same viewport
  across themes; surrounding content reflows instead of cropping or shrinking below the minimum.
- Effective light paint is `#5B1A78`; dark paint is `#E6D9FF`. The mark is decorative and
  nonfocusable beside visible site name; no separate image announcement or keyboard stop.
- Shared typography/spacing/borders/surfaces support coherent hierarchy. Links/current/focus
  are not color-only; text and relevant non-text states meet applicable WCAG contrast.
- No decorative animation; reduced motion removes nonessential state-feedback transitions.
  Forced-color review retains identity through text, visible focus, and active-page boundaries.

## Metadata, enhancement, and privacy

Every primary page has a unique title/description, absolute canonical URL under `https://katpb.dev`,
Open Graph title/description/website type/URL/site name, and summary Twitter card/title/description.
Metadata matches the real route; no invented social image or article metadata. This is not hosting
configuration.

Theme contract: `specs/002-initial-ui/contracts/theme.md`. Core introductions, samples, narrative,
navigation, and footer are delivered in HTML and remain usable without JavaScript. No personal-data
capture, analytics, nonessential cookies, auth, newsletter, comments, backend, or remote dependencies.

Validation: `specs/002-initial-ui/contracts/validation.md`.
