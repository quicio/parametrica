## ADDED Requirements

### Requirement: Typed composed mesh repair

Cleanup, welding, caps, orientation repair and the composed repair result SHALL
be strict TypeScript.

#### Scenario: Repair

- **WHEN** a mesh is repaired for fabrication
- **THEN** reports, edges, shells, caps and validations are typed
- **AND** repaired geometry and report counters are unchanged

### Requirement: Typed self-intersection repair

Remesh-based self-intersection repair SHALL be strict TypeScript.

#### Scenario: Resolve

- **WHEN** self-intersections are resolved through SDF or remesh
- **THEN** detection, strategy reports and deltas are typed
- **AND** strategy selection and output geometry are unchanged

### Requirement: Repair compatibility

The old `geometry/repair.js` and `selfIntersectionRepair.js` paths SHALL keep
resolving.

#### Scenario: Import

- **WHEN** modules import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged
