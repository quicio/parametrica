## ADDED Requirements

### Requirement: Typed lab support

The lab parameter, workspace, summary, diff, hash and sensitivity helpers SHALL
be strict TypeScript.

#### Scenario: Parameter refs

- **WHEN** numeric parameter references, schemas or stage paths are resolved
- **THEN** refs, schemas and stages are typed
- **AND** generator/operator ordering is unchanged

#### Scenario: Workspace

- **WHEN** projects, series or the active notebook target are resolved
- **THEN** notebook hosts, projects, series and targets are typed
- **AND** fallback rules are unchanged

#### Scenario: Summary and diffs

- **WHEN** a parametric summary or document/descriptor diff is built
- **THEN** rows, leaves, paths and deltas are typed
- **AND** filtering and formatting are unchanged

#### Scenario: Hashing and sensitivity

- **WHEN** content is canonically hashed or parameters are sensitivity-probed
- **THEN** canonical JSON, SHA-256 and probe results are typed
- **AND** digests and impact values are unchanged

### Requirement: Lab support compatibility

The old lab support `.js` paths SHALL keep resolving.

#### Scenario: Import

- **WHEN** App, notebook, exploration, advisor, UI or tests import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged
