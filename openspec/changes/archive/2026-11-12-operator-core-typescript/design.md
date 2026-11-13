## Types

- `compileOptionalExpression(source, label, key)`.
- `makeExpressionScope(ctx)` and `evaluatePointExpression(fn, scope, point, i, n)`.

## Rules

- Blank expressions still return null.
- Expression errors keep key/span.
- Side-effect registration order is unchanged.
