## 1. Harness

- [x] 1.1 Add the 24-instance benchmark scenario.
- [x] 1.2 Capture cold/cached evaluation and render timing.
- [x] 1.3 Document machine, medians and counts.

## 2. Guardrails

- [x] 2.1 Add an e2e smoke that renders 24 instances without errors.
- [x] 2.2 Document the threshold for proposing instanced rendering.
  - Verify: benchmark rerun, smoke e2e and no budget clipping.

## 3. Acceptance

- [x] 3.1 Publish the benchmark results.
- [x] 3.2 Run `npm run check`, `npm run test:e2e`, strict OpenSpec validation
      and archive.

## Acceptance criteria

- A repeatable 24-instance benchmark exists.
- Cold and cached timings are documented.
- The limit renders without errors.
- No instanced rendering is added in this slice.
- A future optimization decision is evidence-based.
