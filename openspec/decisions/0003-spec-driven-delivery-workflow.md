# ADR-0003: Spec-driven vertical delivery workflow

Status: accepted
Date: 2026-11-09
Related: `openspec/`, `openspec/roadmap.md`, ADR-0001, ADR-0002

## Context

OpenSpec is already initialized and is the project's working contract:

- `openspec/specs/` holds the living behavioral specs.
- `openspec/changes/` holds active slices; `openspec/changes/archive/` holds
  delivered history.
- `openspec/decisions/` holds ADRs.
- `openspec/roadmap.md` is the living plan.

The repository has 125 living specs and 108 archived changes. The working
method that produced them is real but implicit. That is a risk: a future agent
can copy the artifacts without the discipline, skip tests, archive an
incomplete change, or treat a product spec as a process document.

This ADR records the current method so it is durable, reviewable and teachable.
It does not introduce a new process; it names the one already in use.

## Decision

Adopt **spec-driven vertical delivery** as the operating model.

### Work unit

One vertical slice = one OpenSpec change.

A change may contain several specs, but it must produce one demoable,
testable behavior slice. Avoid horizontal “refactor everything” changes that
cannot be accepted or archived on their own.

### Lifecycle

1. **Frame the slice** in `openspec/roadmap.md` or the request.
2. **Create the change** at
   `openspec/changes/YYYY-MM-DD-<slug>/` with:
   - `proposal.md` — why, what changes, non-goals;
   - `design.md` — contracts, alternatives, acceptance;
   - `tasks.md` — small, test-linked tasks;
   - `specs/<capability>/spec.md` — ADDED/MODIFIED/REMOVED requirements.
3. **Validate the artifacts** with
   `openspec validate <change> --strict`.
4. **Implement** code, tests, docs and UI. A task is not done until its test
   exists.
5. **Run the gates**:
   - `openspec validate <change> --strict`;
   - `npm run check` (lint, Node suites, build, bundle guard, spec purposes,
     version/changelog);
   - `npm run test:e2e`;
   - the relevant visual/accessibility checks when the slice changes UI.
6. **Archive** only when the slice is demoable and tested:
   `openspec archive <change> -y`.
7. **Release** per ADR-0001: bump `package.json`, update `CHANGELOG.md`,
   commit `Release vX.Y.Z`, create and push the annotated tag.
8. **Deploy**: the GitHub Pages workflow publishes `main`; verify the live URL
   when the release changes the app.

### Artifact responsibilities

| Artifact | Owns |
|---|---|
| `openspec/changes/` | Active work: proposal, design, tasks, spec deltas. |
| `openspec/specs/` | Living behavior after archive. This is the contract code must satisfy. |
| `openspec/changes/archive/` | Historical intent and evidence. Never edit archived changes. |
| `openspec/decisions/` | Expensive-to-reverse and process decisions. |
| `openspec/roadmap.md` | Living plan, status and open decisions. |
| `PRODUCT.md` | Product truth (ADR-0002). |
| `DESIGN.md` | Visual authority (ADR-0002). |
| `README.md` | Orientation, quick start, current feature surface. |
| `SPEC.md` | Canonical engine/product rationale and historical milestones. |
| `CHANGELOG.md` | Released, user-visible change history. |

### Rules

- **No production behavior change without a validated active change**, except
  documentation-only maintenance and release plumbing. A docs-only patch may
  go directly to `main` as a PATCH release.
- **No archive without green gates.** Archiving is the acceptance act.
- **No ADR without a decision.** ADRs record choices that are expensive to
  reverse, not meeting notes.
- **No design change outside Impeccable** (ADR-0002). Product truth changes go
  through `PRODUCT.md`; visual-system changes go through `DESIGN.md`.
- **No untested task.** Every task points at the test or evidence that proves
  it.
- **One `main` branch.** Deliveries are commit sets; tags mark releases. There
  is no long-lived feature branch or PR-only gate in this repository.
- **Spikes are timeboxed.** A spike outputs an ADR or a measurement artifact,
  not unmerged production code.
- **The user is the product director.** The agent writes specs, code, tests and
  evidence; the user confirms product direction and accepts deliveries.

### Current gates

| Gate | Command |
|---|---|
| Spec validity | `openspec validate <change> --strict` |
| Lint + Node + build + bundle + specs + version | `npm run check` |
| End-to-end | `npm run test:e2e` |
| Version/changelog consistency | `npm run check:version` (inside `check`) |
| Pages deployment | `.github/workflows/pages.yml` |

## Alternatives considered

### Ad-hoc commits with no active change

Rejected. The project already has 125 living contracts; ad-hoc behavior changes
would make the specs historical fiction.

### Write the spec after implementation

Rejected. The spec would describe what happened rather than what was agreed,
and tests would be retrofitted to the implementation.

### One giant product spec per release

Rejected. It hides the change boundary, makes review impossible and makes
archive history meaningless.

### Require pull requests and long-lived branches

Rejected for the current single-maintainer workflow. The same gates run on
`main`; tags provide release boundaries. A PR workflow can be added later
without changing the artifact model.

### Treat ADRs as product specs

Rejected. Product behavior belongs in `openspec/specs/`; process and
irreversible architecture decisions belong in `openspec/decisions/`.

## Consequences

- Every behavior change has a reviewable intent, a living contract, tests and a
  release tag.
- The archive becomes the project's delivery history.
- The workflow has real overhead: proposal, spec deltas, gates, changelog and
  tag. That overhead is the price of traceability across many agent sessions.
- Documentation-only maintenance can stay lightweight as a PATCH release.
- Future agents should read `PRODUCT.md`, `DESIGN.md`, the active change, the
  relevant living spec and the roadmap before editing.
- If the workflow changes, a new ADR supersedes this one.
