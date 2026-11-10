## ADDED Requirements

### Requirement: Typed SVG recorder

The SVG recorder SHALL be strict TypeScript.

#### Scenario: Pass replay

- **WHEN** render passes draw into the recorder
- **THEN** fill, stroke, weight, cap, join, text, shapes, gradients and markup
  state are typed
- **AND** emitted SVG is unchanged

### Requirement: Typed export adapter

The Exporter SHALL be strict TypeScript and depend only on its export port.

#### Scenario: Export port

- **WHEN** SVG, PNG, GIF, STL, 3MF or JSON export runs
- **THEN** the adapter reads document, evaluation, renderer, fabrication and
  serialization state through `ExportPort`
- **AND** a legacy plain context is normalized to the same port

#### Scenario: Exports

- **WHEN** a user builds SVG, quad or plotter SVG, PNG, GIF, STL, 3MF or JSON
- **THEN** builder inputs and results are typed
- **AND** output and download behavior are unchanged

### Requirement: Exporter compatibility

The old `export/svgContext.js` and `export/Exporter.js` paths SHALL keep
resolving.

#### Scenario: Import

- **WHEN** composition, tests or UI import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged
