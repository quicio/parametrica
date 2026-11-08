## Purpose

Define an explicit manufacturing profile and an evidence-based report so
Fabricate can distinguish measured, declared, estimated and unavailable checks,
warn or block consistently, and preserve the same policy in preview, worker and
export.

## ADDED Requirements

### Requirement: Serialized manufacturing profile

Fabricate SHALL support an optional, sanitized `ManufacturingProfile`.

#### Scenario: Defaults

- **WHEN** a document has no manufacturing profile
- **THEN** a default profile is resolved
- **AND** the document version does not change
- **AND** existing presets keep exporting

#### Scenario: Round-trip

- **WHEN** a profile is saved and reloaded
- **THEN** process, minima, overhang angle, gating and orientation survive
- **AND** out-of-range values are clamped

#### Scenario: Presets

- **WHEN** the user selects an FDM, resin or custom profile
- **THEN** the profile exposes its provisional limits
- **AND** the limits are not presented as calibrated guarantees

### Requirement: Evidence-based report

The manufacturing report SHALL report each check with its value, limit, source
and severity.

#### Scenario: Source labels

- **WHEN** a value is produced
- **THEN** it is labelled `measured`, `declared`, `estimated` or `unavailable`
- **AND** a heuristic or proxy is never labelled `measured`

#### Scenario: Unknown state

- **WHEN** a required value cannot be evaluated
- **THEN** the check is `unknown`
- **AND** it is not silently treated as passing

#### Scenario: Checks

- **WHEN** a fabricated body is reported
- **THEN** strut, joint, opening, overhang, bed contact and envelope are
  included where applicable
- **AND** wall thickness is declared or unavailable
- **AND** each check states what was actually evaluated

### Requirement: Export gating

Manufacturing policy SHALL NOT replace geometry validation.

#### Scenario: Hard blocks

- **WHEN** the body is invalid or the physical scale is missing
- **THEN** export is blocked regardless of the manufacturing profile

#### Scenario: Warn mode

- **WHEN** a manufacturing check fails and gating is `warn`
- **THEN** the report shows the warning
- **AND** export remains allowed

#### Scenario: Block mode

- **WHEN** a manufacturing check fails and gating is `block`
- **THEN** export is blocked
- **AND** the reason names the failed check
- **AND** warnings and unknown checks do not block unless configured

### Requirement: Consistent resolution

The resolved profile SHALL reach the worker, report and export without silent
substitution.

#### Scenario: Worker

- **WHEN** a heavy fabrication job runs
- **THEN** the resolved profile travels in the serialized preparation
- **AND** the worker does not choose a different default

#### Scenario: Preview and export

- **WHEN** preview and export run
- **THEN** both use the same source and profile
- **AND** preview may simplify only the display mesh

### Requirement: External validation record

The report SHALL allow a manual slicer verification record without treating it
as an automated gate.

#### Scenario: Manual record

- **WHEN** a user records slicer, material, nozzle, layer height and result
- **THEN** the record is stored as documentation
- **AND** the report does not claim a slicer guarantee
- **AND** CI does not depend on the record
