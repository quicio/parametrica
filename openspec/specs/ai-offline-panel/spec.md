# ai-offline-panel Specification

## Purpose
Deliver a useful, deterministic advisor before any model is involved: explain
changes, suggest grounded experiments and apply only what the user confirms.
## Requirements
### Requirement: Offline narration

The advisor SHALL explain the difference between two checkpoints using
parameter and descriptor diffs.

#### Scenario: Evolution explanation

- **WHEN** two checkpoints differ by repeat count and symmetry
- **THEN** the summary names both changes

### Requirement: Rule-based suggestions

The advisor SHALL propose up to five actionable suggestions using current
document paths and schema ranges.

#### Scenario: Valid path

- **WHEN** a suggestion targets an existing operator parameter
- **THEN** it includes current value, proposed value and rationale

#### Scenario: Unknown path

- **WHEN** a suggestion path does not resolve
- **THEN** it is rejected before display

### Requirement: Explicit application

Suggestions SHALL show a preview and apply only on explicit confirmation
through history.

#### Scenario: Apply

- **WHEN** the user applies a valid suggestion
- **THEN** the document changes and can be undone

### Requirement: No network

The offline advisor SHALL make no network request.

#### Scenario: Offline mode

- **WHEN** the app has no provider configured
- **THEN** narration and suggestions still work
