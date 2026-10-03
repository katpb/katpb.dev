/**
 * ## Primary Page and Navigation Destination
 *
 * | Field         | Meaning and validation                                               |
 * | ------------- | -------------------------------------------------------------------- |
 * | `id`          | Exactly `home`, `writing`, `projects`, or `about`; unique            |
 * | `href`        | Respectively `/`, `/writing/`, `/projects/`, `/about/`; built HTML   |
 * | `label`       | Respectively Home, Writing, Projects, About; fixed navigation order  |
 * | `title`       | Nonempty, descriptive, unique document title including site identity |
 * | `description` | Nonempty, page-specific discovery description; no unverified claims  |
 * | `heading`     | Nonempty main heading; rendered once as the page's h1                |
 * | `intro`       | Page-specific introduction; illustrative claims visibly labelled     |
 *
 * The finite page list drives navigation and metadata. Each page supplies its `id` to the layout;
 * exactly one primary-navigation link receives `aria-current="page"`. Canonical/share URLs combine
 * `https://katpb.dev` with `href`; this neither configures hosting nor contacts the public origin.
 *
 *
 * ## Profile Narrative and Approved Links
 *
 * The narrative comprises display identity/descriptor, concise desktop introduction, Home
 * introduction, About preview, and ordered About sections with headings/paragraphs covering
 * engineering perspective, leadership/collaboration, and a measured personal dimension. Label
 * provisional personal claims where they appear, including in the rail. Names, employers, topics,
 * and claims in wireframes are not verified biography.
 *
 * Each approved profile link contains a visible `label`, verified `href`, and source comment or
 * feature-document reference to approval/verification evidence. Allow reviewed HTTP(S) destinations
 * or explicitly approved `mailto:` contact destinations; no empty, `#`, or script URLs. No approval
 * evidence is present in current artifacts, so initialize the list empty. Do not derive personal
 * destinations from Git remotes or machine identity.
 *
 * One shared list feeds desktop rail, Home introduction, and footer. Empty lists render no grouping.
 * Link inclusion introduces no build fetch, embed, prefetch, or external availability check in the
 * site. Approval/verification is a content-review step, not runtime state.
 *
 */
export const pages = [
  {
    id: "home",
    href: "/",
    label: "Home",
    title: "katpb.dev — Engineering, people, and practice",
    description:
      "An illustrative introduction to engineering perspective, technical writing, and thoughtful work at katpb.dev.",
    heading: "Building software. Growing understanding.",
    intro:
      "An experienced software engineer and technology leader, thinking about reliable systems, clear decisions, and the people behind the work.",
  },
  {
    id: "writing",
    href: "/writing/",
    label: "Writing",
    title: "Writing — A technical notebook | katpb.dev",
    description:
      "Illustrative technical notebook entries exploring system design, engineering practice, and collaboration.",
    heading: "A technical notebook.",
    intro:
      "Notes on the decisions behind the code. A place to examine trade-offs, make ideas clearer, and keep learning in public.",
  },
  {
    id: "projects",
    href: "/projects/",
    label: "Projects",
    title: "Projects — Selected work | katpb.dev",
    description:
      "Illustrative work summaries that connect engineering problems, possible contributions, and intended value.",
    heading: "Work, with context.",
    intro:
      "Good engineering starts with understanding the problem. These sketches connect a practical constraint to an approach and the value it could create.",
  },
  {
    id: "about",
    href: "/about/",
    label: "About",
    title: "About — Perspective and practice | katpb.dev",
    description:
      "An illustrative professional and personal narrative about engineering, collaborative leadership, and curiosity.",
    heading: "A little more perspective.",
    intro:
      "Software is a human undertaking. The way we ask questions, share context, and work together matters as much as the systems we build.",
  },
] as const;
export type PageId = (typeof pages)[number]["id"];
export const identity = {
  descriptor: "Software engineer & technology leader",
  introduction:
    "Working at the intersection of reliable systems, thoughtful engineering, and collaborative teams.",
  aboutPreview:
    "I’m drawn to problems that need both technical depth and a wider view. This is a space for the work, questions, and small discoveries along the way.",
};
export const aboutSections = [
  {
    heading: "Engineering with a wider view",
    paragraphs: [
      "I like to begin with the constraints: who needs this system, what must it make possible, and where can it fail? That context helps turn a broad ambition into decisions a team can explain and revisit.",
      "My engineering perspective centers on reliable systems and maintainable software. I value simple interfaces, explicit trade-offs, and feedback from the people who operate and use what we build.",
    ],
  },
  {
    heading: "Making room for shared understanding",
    paragraphs: [
      "Leadership is partly the work of making context available. A clear design note, a patient review, or a well-framed question can help a team move with more confidence than a quick answer alone.",
      "I prefer collaboration that makes disagreement useful: explore the assumptions, name the uncertainty, and agree on what evidence would change the decision.",
    ],
  },
  {
    heading: "Curiosity beyond the immediate problem",
    paragraphs: [
      "Outside the next technical decision, I make room for reading, noticing, and following questions without a fixed destination. Time away from a screen can put a difficult problem into perspective.",
      "That same curiosity shapes this notebook: write an idea down, look for the missing piece, and leave room to learn something different tomorrow.",
    ],
  },
] as const;
export interface ProfileLink {
  label: string;
  href: `https://${string}` | `http://${string}` | `mailto:${string}`;
  approvalEvidence: string;
}
// No destination approval evidence exists in specs/002-initial-ui/data-model.md.
export const profiles: readonly ProfileLink[] = [];
