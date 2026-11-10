## 1. Conversion

- [x] 1.1 Define the shared pass context and data contract.
- [x] 1.2 Type the core, points, wireframe and control-polygon passes.
- [x] 1.3 Type the gradient wireframe and ramp helpers.
- [x] 1.4 Type the tangent, normal and curvature passes.
- [x] 1.5 Type the negative-space, SDF and topology passes.
- [x] 1.6 Type the epicycle and surface/lattice passes.
- [x] 1.7 Keep the compatibility re-exports and update imports.

## 2. Verification

- [x] 2.1 Run typecheck, Node, arch and e2e gates.
- [x] 2.2 Archive and release.

## Acceptance criteria

- The render passes and shared contract are strict TypeScript.
- All existing render, export and Playwright suites pass.
- No drawing, ordering or preview behavior changes.
