/**
 * ## Project Summary
 *
 * | Field          | Meaning and validation                                                       |
 * | -------------- | ---------------------------------------------------------------------------- |
 * | `id`           | Unique local presentation key                                                |
 * | `title`        | Meaningful, wrapping title                                                   |
 * | `context`      | Problem/context for illustrative work                                        |
 * | `contribution` | Illustrative contribution, without claiming delivered work                   |
 * | `value`        | Intended benefit/outcome structure; no invented metrics/achievements         |
 * | `labels`       | Optional short supporting labels; omit empty grouping                        |
 * | `image`        | Optional approved local media: source, useful alt text, intrinsic dimensions |
 * | `destination`  | Optional approved and verified URL plus descriptive action label             |
 *
 * Maintain >=3 summaries. Home selects >=3 existing IDs; Projects displays the full set. Label
 * samples at section/item level. The default set is text-only without destinations. Missing `image`
 * omits its region; missing `destination` omits its action and clickable styling. No project-detail
 * route is created. Approved media needs recorded visitor value and acceptable accessibility,
 * privacy, and performance cost.
 *
 */
export interface Project {
  id: string;
  title: string;
  context: string;
  contribution: string;
  value: string;
  labels?: readonly string[];
  image?: { src: string; alt: string; width: number; height: number };
  destination?: { href: string; label: string; approvalEvidence: string };
}
export const projects = [
  {
    id: "service",
    title: "A clearer service boundary",
    context:
      "A shared service accumulates responsibilities until routine changes require coordination across several teams.",
    contribution:
      "Map the responsibilities and failure paths, then sketch a smaller interface with explicit ownership and a gradual migration path.",
    value:
      "Make changes easier to reason about while keeping the transition observable and reversible.",
    labels: ["System design", "Maintainability"],
  },
  {
    id: "delivery",
    title: "A calmer path from change to release",
    context:
      "A delivery workflow depends on remembered steps, making the outcome hard to reproduce or explain.",
    contribution:
      "Describe the release inputs, make checks repeatable, and design recovery steps alongside the normal path.",
    value:
      "Give contributors a shared way to validate a change and recover when a step fails.",
    labels: ["Developer experience", "Reliability"],
  },
  {
    id: "context",
    title: "Keeping technical context close to the work",
    context:
      "Design decisions become difficult to find as a project changes and new collaborators join.",
    contribution:
      "Introduce a small decision-note format that connects a problem, its constraints, considered options, and reasons for a choice.",
    value:
      "Support informed discussion without making people reconstruct the history from scattered conversations.",
  },
] as const satisfies readonly Project[];
export const homeProjectIds = [
  "service",
  "delivery",
  "context",
] as const satisfies readonly (typeof projects)[number]["id"][];
