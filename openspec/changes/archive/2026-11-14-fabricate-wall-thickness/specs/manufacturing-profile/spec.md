## ADDED Requirements

### Requirement: Estimated wall thickness

Fabricate SHALL estimate minimum wall thickness from the prepared mesh.

#### Scenario: Hollow body

- **WHEN** a hollow body reaches the manufacturing report
- **THEN** the wall check reports a robust minimum (p05), the absolute minimum
  and the median in millimetres
- **AND** the source is `estimated`
- **AND** the detail states how many surface samples were measured

#### Scenario: Solid body

- **WHEN** a solid body is sampled
- **THEN** the reported thickness follows the material between opposite surfaces
- **AND** the bounding box is never used as a substitute

#### Scenario: Unavailable

- **WHEN** the mesh is empty, open or beyond the sampling cap
- **THEN** the wall check is `unknown`
- **AND** it is not treated as passing

#### Scenario: Determinism

- **WHEN** the same mesh, scale and sample budget are measured twice
- **THEN** the reported values are identical

#### Scenario: Gating

- **WHEN** the robust minimum (p05) is below the profile minimum
- **THEN** the check fails
- **AND** warn or block mode decides whether export stops
- **AND** block mode names the wall check in the reason

## MODIFIED Requirements

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
- **AND** wall thickness is measured, estimated or unavailable
- **AND** each check states what was actually evaluated
