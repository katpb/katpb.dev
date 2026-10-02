# R2 Initial UI — Design Direction

## Intent

katpb.dev is a professional personal-brand website for an experienced
software engineer and technology leader. Writing is presented as a distinct
technical notebook within that broader identity.

## Visual inspiration

Joel on Software is a directional reference for:

- author-led identity
- content-first editorial presentation
- strong typography
- generous whitespace
- scannable writing previews
- a desktop identity rail

The site must not reproduce its branding, exact layout, typography, imagery,
or implementation.

## Desktop structure

- Identity rail containing the brand mark, site name, concise introduction,
  and approved profile links.
- Main area containing global navigation and page-specific content.
- The homepage includes professional introduction, featured writing,
  selected work, and about preview.
- The identity rail may remain visually stable while scrolling when space
  permits, but must not obstruct content.

## Mobile structure

- Identity collapses into a compact top section.
- All content follows normal document flow.
- Navigation remains fully accessible at 320 CSS pixels and 200% zoom.
- No fixed sidebar is retained on narrow screens.

## Brand mark

The canonical brand-mark geometry is:

`specs/002-initial-ui/design/source/brand-mark.svg`

The SVG must use `currentColor` so its appearance is controlled by the site theme. Light and dark themes must use identical SVG geometry, proportions, and dimensions.

### Theme tokens

```css
:root {
  --brand-mark-color: #5b1a78; /* deep violet */
}

[data-theme="dark"] {
  --brand-mark-color: #e6d9ff; /* pale lavender */
}

.brand-mark {
  color: var(--brand-mark-color);
}
```

## Theme

- Support light and dark appearances.
- Initial appearance follows the operating-system preference.
- If a manual theme control is included, the visitor's selection persists.
- The control has an accessible name and does not rely on its icon alone.

## Content style

- Professional, direct, thoughtful, and technically credible.
- Writing previews are editorial rather than documentation-like.
- Avoid lorem ipsum, fabricated achievements, and generic marketing claims.

## Exclusions

- Search
- article routes and publishing
- analytics
- newsletter controls
- inactive social links
- decorative animation
