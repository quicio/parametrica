## ADDED Requirements

### Requirement: Typed advisor

The offline advisor and optional providers SHALL be strict TypeScript.

#### Scenario: Suggestions

- **WHEN** paths are resolved and suggestions are validated, clamped or applied
- **THEN** paths, schemas, values and results are typed
- **AND** validation and clamping are unchanged

#### Scenario: Offline analysis

- **WHEN** an offline response is built from descriptors, diffs and rules
- **THEN** summaries, changes, suggestions and caveats are typed
- **AND** deterministic rules are unchanged

#### Scenario: Providers

- **WHEN** a provider is created or run with cache/image options
- **THEN** config, messages, response parsing, cache and fallback are typed
- **AND** network payloads and fallback behavior are unchanged

### Requirement: Advisor compatibility

The old `ai/offline.js` and `ai/provider.js` paths SHALL keep resolving.

#### Scenario: Import

- **WHEN** App, advisor panel or tests import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged
