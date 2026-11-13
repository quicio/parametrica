## ADDED Requirements

### Requirement: Typed robust predicates

Orientation, exact determinants, snapping and adaptive tolerances SHALL be
strict TypeScript.

#### Scenario: Predicate evaluation

- **WHEN** points are classified or snapped
- **THEN** points, boxes and tolerances are typed
- **AND** signs, epsilons and snapped values are unchanged

### Requirement: Typed self-intersection detection

Triangle self-intersection diagnostics SHALL be strict TypeScript.

#### Scenario: Detection

- **WHEN** a mesh is checked for self-intersections
- **THEN** triangles, BVH nodes and face pairs are typed
- **AND** reported pairs, limits and truncation are unchanged

### Requirement: Predicate compatibility

The old `geometry/robustPredicates.js` and `selfIntersection.js` paths SHALL
keep resolving.

#### Scenario: Import

- **WHEN** modules import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged
