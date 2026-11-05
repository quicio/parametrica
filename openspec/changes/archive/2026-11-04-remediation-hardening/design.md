## Context

The audit is in `docs/audit-2026-11-04.md`. This change addresses only the
highest-value, bounded items.

## Decisions

### D1: Document-scoped layer IDs

Add `nextLayerId(document)` that increments the layer counter while skipping IDs
already present in `document.layers`. App add/instance/duplicate flows use it.
`sanitizeDocument` also reserves the counter above numeric `layer-N` IDs.

Existing documents keep their IDs. New IDs remain human-readable.

### D2: Deterministic Surface IDs

After generator/world operators, the engine assigns:

```text
`${generatorId}:${layerIndex}:surface:${index}`
```

The source Surface no longer depends on `Date.now()` for identity. Instance IDs
remain `layer.id:surface:index` / `layer.id:mesh:index`.

### D3: New Document confirmation

When Start With is opened manually, choosing a card asks:

```text
Replace current document?
```

Cancel keeps the overlay and the current document. First-run choices do not ask.
The overlay Cancel action still exits without changes.

### D4: Reproducible e2e fixture

Add `scripts/generate-e2e-session.mjs` and a `pretest:e2e` npm hook. It writes
`e2e/session-state.json` from `createDocument('parametric')` with a fixed
timestamp. The file remains committed as a fallback but is regenerated.

### D5: Advisor safety

`resolvePath` returns null and `numericRefs` skips generator refs when the active
layer has no generator or is an instance. No exception is thrown.

### D6: Docs truth

Update README's lower test counts and add a current status block to SPEC with
shipped Phase 4 capabilities and current gates. Do not rewrite every archived
spec purpose in this slice.

## Risks / Trade-offs

- Layer IDs become slightly less predictable but remain readable.
- Surface ID format changes; IDs are derived, not persisted.
- The confirmation adds one click to manual New Document replacement.
- The e2e fixture generator must stay in sync with default document creation.
- Advisor behavior for instances remains disabled, now without a latent crash.

## Open Questions

None blocking.
