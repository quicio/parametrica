## ADDED Requirements

### Requirement: Typed SDF repair and joints

Signed-distance repair and local joint blending SHALL be strict TypeScript.

#### Scenario: Repair

- **WHEN** a mesh is reconstructed or a joint is blended from capsules
- **THEN** SDF points, bounds, options and stats are typed
- **AND** reconstruction parameters are unchanged

### Requirement: Typed lattice spec and perforation

Lattice normalization and perforation cutters SHALL be strict TypeScript.

#### Scenario: Normalize

- **WHEN** lattice params are normalized or holes are generated
- **THEN** specs, profiles, seeds and cutters are typed
- **AND** hashes, hole placement and limits are unchanged

### Requirement: Fabrication helper compatibility

The old `geometry/sdfRepair.js`, `latticeSpec.js`, `latticeJointBlend.js` and
`perforation.js` paths SHALL keep resolving.

#### Scenario: Import

- **WHEN** modules import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged
