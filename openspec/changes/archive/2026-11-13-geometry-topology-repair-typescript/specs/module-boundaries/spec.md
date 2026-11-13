## ADDED Requirements

### Requirement: Typed topology repair

Non-manifold fan splitting and non-orientable seam cuts SHALL be strict
TypeScript.

#### Scenario: Repair

- **WHEN** a mesh has non-manifold or non-orientable topology
- **THEN** edges, fans, conflicts, vertices and reports are typed
- **AND** topology output and report counters are unchanged

### Requirement: Topology repair compatibility

The old `geometry/topologyRepair.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** modules import the old path
- **THEN** a compatibility re-export resolves
- **AND** behavior is unchanged
