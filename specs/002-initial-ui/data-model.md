# Data Model: R2 — Initial UI

This is a finite presentation model for build-produced pages, not a publishing schema. Use plain
typed constants in `src/data/site.ts` for shared site records, `src/data/writing.ts` for writing
samples, and `src/data/projects.ts` for work samples. No persistence layer, collection, runtime
validation dependency, or approval workflow is introduced.

## Primary Page and Navigation Destination

| Field         | Meaning and validation                                               |
| ------------- | -------------------------------------------------------------------- |
| `id`          | Exactly `home`, `writing`, `projects`, or `about`; unique            |
| `href`        | Respectively `/`, `/writing/`, `/projects/`, `/about/`; built HTML   |
| `label`       | Respectively Home, Writing, Projects, About; fixed navigation order  |
| `title`       | Nonempty, descriptive, unique document title including site identity |
| `description` | Nonempty, page-specific discovery description; no unverified claims  |
| `heading`     | Nonempty main heading; rendered once as the page's h1                |
| `intro`       | Page-specific introduction; illustrative claims visibly labelled     |

The finite page list drives navigation and metadata. Each page supplies its `id` to the layout;
exactly one primary-navigation link receives `aria-current="page"`. Canonical/share URLs combine
`https://katpb.dev` with `href`; this neither configures hosting nor contacts the public origin.

## Writing Preview

| Field     | Meaning and validation                                  |
| --------- | ------------------------------------------------------- |
| `id`      | Unique stable local key; not an article slug or route   |
| `title`   | Meaningful title; long titles wrap                      |
| `summary` | Concise, specific technical summary; escaped plain text |
| `theme`   | Nonempty technical context distinguishing entries       |

Maintain >=4 entries across >=2 technical themes. Home selects >=3 existing IDs in display order;
Writing displays all. Every sample grouping has a visible illustrative-copy label. No entry has
an article URL, publication date, reading time, author credential, or unverified publishing fact.
Titles remain text rather than inert links.

## Project Summary

| Field          | Meaning and validation                                                       |
| -------------- | ---------------------------------------------------------------------------- |
| `id`           | Unique local presentation key                                                |
| `title`        | Meaningful, wrapping title                                                   |
| `context`      | Problem/context for illustrative work                                        |
| `contribution` | Illustrative contribution, without claiming delivered work                   |
| `value`        | Intended benefit/outcome structure; no invented metrics/achievements         |
| `labels`       | Optional short supporting labels; omit empty grouping                        |
| `image`        | Optional approved local media: source, useful alt text, intrinsic dimensions |
| `destination`  | Optional approved and verified URL plus descriptive action label             |

Maintain >=3 summaries. Home selects >=3 existing IDs; Projects displays the full set. Label
samples at section/item level. The default set is text-only without destinations. Missing `image`
omits its region; missing `destination` omits its action and clickable styling. No project-detail
route is created. Approved media needs recorded visitor value and acceptable accessibility,
privacy, and performance cost.

## Profile Narrative and Approved Links

The narrative comprises display identity/descriptor, concise desktop introduction, Home
introduction, About preview, and ordered About sections with headings/paragraphs covering
engineering perspective, leadership/collaboration, and a measured personal dimension. Label
provisional personal claims where they appear, including in the rail. Names, employers, topics,
and claims in wireframes are not verified biography.

Each approved profile link contains a visible `label`, verified `href`, and source comment or
feature-document reference to approval/verification evidence. Allow reviewed HTTP(S) destinations
or explicitly approved `mailto:` contact destinations; no empty, `#`, or script URLs. No approval
evidence is present in current artifacts, so initialize the list empty. Do not derive personal
destinations from Git remotes or machine identity.

One shared list feeds desktop rail, Home introduction, and footer. Empty lists render no grouping.
Link inclusion introduces no build fetch, embed, prefetch, or external availability check in the
site. Approval/verification is a content-review step, not runtime state.

## Visual Patterns and Brand Mark

Visual patterns are CSS tokens and semantic components, not schema records. Define typography,
spacing, colors, surfaces, borders, link emphasis, and focus once; Writing adds editorial hierarchy
with the shared font family. Test actual contrast in both appearances.

The mark is an imported asset, not copied path data. Canonical
`specs/002-initial-ui/design/source/brand-mark.svg` has `viewBox="244 173 745 420"` and
`fill="currentColor"`. Preserve its complete geometry. Color resolves to `#5B1A78` in light and
`#E6D9FF` in dark appearance. Width >=48 CSS pixels; height follows canonical proportions. The SVG
is decorative beside the named Home identity, without a separate announcement or focus stop.

## Theme Preference and State Transitions

Selected mode is `system`, `light`, or `dark`. Effective appearance is derived from selected mode
and OS preference; never save the resolved OS appearance as a manual override.

| Event                                   | Selected mode / root state                   | Storage                          | Effective appearance                     |
| --------------------------------------- | -------------------------------------------- | -------------------------------- | ---------------------------------------- |
| Initial read returns `light`/`dark`     | Matching mode; `data-theme` set before paint | Guarded read of `katpb.theme`    | Saved mode                               |
| Initial read absent, invalid, or throws | System; no root override                     | No write needed                  | OS preference, light fallback            |
| Select Light/Dark                       | Set mode, root attribute, select value       | Guarded write of lowercase value | Choice immediately, even if saving fails |
| Select System                           | Remove root override; select System          | Guarded key removal              | Current OS preference                    |
| OS changes in System                    | No root override                             | None                             | Follows OS using CSS                     |
| OS changes with manual override         | Existing mode                                | None                             | Existing explicit appearance             |
| Later document/visit                    | Initialize from readable retained value      | Guarded read                     | Retained override, otherwise System      |
| JavaScript disabled/unavailable         | No exposed manual selector                   | None                             | OS preference                            |

A failed removal can leave an older saved override for a later document. Do not claim persistence
when storage cannot retain a choice. CSS supplies OS defaults, native `color-scheme`, and explicit
override precedence. Preference failures never block content/navigation.

## Rail Fit State

Fit is ephemeral DOM state, never persisted. Start in flow; at desktop widths enable sticky only
when full rail height fits viewport height minus top/bottom clearances. Viewport, breakpoint, or
observed rail-size changes recompute fit. Non-fit, narrow layout, or measurement failure restores
flow. No fixed-height rail, clipping, or independent scroll container exists.
