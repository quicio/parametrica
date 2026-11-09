## Benchmarks

- Software WebGL: Playwright headless Chromium, fixed 1440x900, standard detail.
- Hardware: same scene, target laptop GPU, manual run.
- Record avg/p95 frame, triangles, draw calls, shadow map, DPR and JS heap.
- Test 15/20/25 mm lattice meshes.
- SSAO measured separately; AO is not a default.

## Budgets (provisional)

- Initial bundle must not include Three.js.
- Standard 20 mm preview should remain interactive; exact FPS is measured, not
  guaranteed.
- Degrade preview detail before falling back to p5.

## CI policy

- Always run lazy-chunk check.
- Always run pixel-variance test (non-black, material/shadow visible).
- Hardware/GPU screenshot baselines are manual until stable across runners.
- WebGL context-loss fallback is tested.

## Acceptance

- Bundle check passes.
- Software benchmark artifact exists.
- Hardware benchmark documented or explicitly pending.
- Fallback and context loss are tested.
