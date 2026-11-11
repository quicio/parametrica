## Types

- `PortRecord`, `PortMethod`, `bindMethod`, `bindCall`.
- Port factories receive the concrete `App` type from composition.
- `RendererLike` gains optional capture/pin methods.

## Rules

- Port allow-lists and runtime guards are unchanged.
- UI Proxy get/set/has behavior is unchanged.
- Binds preserve `this` and dynamic method delegation.

## Verification

- `tsc --noEmit`, Node, arch and e2e gates pass.
- UI/application port access and behavior are unchanged.
