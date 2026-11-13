## ADDED Requirements

### Requirement: Typed image panel

The image panel SHALL be strict TypeScript.

#### Scenario: Trace

- **WHEN** an image is loaded, thresholded and traced
- **THEN** sources, underlays, results and ports are typed
- **AND** loading, previews and tracing are unchanged

### Requirement: Image panel compatibility

The old `ui/widgets/ImagePanel.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** keep sections import the old path
- **THEN** a compatibility re-export resolves
- **AND** ingest-port checks read the typed module
