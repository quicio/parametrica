## 1. Conversion

- [x] 1.1 Type spaces, frames, bounds and the view transform.
- [x] 1.2 Type curve/mesh projection and framed scene helpers.
- [x] 1.3 Type viewport descriptors, ranges, ticks and panel layout.
- [x] 1.4 Keep compatibility re-exports and update imports.
- [x] 1.5 Update the scene builder to the typed view contracts.

## 2. Verification

- [x] 2.1 Run typecheck, Node, arch and e2e gates.
- [x] 2.2 Archive and release.

## Acceptance criteria

- The view pipeline is strict TypeScript.
- All existing Node and Playwright suites pass.
- No framing, projection, coordinate or picking behavior changes.
