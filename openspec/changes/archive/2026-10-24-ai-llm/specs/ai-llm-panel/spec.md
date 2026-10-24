## Purpose

Add an optional, privacy-aware LLM layer on top of deterministic observation
without letting the model mutate geometry or invent parameters.

## ADDED Requirements

### Requirement: Provider abstraction

The app SHALL support `fake`, `ollama` and `openai-compatible` providers
behind one interface.

#### Scenario: Fake provider in CI

- **WHEN** tests run with the fake provider
- **THEN** no network request is made and responses are deterministic

#### Scenario: Provider unavailable

- **WHEN** the selected provider is unreachable
- **THEN** the app reports the failure and keeps offline analysis usable

### Requirement: Grounded prompt

The prompt SHALL contain only the descriptor, diffs, sensitivity and document
summary, plus a thumbnail only when opted in.

#### Scenario: No image by default

- **WHEN** image opt-in is off
- **THEN** no image data is sent

### Requirement: Structured validation

Model output SHALL be parsed into `AdvisorResponse` and validated before
display.

#### Scenario: Invalid path

- **WHEN** the model suggests a nonexistent parameter path
- **THEN** the suggestion is rejected

#### Scenario: Out-of-range value

- **WHEN** a numeric suggestion is outside schema range
- **THEN** it is clamped or rejected and flagged

### Requirement: Explicit application

LLM suggestions SHALL require preview and explicit Apply through history.

#### Scenario: Apply

- **WHEN** the user applies a valid suggestion
- **THEN** the document changes and is undoable

### Requirement: Caching and triggering

Responses SHALL be cached by document hash/provider/prompt and automatic
analysis SHALL debounce on stable commits only.

#### Scenario: Cache hit

- **WHEN** the same document is analyzed again
- **THEN** the cached response is used

#### Scenario: Animation

- **WHEN** animation is playing
- **THEN** no per-frame request is made

### Requirement: Privacy disclosure

The panel SHALL state what is sent and SHALL default to no network.

#### Scenario: Default

- **WHEN** no provider is configured
- **THEN** no data leaves the browser
