## 1. Detection

- [x] 1.1 Add deterministic BVH broad phase.
- [x] 1.2 Add triangle-triangle interval and coplanar tests.
- [x] 1.3 Exclude shared-vertex adjacency and bound reported pairs.
- [x] 1.4 Return checked status, count and truncated flag.

## 2. Validation and fabrication

- [x] 2.1 Integrate the result into `validateMesh` meta and errors.
- [x] 2.2 Reject solids and STL export when pairs are found.
- [x] 2.3 Surface validation errors in Fabricate.

## 3. UI and tests

- [x] 3.1 Show self-intersection count and errors in Fabricate.
- [x] 3.2 Verify clean meshes remain valid and intersecting meshes are rejected.
  - Verify: unit crossing/coplanar/adjacent/deterministic cases; e2e rejection.

## 4. Acceptance

- [x] 4.1 Document tolerance, adjacency and bounded-report limits.
- [x] 4.2 Run `npm run check`, `npm run test:e2e`, strict OpenSpec validation
      and archive.

## Acceptance criteria

- Self-intersections are detected deterministically and reported.
- Shared-vertex adjacency is not a false positive.
- Fabrication rejects intersecting geometry without repair.
- Clean meshes keep exporting.
- No CSG, multi-body or new dependency.
