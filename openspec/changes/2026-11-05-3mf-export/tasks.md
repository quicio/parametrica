## 1. Package

- [ ] 1.1 Add `export3MF` with the documented result contract.
- [ ] 1.2 Write content types, relationships and model XML.
- [ ] 1.3 Emit one object/build item per body.
- [ ] 1.4 Scale vertices to millimetres without mutating sources.

## 2. Validation and determinism

- [ ] 2.1 Reuse the fabrication validation gate for every body.
- [ ] 2.2 Reject invalid bodies before writing any bytes.
- [ ] 2.3 Fix ZIP timestamps, entry order and object IDs.
- [ ] 2.4 Verify repeated exports are byte-identical.

## 3. UI and tests

- [ ] 3.1 Add STL/3MF format selector and export routing.
- [ ] 3.2 Show object/triangle/unit report.
- [ ] 3.3 Unit tests for package structure, XML and scaling.
- [ ] 3.4 E2E download and report.
- [ ] 3.5 Document the no-materials limitation and run gates.

## Acceptance criteria

- Valid single- and multi-body 3MF packages export deterministically.
- Units are explicit and geometry is not mutated.
- Invalid geometry produces no package.
- Body identity is preserved.
- No materials, import, new dependency or renderer coupling.
