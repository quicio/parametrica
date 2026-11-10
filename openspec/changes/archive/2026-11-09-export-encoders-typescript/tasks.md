## 1. Conversion

- [x] 1.1 Type the ZIP store writer.
- [x] 1.2 Type the GIF encoder and declare `gifenc`.
- [x] 1.3 Type the binary STL exporter.
- [x] 1.4 Type the 3MF package and triangulation.
- [x] 1.5 Type the geometry export contract.
- [x] 1.6 Keep the compatibility re-exports.

## 2. Verification

- [x] 2.1 Run typecheck, Node, arch and e2e gates.
- [x] 2.2 Archive and release.

## Acceptance criteria

- The export encoders and geometry export contract are strict TypeScript.
- All existing export, timeline and fabrication tests pass.
- No byte, XML, triangulation or units behavior changes.
