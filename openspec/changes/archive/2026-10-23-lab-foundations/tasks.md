## 1. Roadmap and coordination

- [x] 1.1 Write `openspec/roadmap.md` with vision, modes, capability map,
  phases, vertical slices, dependency graph, DoR/DoD, methodology, metrics,
  parking lot and open decisions.
- [x] 1.2 Add `openspec/decisions/README.md` with the ADR format.
- [x] 1.3 Reference the roadmap and decisions directory from
  `openspec/config.yaml` project context.

## 2. Foundation proposal and design

- [x] 2.1 Write `proposal.md` with Why, What Changes, Capabilities, Impact and
  Non-goals.
- [x] 2.2 Write `design.md` with decisions D1–D7: descriptor, snapshots,
  checkpoints, exploration, document v3, AI advisor and versioning.
- [x] 2.3 Document every formula and schema unambiguously (descriptor metrics,
  sensitivity, sweep/morph sampling, layer model).

## 3. Foundational capability specs

- [x] 3.1 `figure-observation`: descriptor fields, document hash, metrics,
  sensitivity, stable snapshots and evolution diff.
- [x] 3.2 `lab-notebook`: checkpoint schema, reproducibility, thumbnails,
  lineage, A/B compare, notes/tags and persistence.
- [x] 3.3 `exploration-session`: parameter refs, Solo/Lock, 1D/2D sweeps,
  directed randomisation, morph, adoption and budgets.
- [x] 3.4 `composition-model`: document v3 layers, evaluation isolation,
  render order, style, artboard, migration, descriptor aggregation and export.
- [x] 3.5 `ai-advisor`: grounded input, structured response, validation,
  explicit application, providers, privacy, triggers/cache and offline fallback.

## 4. Verification and archive

- [x] 4.1 Run `openspec validate lab-foundations` and fix any structural issue.
- [x] 4.2 Confirm every requirement has at least one scenario and every
  capability referenced by the proposal has a spec file.
- [x] 4.3 Archive `lab-foundations` so the contracts become canonical specs in
  `openspec/specs/`.
- [x] 4.4 Confirm no production code, document version or dependency changed in
  this phase.

## 5. Handoff to the first vertical slice

- [x] 5.1 Confirm `lab-observer` is the walking skeleton.
- [x] 5.2 Verify the roadmap links `lab-observer` to `figure-observation` and
  to the parameter-doc/descriptor/sensitivity requirements.
- [x] 5.3 Mark the foundation status as ready for implementation.
