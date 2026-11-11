## ADDED Requirements

### Requirement: Typed presets

The preset catalog, object builders, built-ins and manager SHALL be strict
TypeScript.

#### Scenario: Catalog

- **WHEN** categories, metadata or search results are produced
- **THEN** categories, metadata and entries are typed
- **AND** grouping and search are unchanged

#### Scenario: Built-ins and builders

- **WHEN** built-in preset factories or fabricate builders create documents
- **THEN** options, layers, units and documents are typed
- **AND** generated documents are unchanged

#### Scenario: Manager

- **WHEN** presets are loaded, saved, parsed, favorited, marked recent or
  previewed
- **THEN** user presets, metadata, preview caches and payloads are typed
- **AND** storage keys and behavior are unchanged

### Requirement: Presets compatibility

The old `presets/*.js` paths for these modules SHALL keep resolving.

#### Scenario: Import

- **WHEN** App, UI or tests import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged
