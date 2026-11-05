# look-presets Specification

## Purpose
Provide named, built-in visual starting points for Look and a predictable reset,
without changing the document geometry or style.
## Requirements
### Requirement: Built-in visual presets

Look SHALL expose built-in visual presets.

#### Scenario: Preset list

- **WHEN** the user opens the Looks section
- **THEN** Line, Technical, Surface, Gradient, Diagnostic and Field are listed
- **AND** each preset has a short description

#### Scenario: Apply

- **WHEN** the user applies a preset
- **THEN** view passes, overlays, color metric and guides are updated
- **AND** geometry, style, units, camera and fabrication state are unchanged

#### Scenario: Reset

- **WHEN** the user resets the look
- **THEN** the Line preset is applied
- **AND** diagnostic overlays are cleared

### Requirement: Preset availability

Unavailable presets SHALL remain visible but disabled with a reason.

#### Scenario: Surface preset on curves

- **WHEN** the active layer has no Mesh
- **THEN** Surface is disabled
- **AND** the UI explains that it requires surface geometry

#### Scenario: Fourier preset

- **WHEN** the active generator is not Fourier
- **THEN** a Fourier-only preset is disabled with a reason

### Requirement: View-only effect

Presets SHALL NOT mutate document geometry, style, units or exports.

#### Scenario: Geometry invariance

- **WHEN** any preset is applied
- **THEN** world/artboard geometry, bbox and SurfaceMapping remain unchanged

#### Scenario: Style invariance

- **WHEN** any preset is applied
- **THEN** stroke, fill, blend and palette remain unchanged

### Requirement: User look library

Looks SHALL distinguish built-in and user-authored recipes.

#### Scenario: UI

- **WHEN** the Looks section is open
- **THEN** built-in presets appear in the preset grid
- **AND** user looks appear in a separate list with apply/delete actions

#### Scenario: Isolation

- **WHEN** a user look is applied
- **THEN** the active document geometry and history content are not replaced

