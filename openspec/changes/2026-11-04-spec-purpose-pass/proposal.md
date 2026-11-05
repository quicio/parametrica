## Why

Twenty-four archived specs still say:

```text
TBD - created by archiving change ... Update Purpose after archive.
```

They validate, but the corpus is less useful for review, onboarding and future
specs.

## What Changes

- Replace every TBD Purpose with a concise purpose statement.
- Add a quality check that rejects new TBD Purpose placeholders.
- No behavior or document change.

## Capabilities

### New Capabilities

- `spec-quality`: purpose completeness for archived specs.

### Modified Capabilities

- `quality-gates`: placeholder check.

## Impact

- `openspec/specs/*/spec.md`
- quality script/test
- No runtime code.

## Non-goals

- No rewrite of requirements/scenarios.
- No archive restructuring.
- No new product behavior.
