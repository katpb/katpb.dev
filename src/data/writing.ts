/**
 * ## Writing Preview
 *
 * | Field     | Meaning and validation                                  |
 * | --------- | ------------------------------------------------------- |
 * | `id`      | Unique stable local key; not an article slug or route   |
 * | `title`   | Meaningful title; long titles wrap                      |
 * | `summary` | Concise, specific technical summary; escaped plain text |
 * | `theme`   | Nonempty technical context distinguishing entries       |
 *
 * Maintain >=4 entries across >=2 technical themes. Home selects >=3 existing IDs in display order;
 * Writing displays all. Every sample grouping has a visible illustrative-copy label. No entry has
 * an article URL, publication date, reading time, author credential, or unverified publishing fact.
 * Titles remain text rather than inert links.
 *
 */
export interface WritingEntry {
  id: string;
  title: string;
  summary: string;
  theme: string;
}
export const writing = [
  {
    id: "boundaries",
    title: "The useful work of a system boundary",
    summary:
      "A boundary is more than a box on a diagram. Explore how ownership, failure modes, and the cost of change can guide where responsibilities belong.",
    theme: "System design",
  },
  {
    id: "decisions",
    title: "Write down the decision, not just the answer",
    summary:
      "A short decision record can preserve the constraints and alternatives that code cannot explain, helping the next person revisit the choice with context.",
    theme: "Engineering practice",
  },
  {
    id: "failure",
    title: "Designing for the day something fails",
    summary:
      "Start with a failed request and work backward: bounded retries, useful signals, and recovery paths that people can understand under pressure.",
    theme: "Reliability",
  },
  {
    id: "reviews",
    title: "A code review is a conversation about intent",
    summary:
      "Separate correctness, clarity, and preference to make review feedback easier to act on and leave room for the author’s reasoning.",
    theme: "Collaboration",
  },
] as const satisfies readonly WritingEntry[];
export const homeWritingIds = [
  "boundaries",
  "decisions",
  "failure",
] as const satisfies readonly (typeof writing)[number]["id"][];
