# ADR-0001: Code versioning and delivery releases

Status: accepted
Date: 2026-11-09
Related: all archived OpenSpec changes through 2026-11-09; `CHANGELOG.md`

## Context

Parametrica accumulated dozens of archived OpenSpec changes, feature commits
and a GitHub Pages deployment without a single git tag. `package.json` stayed
at `0.1.0` while the app gained persistence, image even-odd fill, Quad export,
PBR preview evidence, accessibility hardening, three Fabricate object waves
and grouped boolean recipes. The masthead still displayed a hardcoded `v0.1`.

That makes it hard to answer:

- which code produced a deployed page;
- which specs belong to a release;
- what changed between two working states;
- which commit set is safe to cite in a demo or a fabrication report.

## Decision

Adopt **Semantic Versioning 2.0.0** and treat every archived OpenSpec delivery
as a release boundary.

### Version source of truth

- `package.json` `version` is authoritative.
- The Vite build injects it as `__APP_VERSION__`.
- The masthead displays it dynamically; no hardcoded marketing version.
- `npm run check:version` fails when `package.json` and the latest released
  entry in `CHANGELOG.md` disagree.

### Pre-1.0 rules

The project stays in `0.x` until the document, storage and public APIs are
stable enough to promise compatibility.

| Bump | When |
|---|---|
| `PATCH` (`0.x.y`) | Bug fix, documentation, deployment, accessibility or performance work with no new user-facing capability. |
| `MINOR` (`0.x.0`) | An archived OpenSpec change adds or meaningfully changes user-facing behavior. One minor may cover several related specs, but every included spec is listed in the changelog and tag message. |
| `MAJOR` (`1.0.0`) | Breaking change to the JSON document, storage keys, public API, CLI or file formats. Nothing in the current roadmap forces this yet. |

### Release unit

A release is a **delivery**, not every commit:

- one archived OpenSpec change, or a small set of changes shipped together;
- the commit that updates `package.json` and `CHANGELOG.md`;
- an annotated git tag `vX.Y.Z`.

Individual commits remain work-in-progress. Every commit that archives a spec
must be part of a release; a spec may never be archived without a version bump
and a changelog entry. Documentation-only maintenance may share the current
version and does not require a tag unless it is part of a delivery.

### Tag format

Annotated tags use `vMAJOR.MINOR.PATCH`:

```bash
git tag -a v0.2.0 -m "v0.2.0 — post-lattice, Fabricate library, GitHub Pages

Specs:
- 2026-11-08-persistence-consolidation
- 2026-11-08-image-evenodd
- 2026-11-08-quad-svg-export
- 2026-11-08-ui-hardening
- 2026-11-08-preview-performance
- 2026-11-09-fabricate-library-review
- 2026-11-09-fabrication-object-primitives
- 2026-11-09-fabricate-objects-wave-2
- 2026-11-09-fabrication-boolean-groups
- 2026-11-09-fabricate-objects-wave-3"
```

The tag message names the specs and the user-visible outcome. A GitHub Release
is optional and, when created, points at the same tag.

### Release procedure

1. Finish the OpenSpec change and archive it.
2. Decide the bump from the table above.
3. Update `version` in `package.json`.
4. Move the changelog entry from `Unreleased` (if present) to a dated
   `[X.Y.Z]` section.
5. Run `npm run check` and `npm run test:e2e`.
6. Commit `Release vX.Y.Z`.
7. Create and push the annotated tag:

```bash
git tag -a vX.Y.Z -m "vX.Y.Z — <outcome>"
git push origin main --tags
```

8. Verify the Pages workflow and the live URL.

### What a release must contain

- `package.json` version.
- `CHANGELOG.md` entry with Added/Changed/Fixed sections.
- Tag message with spec ids.
- Green `npm run check` and Playwright suite.
- A working live page when the release changes the app.

## Alternatives considered

### Tag every commit

Rejected. It produces hundreds of low-signal tags, makes release notes
meaningless and conflicts with the existing OpenSpec delivery model.

### Date-based versioning (CalVer)

Rejected. The app is still pre-1.0 and consumers need a compatibility signal for
the document and storage formats. CalVer communicates time, not breakage.

### No tags, only commits

Rejected. The current state already proves the cost: the deployed page could
not be mapped to a named release without walking the commit graph.

### SemVer only at 1.0

Rejected. The project needs traceability now, and `0.x` SemVer already supports
minor/patch discipline before the first compatibility promise.

## Consequences

- Every archived spec has a version and a tag.
- The deployed page, changelog and tag are traceable to the same commit.
- `npm run check` now guards version/changelog drift.
- A release requires a tiny amount of manual changelog writing; this is the
  price of useful release notes.
- The masthead and any future exports can display the real version instead of a
  hardcoded string.
- `v0.1.0` remains the historical rewrite baseline; `v0.2.0` is the first
  tagged release under this policy.
