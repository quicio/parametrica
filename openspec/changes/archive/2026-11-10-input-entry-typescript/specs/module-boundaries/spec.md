## ADDED Requirements

### Requirement: Typed image tracing

The image tracing pipeline SHALL be strict TypeScript.

#### Scenario: Trace

- **WHEN** image data is thresholded, labelled, traced and converted to Fourier
  harmonics
- **THEN** image data, points, harmonics, contours and results are typed
- **AND** tracing math, limits and output are unchanged

### Requirement: Typed browser entry

The composition root and browser entry SHALL be strict TypeScript.

#### Scenario: Boot

- **WHEN** the browser app starts
- **THEN** createApp options, services, adapters and the App return are typed
- **AND** the same concrete adapters and boot side effects are used

### Requirement: Input/entry compatibility

The old `input/imageTrace.js`, `composition/createApp.js` and `main.js` paths
SHALL keep resolving.

#### Scenario: Import

- **WHEN** UI, tests or HTML reference the old paths
- **THEN** compatibility modules resolve
- **AND** behavior is unchanged
