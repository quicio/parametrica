## 1. Benchmarks

- [x] 1.1 Software WebGL benchmark.
- [x] 1.2 15/20/25 mm scene capture.
- [x] 1.3 Record frame, triangles, shadow map, DPR and heap.
- [ ] 1.4 Hardware GPU benchmark.
- [ ] 1.5 SSAO high-quality benchmark.

## 2. CI evidence

- [x] 2.1 Lazy-chunk guard.
- [x] 2.2 Pixel-variance visual test.
- [x] 2.3 Context-loss fallback test.
- [ ] 2.4 Stable screenshot baseline across runners.

## 3. Degradation

- [x] 3.1 Explicit fallback to p5.
- [x] 3.2 Automatic preview-quality degradation under budget.
- [x] 3.3 Document measured budgets.

## Acceptance criteria

- Initial bundle excludes Three.js.
- Software benchmark is recorded.
- Hardware benchmark is either recorded or listed as manual-pending.
- Context loss and missing WebGL fall back to p5.
- Existing exports are unchanged.
