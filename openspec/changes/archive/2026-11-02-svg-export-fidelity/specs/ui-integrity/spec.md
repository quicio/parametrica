## MODIFIED Requirements

### Requirement: Export fidelity is explicit

Export SHALL either reproduce the active render features or state which
features are omitted.

#### Scenario: SVG vector fidelity

- **WHEN** the active scene uses vector render passes, diagnostics, overlays or
  blend modes
- **THEN** the SVG exporter reproduces them or reports a raster-only omission
- **AND** it does not warn about features that are represented

#### Scenario: SVG omissions

- **WHEN** the active scene contains a feature the SVG exporter cannot
  represent as vector primitives (currently Signed Distance)
- **THEN** the user receives a visible notice naming the omission
- **AND** the export does not silently imply full fidelity

#### Scenario: PNG fidelity

- **WHEN** the user exports PNG
- **THEN** the raster reflects the active render scene
- **AND** reference-only underlays remain excluded from captured output
