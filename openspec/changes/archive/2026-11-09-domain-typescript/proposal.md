## Why

ADR-0005 starts the TypeScript migration with the domain, where geometry,
units and style policy are pure and most valuable to type. The foundation
(`tsconfig`, `tsx`, typecheck) is already in place.

## What Changes

- Convert six pure domain modules to `.ts`.
- Enable `allowImportingTsExtensions` and use explicit `.ts` imports.
- Keep every old `.js` path as a compatibility re-export.
- Extend the boundary test to scan `.ts` domain files.
- Preserve every runtime behavior.

## Out of Scope

- UI, render, application or adapter conversion.
- Converting `lookPresets`, `manufacturingProfile` or interaction math yet.
- Runtime behavior changes.
