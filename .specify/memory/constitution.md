<!--
Sync Impact Report
- Version change: unratified template -> 1.0.0
- Modified principles:
  - PRINCIPLE_1 placeholder -> I. User Value and Content Integrity
  - PRINCIPLE_2 placeholder -> II. Accessibility and Progressive Enhancement
  - PRINCIPLE_3 placeholder -> III. Performance Is a Feature
  - PRINCIPLE_4 placeholder -> IV. Privacy and Security by Default
  - PRINCIPLE_5 placeholder -> V. Simplicity and Verifiable Quality
- Added sections:
  - Engineering Constraints
  - Delivery Workflow
- Removed sections: None
- Follow-up TODOs: None
-->
# katpb.dev Constitution

## Core Principles

### I. User Value and Content Integrity
Every change MUST serve a documented visitor need or a clearly stated maintenance outcome.
Published content MUST be accurate, attributable where appropriate, and free of unfinished
placeholders, broken links, and misleading claims. Content changes MUST receive the same review
and validation as code changes. This keeps the site useful and trustworthy rather than treating
content as an afterthought.

### II. Accessibility and Progressive Enhancement
All primary user journeys MUST conform to WCAG 2.2 Level AA. Pages MUST use semantic HTML,
support keyboard navigation, expose accessible names, maintain visible focus, and preserve
meaning without relying on color alone. Core content MUST remain readable when optional client-side
JavaScript fails or is unavailable. Any exception MUST be documented in the feature plan with its
user impact and a time-bounded remediation path.

### III. Performance Is a Feature
Primary pages MUST target the "good" Core Web Vitals thresholds: Largest Contentful Paint no more
than 2.5 seconds, Interaction to Next Paint no more than 200 milliseconds, and Cumulative Layout
Shift no more than 0.1 at the 75th percentile when field data exists. Before representative field
data exists, these thresholds MUST be checked with repeatable mobile lab tests. Images, fonts,
scripts, and third-party resources MUST be loaded only when their user value justifies their cost.
Material regressions require documented approval and a remediation plan.

### IV. Privacy and Security by Default
The site MUST collect no personal data unless a documented feature requires it. Data collection
MUST be minimized, disclosed, retained only as long as necessary, and protected in transit and at
rest. Third-party scripts, cookies, analytics, and external embeds MUST have an explicit purpose
and MUST satisfy applicable consent requirements. Secrets MUST never enter source control or
client bundles. All user-controlled input MUST be validated and safely encoded at trust
boundaries.

### V. Simplicity and Verifiable Quality
Implementations MUST use the simplest design that satisfies the approved requirements. New
dependencies, abstractions, build steps, or persistent services MUST have a concrete benefit that
outweighs their maintenance cost. Changed behavior MUST have proportionate automated coverage,
and every change MUST pass the repository's formatting, linting, type-checking, testing, and
production-build checks that apply to it. User-interface changes MUST also be verified at relevant
viewport sizes and with an accessibility check. This limits accidental complexity and makes
quality claims reproducible.

## Engineering Constraints

- The site MUST prefer stable web standards and server- or build-produced content over avoidable
  client-side work.
- Layouts MUST remain usable on supported mobile and desktop viewports without horizontal
  overflow or loss of content.
- Public pages MUST provide appropriate titles, descriptions, canonical metadata, and share
  metadata when they are intended for discovery.
- External resources and dependencies MUST be versioned, reviewed for security and licensing,
  and removed when no longer justified.
- Environment-specific configuration MUST be separated from source code. Sensitive values MUST
  be supplied through the deployment environment and fail safely when absent.
- Error states MUST be understandable to visitors and MUST not expose secrets, stack traces, or
  internal system details.

## Delivery Workflow

1. Each feature specification MUST define the visitor or maintenance outcome, acceptance
   scenarios, accessibility expectations, privacy implications, and measurable success criteria.
2. Each implementation plan MUST include a Constitution Check. Any necessary exception MUST be
   recorded with its rationale, owner, risk, and intended removal point before implementation.
3. Work MUST be divided into independently reviewable changes. Reviewers MUST verify the relevant
   acceptance scenarios and constitutional requirements, not only code style.
4. Required automated checks MUST pass before merge. Visual or interaction changes MUST include
   recorded manual verification for keyboard use, responsive layouts, and representative browsers
   until equivalent automated coverage exists.
5. A production release MUST use a reproducible build and have a documented rollback or recovery
   procedure proportionate to its risk. Post-release failures MUST be recorded and converted into
   regression coverage where feasible.

## Governance

This constitution is the highest-authority engineering and delivery policy for katpb.dev. When
another project document conflicts with it, this constitution governs and the conflicting document
MUST be corrected.

Amendments MUST be proposed as a reviewed documentation change that states the motivation, impact,
version bump, and any migration or remediation work. The project owner MUST approve an amendment
before it takes effect. If an amendment invalidates existing work, the proposal MUST include a
time-bounded migration plan.

Constitution versions follow semantic versioning: MAJOR for incompatible principle removals or
redefinitions, MINOR for new principles or materially expanded obligations, and PATCH for
clarifications that do not change obligations. Ratification records the original adoption date;
Last Amended records the effective date of the latest change.

Every feature specification, implementation plan, and code review MUST include an explicit
compliance check. Exceptions MUST be narrow, documented, approved by the project owner, and
revisited at the stated removal point. The constitution MUST be reviewed whenever a material
architecture, data-handling, or delivery-process change is proposed, and at least once every
12 months while the project is active.

**Version**: 1.0.0 | **Ratified**: 2026-10-02 | **Last Amended**: 2026-10-02
