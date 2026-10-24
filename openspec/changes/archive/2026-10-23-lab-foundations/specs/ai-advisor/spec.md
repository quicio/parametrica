## Purpose

Make the AI a grounded collaborator: it receives deterministic observations,
explains what changed and proposes validated next experiments without ever
becoming the source of geometry or mutating the document on its own.

## ADDED Requirements

### Requirement: Grounded analysis input

The advisor SHALL accept `AdvisorInput` version `1` with the current
descriptor, optional previous descriptor, parameter diff, descriptor diff,
sensitivity, a document summary and an optional question, as defined in
`design.md` §D6. Images SHALL be excluded unless explicitly enabled.

#### Scenario: Analysis without a previous form

- **WHEN** the user analyses a single figure
- **THEN** `previous` may be absent
- **AND** the summary describes the current descriptor only

#### Scenario: Evolution analysis

- **WHEN** the user compares checkpoint A with checkpoint B
- **THEN** the input contains both descriptors, the parameter diff and the
  descriptor diff

#### Scenario: No implicit image upload

- **WHEN** the user has not enabled preview images
- **THEN** the advisor input contains no image or data URL

### Requirement: Structured advisor response

The advisor SHALL return `AdvisorResponse` version `1` with `summary`,
`changes`, `suggestions` and `caveats`, using the suggestion schema in
`design.md` §D6.

#### Scenario: Response shape

- **WHEN** a provider returns a successful analysis
- **THEN** every suggestion has `id`, `path`, `from`, `to`, `rationale`,
  `expectedEffect`, `confidence` and `kind`

#### Scenario: Invalid provider output

- **WHEN** the provider returns malformed JSON or a missing required field
- **THEN** the response is rejected
- **AND** the UI shows a recoverable error

### Requirement: Suggestion validation

Every suggestion SHALL be validated against the current document and schema
before being shown as applicable.

#### Scenario: Unknown parameter path

- **WHEN** a suggestion references a path that does not exist
- **THEN** the suggestion is marked invalid and cannot be applied

#### Scenario: Numeric clamping

- **WHEN** a suggestion proposes a numeric value outside the schema range
- **THEN** it is clamped for preview and flagged
- **AND** non-finite values are rejected

#### Scenario: Select options

- **WHEN** a suggestion targets a select parameter
- **THEN** the proposed value must be one of the schema options

### Requirement: Suggestion application is explicit

The advisor SHALL never mutate the document directly. Applying a suggestion
SHALL require an explicit user action, SHALL show a before/after preview and
SHALL use the normal evaluation and history path.

#### Scenario: Apply a valid suggestion

- **WHEN** the user applies a valid suggestion
- **THEN** the document changes only after confirmation
- **AND** the change can be undone

#### Scenario: Invalid candidate

- **WHEN** applying a suggestion produces evaluation errors or a degenerate
  figure
- **THEN** the change is rejected and the document remains unchanged

### Requirement: Provider abstraction

The advisor SHALL depend on an `AiProvider` interface supporting `fake`,
`ollama` and `openai-compatible` implementations. The fake provider SHALL be
deterministic and used in CI.

#### Scenario: CI offline

- **WHEN** automated tests run with the fake provider
- **THEN** no network request is made
- **AND** responses are deterministic

#### Scenario: Provider failure

- **WHEN** the configured provider is unreachable
- **THEN** the app reports the failure and keeps the offline analysis usable

### Requirement: Privacy and data scope

The advisor SHALL disclose what is sent to a provider. Document JSON,
descriptors and parameter values MAY be sent only after the AI feature is
explicitly configured; images are opt-in. No telemetry is emitted.

#### Scenario: Default configuration

- **WHEN** the user has not configured a provider
- **THEN** no data leaves the browser
- **AND** only offline analysis is available

#### Scenario: Image opt-in

- **WHEN** the user enables preview images
- **THEN** the UI states that a thumbnail will be sent
- **AND** disabling the option restores JSON-only analysis

### Requirement: Triggering and caching

Automatic analysis SHALL be debounced by 700 ms after a stable commit, only
while the AI panel is open. It SHALL never run on every animation frame.
Responses SHALL be cached by document hash, descriptor version, provider and
prompt version.

#### Scenario: Debounce

- **WHEN** the user drags a slider continuously for two seconds
- **THEN** at most one automatic analysis is requested after settling

#### Scenario: Cache hit

- **WHEN** the same document and provider configuration are analysed again
- **THEN** the cached response is used without a provider call

### Requirement: Offline fallback

The app SHALL produce deterministic offline explanations and suggestions
from the descriptor diff and sensitivity without any LLM.

#### Scenario: No provider

- **WHEN** no AI provider is configured
- **THEN** the evolution panel still explains parameter and metric changes
- **AND** it still offers rule-based suggestions

#### Scenario: Offline and LLM agree on validation

- **WHEN** an LLM suggestion and an offline suggestion target the same path
- **THEN** both pass the same schema/range validation before preview
