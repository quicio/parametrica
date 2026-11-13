## 1. Conversion

- [x] 1.1 Type remesh options, stats and results.
- [x] 1.2 Type marching tetrahedra and vertex dedupe.
- [x] 1.3 Type feature projection and closest-point queries.
- [x] 1.4 Type BVH, ray tests, inside and winding.
- [x] 1.5 Keep compatibility export and align SDF repair.

## 2. Verification

- [x] 2.1 Run typecheck, Node, arch and e2e gates.
- [x] 2.2 Archive and release.

## Acceptance criteria

- Remeshing and its BVH are strict TypeScript.
- All existing Node and Playwright suites pass.
- No remesh, projection or inside behavior changes.
