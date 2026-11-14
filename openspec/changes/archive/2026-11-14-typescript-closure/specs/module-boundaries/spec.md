## ADDED Requirements

### Requirement: Explicit TypeScript module graph

Every runtime module under `src/` SHALL be TypeScript and internal imports
SHALL name the `.ts` file.

#### Scenario: Import

- **WHEN** one source module imports another
- **THEN** the specifier ends in `.ts`
- **AND** no `.js` compatibility shim is required

#### Scenario: Cross-layer re-export

- **WHEN** an adapter path re-exports domain policy
- **THEN** the re-export module is `.ts`
- **AND** the architecture check still verifies the target

## REMOVED Requirements

### Requirement: Compatibility during application migration

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Scene compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Fabrication compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Core compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Export compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: App compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Render compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Pass compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Support helper compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: View pipeline compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Core support compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Document compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Lab support compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Engine compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: p5 overlay compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Product preview compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: p5 adapter compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Descriptor compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Lab model compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Advisor compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Presets compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Composition port compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Input/entry compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Generator compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: 2D generator compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Spatial generator compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Attractor compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Lattice compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Transform compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Resample compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Offset family compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Deform family compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Geometry contract compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Surface helper compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Fabrication helper compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Solid prep compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Topology repair compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Manifold adapter compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: CSG compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Remesh compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Math compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Sampling compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Adapter compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Lattice network compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Expression field compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Operator stack compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Explore compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Evolution compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Preset compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Notebook compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Surface inspector compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: UV inset compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Advisor panel module compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Image panel compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Timeline compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Form section compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Look section compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Keep section compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Fabricate section compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.

### Requirement: Controls compatibility

**Reason**: The module is TypeScript and the `.js` shim no longer exists.

**Migration**: Import the `.ts` module or the typed re-export directly.
