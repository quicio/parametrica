## Decisions

### D1: Providers

`fake` returns fixtures; `ollama` calls a configurable local endpoint;
`openai-compatible` calls a configurable URL with a user-supplied key stored
only in memory/local optional setting. No key is committed.

### D2: Prompt

System prompt: the model is an art/math critic; it must use only supplied
paths, mention uncertainty, and return JSON matching `AdvisorResponse`.
User payload: current/previous descriptor, parameter diff, descriptor diff,
sensitivity, document summary. Thumbnail only if opted in.

### D3: Validation and cache

Responses are parsed, schema-checked, path-checked and clamped. Cache key:
`(documentHash, descriptorVersion, providerId, promptVersion)`. Cached
responses do not call the network.

### D4: Trigger

Explicit Analyze or 700 ms after a stable commit while the panel is open.
Never per animation frame. Provider failure leaves offline mode available.

### D5: Privacy

A visible summary of exactly what will be sent. Default: no network. Images
opt-in; no telemetry.
