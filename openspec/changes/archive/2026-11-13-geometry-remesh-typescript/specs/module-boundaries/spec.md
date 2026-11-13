## ADDED Requirements

### Requirement: Typed voxel remeshing

Voxel remeshing and feature projection SHALL be strict TypeScript.

#### Scenario: Remesh

- **WHEN** meshes are remeshed into an iso-surface
- **THEN** grids, tetrahedra, vertices, projection and repair results are typed
- **AND** remeshed geometry is unchanged

### Requirement: Typed triangle BVH queries

Triangle BVH construction, closest points, inside tests and winding numbers
SHALL be strict TypeScript.

#### Scenario: Query

- **WHEN** inside tests or winding numbers are evaluated
- **THEN** nodes, triangles, rays and results are typed
- **AND** query results are unchanged

### Requirement: Remesh compatibility

The old `geometry/remesh.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** modules import the old path
- **THEN** a compatibility re-export resolves
- **AND** behavior is unchanged
