## ADDED Requirements

### Requirement: Topology repair controls

Fabricate SHALL expose topology repair under Repair.

#### Scenario: Controls

- **WHEN** Repair is enabled
- **THEN** the panel offers non-manifold strategies and non-orientable handling
- **AND** no topology repair runs by default

#### Scenario: Report

- **WHEN** topology repair runs
- **THEN** the panel reports split edges, duplicated vertices, cuts, removals
  and remaining errors

#### Scenario: Failure

- **WHEN** topology remains invalid or a closed non-orientable surface is
  requested
- **THEN** export remains disabled
- **AND** the reason identifies the unsupported topology
