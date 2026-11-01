## ADDED Requirements

### Requirement: Injectable dialogs

Panels SHALL request user input and confirmation through an injectable dialog
service.

#### Scenario: Create project

- **WHEN** the user creates a project
- **THEN** the panel calls `dialogs.prompt`
- **AND** the production implementation renders a styled accessible dialog

#### Scenario: Test fake

- **WHEN** the test harness injects a fake dialog service
- **THEN** prompts and confirmations resolve without browser-native modals
- **AND** the panel remains fully testable

### Requirement: No native blocking modals

Notebook and other panels SHALL NOT call `window.prompt` or `window.confirm`
directly.

#### Scenario: Delete project

- **WHEN** the user deletes a non-Inbox project
- **THEN** the confirmation comes from the dialog service
- **AND** cancelling leaves projects, series and checkpoints unchanged
