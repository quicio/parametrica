## ADDED Requirements

### Requirement: Working state

Fabricate SHALL show working progress and allow cancellation.

#### Scenario: Running

- **WHEN** a heavy job is running
- **THEN** the status shows WORKING and the phase
- **AND** export is disabled
- **AND** Cancel is available

#### Scenario: Done

- **WHEN** the job completes
- **THEN** the normal report renders
- **AND** export is enabled according to validation

#### Scenario: Error

- **WHEN** the job fails
- **THEN** the reason is shown
- **AND** export remains disabled
