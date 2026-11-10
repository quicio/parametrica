## 1. Conversion

- [x] 1.1 Type the SVG recorder state and markup helpers.
- [x] 1.2 Type the Exporter port and legacy input normalization.
- [x] 1.3 Type SVG, quad, plotter, PNG, GIF, STL, 3MF and JSON flows.
- [x] 1.4 Keep the compatibility re-exports.
- [x] 1.5 Update the architecture test and dependency rule.

## 2. Verification

- [x] 2.1 Run typecheck, Node, arch and e2e gates.
- [x] 2.2 Archive and release.

## Acceptance criteria

- `SvgContext` and `Exporter` are strict TypeScript.
- All existing export and Playwright suites pass.
- No markup, bytes, downloads or report behavior changes.
