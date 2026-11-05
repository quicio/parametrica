## Context

The engine caches instance geometry and meshes; p5 redraws at 60 fps. Known Node
numbers are not browser numbers.

## Decisions

### D1: Benchmark scenario

- Source: `parametric-surface`, 64×32.
- 24 instance layers with translate/rotate/scale.
- Active layer: first instance.
- Measure:
  - first `evaluateDocument` cold,
  - second cached evaluation,
  - projection/render scene build,
  - one p5 frame budget if practical,
  - curve/point counts.

### D2: Harness

Add a Playwright benchmark helper or a development-only page that builds the
document via public APIs. Record results in `docs/instance-performance.md`.

### D3: Budgets

- Cold evaluation target: < 500 ms on the development machine.
- Cached evaluation target: < 50 ms.
- 24 instances must render without errors or budget clipping.
- A regression > 25% on the same machine triggers investigation.
- If cold or frame budget is repeatedly exceeded, propose instanced rendering
  as a separate change.

### D4: No premature optimization

Do not add instanced rendering from this slice. Measure first.

## Risks / Trade-offs

- Browser timing is noisy; use medians and document the machine.
- Benchmark code can drift from the real UI; build via App APIs.
- 24 instances remain an explicit limit.

## Open Questions

- Should the benchmark be CI-gated or manual?
