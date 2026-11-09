## 1. Port

- [x] 1.1 Define and inject the export port.
- [x] 1.2 Replace App access in `Exporter`.
- [x] 1.3 Create the port in composition.
- [x] 1.4 Keep the legacy unit-fixture shape.

## 2. Verification

- [x] 2.1 Add exporter boundary checks.
- [x] 2.2 Run Node and e2e gates.
- [x] 2.3 Archive and release.

## Acceptance criteria

- `Exporter` never accesses `this.app`.
- Composition creates the export port.
- SVG/PNG/GIF/STL/3MF output is unchanged.
