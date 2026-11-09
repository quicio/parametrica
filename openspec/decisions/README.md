# Architecture Decision Records

Short records for decisions that are expensive to reverse. Keep them small:
context, decision, alternatives, consequences, status.

Format:

```markdown
# ADR-0001: Title

Status: proposed | accepted | superseded
Date: YYYY-MM-DD
Related: openspec/changes/<change>

## Context

## Decision

## Alternatives considered

## Consequences
```

Pending decisions are listed in `openspec/roadmap.md` §13.

## Records

- [ADR-0001: Code versioning and delivery releases](./0001-code-versioning.md)

Every archived delivery must bump `package.json`, update `CHANGELOG.md` and
create an annotated `vX.Y.Z` tag. `npm run check:version` enforces the version
and changelog match.
