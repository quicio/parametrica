## Why

The expression field is embedded in Controls and OperatorStack; typing it
stabilizes expression editing and error/disabled states.

## What Changes

- Convert `ui/widgets/ExpressionField.js` to `.ts`.
- Type CodeMirror extensions, timers and value accessors.
- Keep the JS compatibility re-export.

## Out of Scope

- Controls and the remaining panels.
