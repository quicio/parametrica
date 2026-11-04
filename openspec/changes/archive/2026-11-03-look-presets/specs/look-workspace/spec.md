## ADDED Requirements

### Requirement: Render pass control semantics

Render SHALL expose one unambiguous on/off control per pass and a separately
labeled opacity control.

#### Scenario: Enable and opacity

- **WHEN** a pass is off
- **THEN** its opacity control is disabled
- **AND** when the pass is on
- **THEN** opacity is enabled and shows its current percentage

#### Scenario: Unavailable pass

- **WHEN** a pass cannot apply to the active visible geometry
- **THEN** its on/off control is disabled
- **AND** the row shows an unavailable state and a reason
- **AND** it is not silently removed from the configured pass list

### Requirement: Applicability visibility

Controls that cannot affect the active layer SHALL be disabled with a reason.

#### Scenario: Surface-only Canvas controls

- **WHEN** the active layer has no surface or mesh
- **THEN** UV Domain, Inspect and Seams are disabled
- **AND** the UI explains that they require surface geometry

#### Scenario: Coordinates on non-spatial layers

- **WHEN** the active layer has no spatial transform
- **THEN** Coordinates controls are disabled
- **AND** the UI explains that they require spatial geometry

### Requirement: Looks section

Look SHALL expose built-in visual presets in a Looks section.

#### Scenario: Ownership

- **WHEN** the user opens Looks
- **THEN** preset selection and reset are available
- **AND** the controls are identified as view/appearance settings
