# advanced-repair Specification

## Purpose
Repair common fabrication blockers explicitly: inconsistent orientation,
duplicate or degenerate faces, and open boundaries with deterministic cap
strategies.
## Requirements
### Requirement: Explicit repair

Repair SHALL be opt-in and non-destructive.

#### Scenario: Default

- **WHEN** repair is not enabled
- **THEN** the source mesh is used unchanged
- **AND** existing preparation behavior is preserved

#### Scenario: Enabled

- **WHEN** repair is enabled
- **THEN** a repaired copy is validated
- **AND** the source mesh and render geometry are not mutated
- **AND** the actions are reported

### Requirement: Face cleanup

Repair SHALL remove invalid, degenerate and duplicate faces.

#### Scenario: Invalid face

- **WHEN** a face has invalid indices, fewer than three vertices or repeated
  vertices
- **THEN** it is removed
- **AND** the removal is counted

#### Scenario: Duplicate faces

- **WHEN** two faces share the same vertex set in the same orientation
- **THEN** one is kept
- **WHEN** they share the same vertex set in opposite orientations
- **THEN** both are removed

#### Scenario: Degenerate face

- **WHEN** a face area is below the repair tolerance
- **THEN** it is removed
- **AND** the removal is counted

### Requirement: Weld

Repair SHALL weld coincident vertices with the preparation tolerance.

#### Scenario: Weld

- **WHEN** vertices are within tolerance
- **THEN** they are merged
- **AND** merged and removed-face counts are reported

### Requirement: Orientation repair

Repair SHALL make face orientation consistent across manifold edges.

#### Scenario: Inconsistent faces

- **WHEN** adjacent faces traverse their shared edge in the same direction
- **THEN** one face is flipped
- **AND** the flip is counted

#### Scenario: Inverted shell

- **WHEN** a closed shell has negative signed volume after consistency repair
- **THEN** the whole shell is flipped
- **AND** the shell flip is counted

#### Scenario: Contradiction

- **WHEN** orientation constraints contradict each other or an edge is
  non-manifold
- **THEN** the contradiction is reported
- **AND** validation still fails

### Requirement: Cap strategies

Repair SHALL support fan, planar and automatic boundary caps.

#### Scenario: Fan

- **WHEN** strategy is fan
- **THEN** each eligible loop is capped with a centroid fan

#### Scenario: Planar

- **WHEN** strategy is planar and the projected loop is simple
- **THEN** the loop is triangulated with ear clipping
- **AND** no centroid vertex is added

#### Scenario: Auto

- **WHEN** strategy is auto and the loop is near-planar within tolerance
- **THEN** planar capping is attempted
- **OTHERWISE** fan capping is used

#### Scenario: Fallback

- **WHEN** planar projection or ear clipping fails
- **THEN** the loop falls back to fan
- **AND** the fallback is reported

#### Scenario: Oversized hole

- **WHEN** a loop exceeds `maxHoleEdges`
- **THEN** it is skipped
- **AND** the skip is reported
- **AND** validation reflects the remaining open boundary

### Requirement: Repair report

Repair SHALL return a structured report.

#### Scenario: Actions

- **WHEN** repair changes a mesh
- **THEN** removed faces, welded vertices, caps, fallbacks, flips and skipped
  loops are reported
- **AND** `changed` is true

#### Scenario: No change

- **WHEN** the mesh needs no repair
- **THEN** `changed` is false
- **AND** the source is returned unchanged

#### Scenario: Remaining errors

- **WHEN** repair cannot make the mesh valid
- **THEN** the validation errors are returned
- **AND** no invalid geometry is silently accepted

