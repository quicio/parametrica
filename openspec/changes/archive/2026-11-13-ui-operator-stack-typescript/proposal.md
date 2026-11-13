## Why

The operator stack is the app-side editor for procedural stages; it exercises
the form port and the shared parameter binding.

## What Changes

- Convert `ui/widgets/OperatorStack.js` to `.ts`.
- Type the app/form port surface, operator stages, errors and GUI lifecycle.
- Point the architecture port check at the `.ts` module.
- Keep the JS compatibility re-export.

## Out of Scope

- Controls and the remaining panels.
