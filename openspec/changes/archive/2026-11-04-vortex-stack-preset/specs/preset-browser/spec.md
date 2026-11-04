## ADDED Requirements

### Requirement: Compositions category

The preset browser SHALL expose a Compositions category for layered and
instanced documents.

#### Scenario: Category

- **WHEN** the preset browser opens
- **THEN** Compositions appears with a count
- **AND** Vortex Stack is listed under it

#### Scenario: Search

- **WHEN** the user searches for `vortex`, `composition` or `instance`
- **THEN** Vortex Stack matches

### Requirement: Composition generator badge

Built-in entries SHALL resolve a generator badge for documents whose active
layer is an instance.

#### Scenario: Instance-active preset

- **WHEN** a built-in composition has an instance active layer
- **THEN** its badge uses the first generator layer
- **AND** the badge is not `unknown`

#### Scenario: Existing presets

- **WHEN** existing built-in presets are listed
- **THEN** their generator badges remain unchanged
