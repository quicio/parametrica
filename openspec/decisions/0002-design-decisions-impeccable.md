# ADR-0002: Design decisions pass through Impeccable

Status: accepted
Date: 2026-11-09
Related: `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json`, ADR-0001

## Context

Parametrica has a strong visual identity but no durable product record and no
written design authority. `PRODUCT.md` and `DESIGN.md` were missing, so product
truth lived in the README and visual rules lived in `style.css`, screenshots and
memory. That makes UI work easy to drift: a new panel can add a second accent,
round a card, shrink functional text or invent a fabrication claim without
anything naming the rule it broke.

The **Impeccable** skill is available in this project. It provides a design
director workflow, the product/design context files, craft-floor rules, scoped
commands and a mechanical detector. Using it only when someone remembers is not
a policy.

## Decision

All user-facing visual, interaction and UX work on Parametrica passes through
the **Impeccable** skill.

### Required workflow

1. Load the skill and run `impeccable context` once per session.
2. Read `PRODUCT.md` and `DESIGN.md` before changing UI.
3. Route the request through the matching Impeccable command:
   - new surface or replacement visual world: `init` (if product context is
     missing) then `shape` / new-work;
   - refinement, audit, typography, layout, motion, copy, responsiveness:
     the scoped command;
   - existing visual system documentation: `document`.
4. Before any UI edit, read the skill's craft-floor reference.
5. After the edit, run the skill's detector over changed UI targets and look at
   the rendered result at its shipping sizes.
6. If the work changes durable product truth, update `PRODUCT.md` through
   `init`, not by ad-hoc prose. If it changes the visual system, update
   `DESIGN.md` and `.impeccable/design.json` through `document`.

### Authority files

- `PRODUCT.md` is the product truth: users, purpose, positioning, operating
  context, capabilities, constraints, brand commitments, evidence, principles
  and accessibility.
- `DESIGN.md` is the visual authority: tokens, typography, layout, elevation,
  shapes, components and do/don't rules.
- `.impeccable/design.json` is the machine-readable sidecar for live tooling and
  component previews.
- `style.css` remains the implementation. When it conflicts with `DESIGN.md`,
  the conflict is resolved explicitly; do not silently let either drift.

### Scope

- Applies to UI, UX copy, layout, typography, color, motion, states, responsive
  behavior and product-facing visual assets.
- Does not apply to geometry math, CSG, export byte formats, storage migrations
  or other non-visual engine work, except where they change the UI that exposes
  them.
- A visual change that is expensive to reverse also needs an ADR.

### Review gate

A UI delivery is not complete until:

- `PRODUCT.md` and `DESIGN.md` still describe the delivered behavior;
- the Impeccable detector has no unexplained findings;
- keyboard, focus, reduced-motion and 200% zoom behavior survive;
- the version/changelog release process in ADR-0001 is followed.

## Alternatives considered

### Use Impeccable only for occasional redesigns

Rejected. The project already has many small UI deliveries; drift happens in
the small changes, not only in redesigns.

### Keep visual rules only in `style.css`

Rejected. CSS records what exists, not why it exists or what future work must
preserve. It cannot state product truth, anti-references or do/don't rules in a
form an agent can apply.

### Let each contributor choose their own design process

Rejected. The instrument identity depends on restraint: one red signal, zero
radius, hairlines, functional type. Ad-hoc processes erode exactly those
constraints.

### Treat DESIGN.md as optional documentation

Rejected. Missing DESIGN.md is a documentation gap, not permission to invent a
new world. The incumbent implementation is evidence; the written system is the
authority future work must preserve or explicitly replace.

## Consequences

- UI work becomes slightly slower at the start because context and the scoped
  command are mandatory.
- The product and visual system become reviewable, testable and portable across
  agents.
- Product claims and fabrication copy have a single source of truth.
- `PRODUCT.md`, `DESIGN.md` and the sidecar must be kept current; stale context
  is a defect, not a historical record.
- The Impeccable skill becomes a project dependency for design work. If it is
  unavailable, follow the skill's fallback: read the existing context files and
  craft-floor directly, and state the substitution.
- The detector and the existing accessibility/e2e gates remain complementary:
  neither replaces the other.
