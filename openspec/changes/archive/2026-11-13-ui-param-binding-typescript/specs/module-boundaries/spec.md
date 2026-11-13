## ADDED Requirements

### Requirement: Typed parameter binding

Parameter type registration and stage binding SHALL be strict TypeScript.

#### Scenario: Bind

- **WHEN** generator/operator params are bound to lil-gui
- **THEN** definitions, contexts, stages, controllers and entries are typed
- **AND** created controls and folders are unchanged

### Requirement: Param binding compatibility

The old `ui/params/ParamRegistry.js` and `ui/params/StageEditor.js` paths SHALL
keep resolving.

#### Scenario: Import

- **WHEN** Controls or OperatorStack import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged
