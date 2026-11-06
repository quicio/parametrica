## 1. Preview

- [x] 1.1 Add the persisted Network/Solid setting.
- [x] 1.2 Inject the prepared mesh into the active scene layer.
- [x] 1.3 Add the depth-banded lattice preview pass.
- [x] 1.4 Simplify dense display meshes and cache them by source identity.
- [x] 1.5 Fall back to the network during drags and playback.
- [x] 1.6 Keep the toggle out of the fabrication job key.

## 2. Tests and acceptance

- [x] 2.1 Scene injection domain tests.
- [x] 2.2 E2E toggle and rendered-scene assertions.
- [x] 2.3 Docs and counts.
- [x] 2.4 Run node, build, spec and e2e gates.
- [x] 2.5 Archive the change.

## Acceptance criteria

- The lattice preset shows the prepared solid in Fabricate by default.
- Network/Solid toggling is immediate and does not rebuild the body.
- Export still uses the full-resolution prepared mesh.
- Orbiting remains responsive.
