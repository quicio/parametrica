## Why

ParamRegistry and StageEditor are the single path from schema entries to
lil-gui controls; Controls and OperatorStack depend on them.

## What Changes

- Convert `ui/params/ParamRegistry.js` to `.ts`.
- Convert `ui/params/StageEditor.js` to `.ts`.
- Type bind contexts, stage shapes, controllers and expression entries.
- Keep JS compatibility re-exports.

## Out of Scope

- Controls, OperatorStack and the large panels.
