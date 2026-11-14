## Why

Every runtime module under `src/` is strict TypeScript, but 199 `.js` shims and
155 `.js` import specifiers remain. ADR-0005 defines completion as
`allowJs: false`, and the shims now hide the real module graph from linters,
dependency-cruiser and readers.

## What Changes

- Rewrite internal `.js` specifiers to explicit `.ts`.
- Delete the same-name migration shims.
- Convert the seven cross-layer re-export shims to `.ts`.
- Point the fabrication worker URL at `.ts`.
- Set `allowJs: false` and drop `checkJs`.
- Add a gate that fails if any `.js` returns under `src/`.
- Remove the obsolete per-module compatibility requirements.
- Update tests and architecture documentation.

## Out of Scope

- Runtime or document-format changes.
- Replacing Vite, Playwright or the custom Node runner.
- Changing export bytes, geometry or panel behavior.
