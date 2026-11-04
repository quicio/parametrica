# Fase 4H — Instance Layers: diseño refinado

> Documento de diseño para revisión. Implementado y validado.
> Sustituye la propuesta inicial de “Fase 5A: Generative Composition”.

---

## 1. Resumen ejecutivo

La fase 4H añade **capas de instancia** al modelo de capas existente.

Una capa de instancia:

- referencia una capa generadora del mismo documento;
- comparte generador, parámetros y seed de la fuente;
- tiene operadores, estilo, visibilidad y orden propios;
- produce geometría y `SurfaceMapping` con IDs propios;
- se evalúa antes de render/picking/export, sin crear un pipeline paralelo.

No se añade un scene graph, un workspace nuevo, CSG, campos matemáticos,
reparación, multi-body ni 3MF.

La demo creativa propuesta es **“Vortex Stack”**: una única superficie
paramétrica fuente y varias instancias transformadas, con propagación de
parámetros e inspección diferenciada.

---

## 2. Auditoría de arquitectura

### 2.1 Modelo de documento y capas

**Existe**

- `src/core/document.js`
  - `createLayer(generatorId, overrides)`
  - `sanitizeDocument(raw)`
  - `sanitizeLayer(...)` (interna)
  - `attachLayerAliases(document)`
- `src/core/engine.js`
  - `evaluateDocument(document, options)`
  - `evaluateLayers(document, options)`
  - `evaluateSurfaceDocument(...)`
  - `evaluateSpatialDocument(...)`
- `openspec/specs/composition-model/spec.md`

Cada capa actual tiene:

```text
id, name, visible, locked, seed, modes, colorMetric,
generator: { id, params, mods },
operators: [],
style: {}
```

`evaluateLayers` crea un subdocumento por capa y llama a `evaluateDocument` con
`cacheKey: layer`. No existe hoy ningún concepto de referencia entre capas.

### 2.2 Geometría y mapping

**Existe**

- `src/geometry/contracts.js`: `Surface`, `Mesh`, `Solid`.
- `src/geometry/transformGeometry.js`: `mapGeometryPoints`.
- `src/geometry/surfaceTessellation.js`: `tessellateSurfaceWithMapping`.
- `src/geometry/validate.js`: validación de Surface/Mesh/Solid.
- `src/geometry/relation.js`: `surfaceToMesh`, `meshToSolid`.

`SurfaceMapping` actual:

```text
surfaceId, meshId, domain, grid,
faces: [{ indices, cell: {u,v}, triangle, uv }]
```

### 2.3 Render, picking e inspección

**Existe**

- `src/application/renderSceneBuilder.js`
- `src/interaction/surfacePicker.js`
- `src/interaction/inspectionOverlay.js`
- `src/interaction/seamOverlay.js`
- `src/ui/SurfaceInspector.js`
- `src/ui/UVDomainInset.js`
- `src/geometry/uvDomain.js`

La inspección y el picking dependen de:

- `layer.id`
- `mesh.id`
- `mapping.meshId`
- `mapping.surfaceId`

### 2.4 Unidades y fabricación

**Existe**

- `src/core/units.js`
- `src/application/fabricationSource.js`
- `src/export/stl.js`
- `src/export/geometryExport.js`

`buildFabricationReport` resuelve el primer cuerpo cerrado válido de la capa
activa. `exportBinarySTL` exporta un solo cuerpo.

### 2.5 UI de capas y formularios

**Existe**

- `src/ui/Controls.js`
  - `buildLayersSection`
  - `buildGeneratorSection`
  - `buildParamsSection`
  - `buildEquationsSection`
  - `buildHarmonicsSection`
  - `buildOperatorsSection`
  - `buildStyleSection`
  - `refreshStatus`
- `src/application/App.js`
  - `addLayer`, `duplicateLayer`, `removeLayer`, `moveLayer`
  - `setActiveLayer`, `setLayerVisible`, `setLayerLocked`
  - `setGenerator`, `mutate`, exploración/evolución
- `src/ui/widgets/OperatorStack.js`
- `src/lab/parametricSummary.js`
- `src/lab/descriptor.js`
- `src/lab/parameters.js`

### 2.6 Conflictos reales con el modelo actual

Estos conflictos deben resolverse en la implementación; no se esconden:

1. **`createLayer` exige un generador válido.** Una capa de instancia no tiene
   generador propio. Se necesita `createInstanceLayer` y un `sanitizeLayer`
   consciente del tipo.
2. **`evaluateLayers` asume que toda capa visible es un subdocumento con
   generador.** Hay que añadir una rama de instancia y resolver dependencias.
3. **`evaluateLayers` omite las capas ocultas.** Una fuente oculta pero usada
   por una instancia visible debe evaluarse igualmente.
4. **`attachLayerAliases` asume `layer.generator`.** El alias
   `document.generator` debe devolver `null` o el generador de la fuente según
   la política que se defina.
5. **La UI asume `layer.generator.id` en varios sitios.** Sin un helper
   central, una capa de instancia rompería el panel.
6. **El pipeline de superficies siempre regenera `SurfaceMapping`.** No existe
   una ruta de clonado de mappings. El MVP debe definir una política explícita.
7. **Los IDs de superficie del generador de superficies pueden ser
   dependientes del tiempo.** No se pueden usar como base de IDs estables de
   instancia.
8. **`renderSceneBuilder` usa `layer.generator.params` para fit/depth.** Una
   instancia no tiene generador propio; hay que pasar los parámetros de render
   de la fuente.
9. **`removeLayer` no comprueba dependencias.** Borrar una fuente dejaría
   instancias huérfanas.
10. **Mutación, exploración y evolución editan `document.generator`.** No
    aplican a una capa de instancia sin una decisión adicional.

---

## 3. Contrato de datos final

### 3.1 Tipos de capa

```js
// Capa generadora
{
  type: 'generator',
  id: 'layer-1',
  name: 'Torus',
  visible: true,
  locked: false,
  seed: 1,
  modes: null | ['stroke', ...],
  colorMetric: null | 'auto' | 'height' | 'radius' | 'curvature' | 'arc',
  generator: { id: 'parametric-surface', params: {...}, mods: {} },
  operators: [...],
  style: {...}
}

// Capa de instancia
{
  type: 'instance',
  id: 'layer-2',
  name: 'Torus / radial 1',
  visible: true,
  locked: false,
  seed: null,
  modes: null | ['stroke', ...],
  colorMetric: null,
  source: { layerId: 'layer-1' },
  generator: null,
  operators: [...],
  style: {...}
}
```

### 3.2 Reglas

- `type` se persiste. Documentos antiguos sin `type` se interpretan como
  `generator`.
- `layer-1` es el ID persistente de la fuente; **nunca** se referencia por
  nombre.
- `source.layerId` solo puede apuntar a una capa `generator`.
- Una capa de instancia no puede ser fuente de otra instancia en el MVP.
- `source.layerId` puede cambiarse después de crear la instancia. El cambio
  invalida y reevalúa esa instancia.
- Una instancia no puede referenciarse a sí misma.
- `seed` de instancia es `null`; el seed autoritativo es el de la fuente.
- `generator` de instancia es `null`.
- Los campos derivados (`surfaceId`, `meshId`, `mapping`) no se persisten.
- `document.version` sigue siendo `3`. No hay v4.
- El documento conserva `layers` como fuente de verdad.
- El máximo inicial es **24 instance layers por documento**.

### 3.3 Migración

Al sanitizar:

- capa sin `type` y con `generator` válido → `type: 'generator'`;
- capa con `source.layerId` válido → `type: 'instance'`, `generator: null`;
- capa `instance` sin fuente válida → se conserva como instancia con error de
  evaluación, no se convierte silenciosamente en generador;
- IDs de capa duplicados → se regeneran de forma determinista y se remapean
  las referencias a la primera aparición;
- el resto de documentos existentes no cambia.

La migración no necesita un nuevo `DOCUMENT_VERSION`.

### 3.4 Cambio de fuente

Cambiar `source.layerId`:

- solo se permite hacia una capa `generator` existente;
- invalida el cache de esa instancia;
- reevalúa desde la Surface canónica de la nueva fuente;
- no modifica la fuente anterior ni la nueva;
- conserva operadores, estilo, visibilidad y orden de la instancia;
- si la nueva fuente no produce Surface, la instancia muestra un error keyed.

La UI bloquea el cambio si la instancia está bloqueada o si el documento está
en un estado de solo lectura.

---

## 4. Reglas de identidad

### 4.1 IDs persistentes

- `layer.id`: persistente, único, generado por `createLayer` /
  `createInstanceLayer`.
- `source.layerId`: persistente; referencia al `layer.id` de la fuente.
- No se usan nombres de capa para resolver referencias.

### 4.2 IDs derivados de instancia

Para cada superficie clonada, por índice de salida:

```text
instanceSurfaceId = `${instanceLayer.id}:surface:${index}`
instanceMeshId    = `${instanceLayer.id}:mesh:${index}`
```

Para cada mesh/solid clonado:

```text
instanceMeshId = `${instanceLayer.id}:mesh:${index}`
```

Nunca se reutilizan IDs de la fuente. `index` es el índice determinista dentro
de la geometría world clonada, no un contador global.

### 4.3 Metadatos de origen

Se añaden metadatos opcionales, sin romper contratos existentes:

```text
surface.meta.instanceLayerId
surface.meta.sourceLayerId
surface.meta.sourceSurfaceId

mesh.meta.instanceLayerId
mesh.meta.sourceLayerId
mesh.meta.sourceSurfaceId

mapping.instanceLayerId
mapping.sourceLayerId
mapping.sourceSurfaceId
```

`sourceSurfaceId` es informativo. No forma parte del ID derivado porque el ID
de la superficie fuente puede cambiar al reevaluar.

### 4.4 Picking

`pickSurface` sigue devolviendo:

```text
layerId, layerName, meshId, surfaceId, faceIndex, ...
```

Añade, si existen:

```text
sourceLayerId, sourceLayerName, sourceSurfaceId, instance: true
```

`layerId` es siempre la instancia. La fuente se muestra como procedencia.

### 4.5 Determinismo, estabilidad y persistencia

No son lo mismo:

| Propiedad | Qué significa | Qué IDs la cumplen |
|---|---|---|
| Determinista | Mismo documento + seed + time + quality ⇒ mismos IDs en el mismo entorno | todos los IDs derivados |
| Estable entre reevaluaciones | El ID no cambia mientras no cambie la topología/orden de salida | `surfaceId`/`meshId` por índice |
| Persistente | El ID se guarda en el documento | solo `layer.id` y `source.layerId` |

`instanceSurfaceId` y `instanceMeshId` usan un índice de salida. Por tanto:

- si la fuente cambia el número o el orden de superficies, los IDs derivados
  pueden reasignarse;
- no se promete estabilidad semántica entre cambios de topología de la fuente;
- el picking pinned debe revalidarse contra la evaluación actual, como ya hace
  `validatePickResult`;
- los IDs derivados nunca se persisten ni se usan como referencia de documento.

---

## 5. Pipeline de evaluación

### 5.1 Orden

`evaluateLayers` pasa a tener dos fases:

```text
1. Resolver layerById y validar referencias.
2. Evaluar capas generadoras:
   - visibles;
   - ocultas pero referenciadas por una instancia visible.
3. Evaluar capas de instancia en el orden original de document.layers.
4. Agregar resultados en el orden original de document.layers.
```

El orden de render/export sigue siendo el orden de `layers`, no el orden de
evaluación.

### 5.2 Capa generadora

Se mantiene la ruta actual:

```text
generator → world operators → tessellation/mapping → projection → render
```

La evaluación de la fuente se reutiliza entre todas sus instancias dentro del
mismo ciclo.

### 5.3 Geometría canónica

Una evaluación de superficie expone tres niveles distintos:

| Nivel | Campo | Uso |
|---|---|---|
| Surface canónica world | `evaluation.geometry` | identidad paramétrica, operadores, mapping |
| Mesh teselado | `evaluation.meshes` | render de superficie, picking, STL |
| Mesh proyectado | `evaluation.renderMeshes` | Canvas/Quad únicamente |

La instancia **solo** consume `evaluation.geometry` (Surfaces canónicas world).
Nunca transforma `meshes` ni `renderMeshes`.

Pipeline correcto:

```text
source canonical Surface
  → clone Surface
  → instance world operators
  → tessellate
  → SurfaceMapping
  → project/render
```

En el MVP la fuente debe producir `Surface`. Fuentes de solo curvas o de solo
Mesh se rechazan con un error keyed:

```text
Instance source must produce Surface geometry
```

Esto preserva la identidad paramétrica y evita mappings inventados. El soporte
de fuentes Mesh queda para una fase posterior.

### 5.4 Capa de instancia

```text
source evaluation
  → clonar canonical Surface
  → asignar IDs de instancia
  → aplicar operadores permitidos de instancia
  → teselar y generar SurfaceMapping
  → proyectar/renderizar por la ruta existente
```

No se clona el documento de la fuente. No se vuelve a ejecutar el generador.

### 5.5 Operadores permitidos en instancia

MVP: solo operadores que preservan topología y orientación:

- `translate`
- `rotate`
- `scale`

Cualquier otro operador (`mirror`, `repeat`, `linear-array`, `grid-repeat`,
deform, resample, boolean, etc.) produce un error keyed y no se aplica
parcialmente.

`mirror` queda **excluido del MVP**: la implementación actual refleja los puntos
pero no demuestra winding/normales orientados de forma consistente ni una
exportación STL correcta. Incluirlo requeriría normalización de orientación y
pruebas específicas.

Esto evita:

- IDs generados por `repeat` con contadores globales;
- mappings obsoletos;
- multiplicación no controlada de superficies dentro de una instancia;
- sólidos invertidos o no fabricables por un mirror.

La distribución se consigue con **varias capas de instancia**, no con un array
dentro de una instancia.

### 5.6 Fuente oculta

- Si una instancia visible referencia una fuente oculta, la fuente se evalúa.
- Si todas las instancias dependientes están ocultas, la fuente oculta no se
  evalúa para render.
- La fuente no se renderiza ni exporta como capa propia.
- Ocultar la fuente no oculta sus instancias.
- Ocultar una instancia no afecta a la fuente ni a otras instancias.

### 5.7 Fuente inválida o inexistente

- Fuente inexistente: error keyed en la instancia, sin crash.
- Fuente con errores: la instancia no produce geometría y reporta
  `Source layer has errors`.
- Fuente de tipo curva: error `Instance source must produce Surface geometry`.
- Fuente de tipo instancia: error `Instance source cannot be another instance`.
- Ciclo: error keyed; no se evalúa parcialmente.

### 5.8 Determinismo

- Orden de evaluación determinista.
- IDs derivados de `layer.id` + índice.
- Sin `Date.now()` ni aleatoriedad en IDs de instancia.
- Mismo documento + seed + time + quality ⇒ misma geometría y mismos IDs.

---

## 6. Contrato de SurfaceMapping

### 6.1 Política del MVP

La instancia clona la **Surface canónica world**, no el mapping y no el Mesh.

El mapping se **regenera** con `tessellateSurfaceWithMapping` a partir de la
Surface clonada. Esto garantiza:

- `mapping.surfaceId === instanceSurfaceId`;
- `mapping.meshId === instanceMeshId`;
- `domain`, `grid`, `cell` y `uv` derivados del dominio de la Surface clonada;
- ningún mapping con IDs de la fuente.

No se inventan correspondencias UV. El dominio de la superficie fuente se copia
tal cual en la clonación.

### 6.2 Operadores de instancia

Los operadores permitidos en el MVP preservan topología; por tanto el mapping
regenerado sigue siendo válido.

Si en el futuro se permite un operador que cambia topología:

- se regenera el mapping desde la Surface resultante;
- no se reutiliza el mapping anterior;
- se valida `faces.length === mesh.faces.length` y `indices` coherentes.

### 6.3 Validación de mappings obsoletos

Se considera inválido un mapping cuando:

- `mapping.meshId` no existe en la capa;
- `mapping.surfaceId` no coincide con la Surface;
- `mapping.faces.length !== mesh.faces.length`;
- `mapping.faces[i].indices` no coincide con `mesh.faces[i]`;
- `uv` no es finito.

La inspección ya trata `missing`/`mismatch`; se conserva ese comportamiento.

### 6.4 Optimización futura

Clonar mappings solo será válido para transformaciones puras y topología
idéntica. No forma parte del MVP. Si se añade, debe exigir una firma de
topología y remapear `surfaceId`/`meshId`; nunca copiar IDs de la fuente.

---

## 7. Cache e invalidación

### 7.1 Fuente

La evaluación de la fuente sigue usando:

- `STAGE_CACHE` para curvas;
- `SURFACE_CACHE`, `MESH_CACHE`, `MESH_VIEW_CACHE` para superficies.

La fuente se evalúa una vez por ciclo de `evaluateLayers`.

### 7.2 Instancia

Nuevo cache propuesto, keyed por la capa de instancia:

```text
INSTANCE_CACHE: WeakMap<layer, { signature, result }>
```

La firma incluye:

- `layer.id`;
- `source.layerId`;
- firma de la capa fuente (generator id/params/mods, operators, seed);
- operadores de instancia (`id`, `params`, `mods`, `enabled`);
- `time`, `quality`.

No incluye `visible`: ocultar una capa no debe invalidar geometría.

#### Identidad de los objetos layer

La auditoría confirma que, durante la edición normal, `App.rebuild()` muta los
mismos objetos de `document.layers`; no los reconstruye. Por tanto un
`WeakMap<layer, result>` sí aporta reutilización real entre rebuilds.

Los objetos de capa se reemplazan en:

- carga de preset / `adoptDocument`;
- restauración de sesión;
- import JSON;
- undo/redo que restaure un snapshot.

En esos casos el `WeakMap` pierde la entrada, que es el comportamiento correcto.

Si una implementación futura reconstruye capas en cada evaluación, el
`WeakMap<layer>` dejaría de ser útil. La alternativa simple es un memo por
evaluación keyed por `layer.id` + firma, sin cache persistente entre rebuilds.
No se debe añadir una optimización más compleja hasta medir el coste real.

La firma de la fuente se calcula a partir de sus campos persistentes, no de la
identidad del objeto `evaluation`, porque `evaluateLayers` crea un resultado
nuevo en cada llamada.

### 7.3 Invalidación

- Cambia la fuente → cambia la firma de sus instancias.
- Cambia `source.layerId` → se invalida esa instancia por completo.
- Cambia una instancia → solo se invalida esa instancia.
- Cambia el estilo → no se invalida geometría (solo render).
- Cambia la visibilidad → no se invalida geometría.
- Error de fuente → no se cachea un resultado de instancia como válido.

### 7.4 Cache de RenderScene

`renderSceneBuilder` sigue consumiendo `evaluation.layers`. Hay que asegurar que
la firma de escena incluya, para instancias, la firma de la fuente o sus
parámetros de render. Como cada rebuild crea una nueva `evaluation`, el riesgo
principal es el cache por evaluación; aun así se debe documentar y cubrir con
test.

---

## 8. Integración con render, picking, inspección y export

### 8.1 RenderScene

- Sin pipeline nuevo.
- La capa de instancia entrega `curves`, `geometry`, `meshes`,
  `renderMeshes`, `surfaceMappings`, `worldBBox` y `stats` como cualquier capa.
- `sourceGenerator` o `renderParams` debe exponerse en el resultado de capa
  para que `renderSceneBuilder` conserve `fit`, `depthOcclusion` y
  `depthAttenuation` de la fuente sin fingir que la instancia tiene generador.

### 8.2 Surface Inspector

- Muestra `layerId`/`layerName` de la instancia.
- Añade `sourceLayerName`/`sourceLayerId`.
- UV, celda, triángulo y XYZ se leen del mapping de la instancia.
- `validatePickResult` sigue funcionando porque meshId/surfaceId son de la
  instancia.

### 8.3 UV Domain y seams

- `activeSurfaceDomain` busca la primera Surface de la capa activa; la Surface
  clonada conserva `domain`.
- `buildSeamOverlay` usa `layer.surfaceMappings`; el mapping de instancia es
  válido y propio.
- No se comparte el mapping de la fuente.

### 8.4 SVG/PNG

- Usan `RenderScene`; no requieren cambios.
- El orden de capas, estilos y visibilidad se conserva.
- Las instancias ocultas se omiten.

### 8.5 Physical Units

- La geometría de instancia está en world units, igual que la fuente.
- `view.units` no cambia la geometría.
- Las conversiones siguen siendo de exportación/display.

### 8.6 Fabricate

- Sigue siendo single-body.
- Si la capa activa es una instancia, `buildFabricationReport` puede resolver
  su primer cuerpo cerrado válido.
- Si hay varias instancias visibles, **no** se exportan juntas.
- Si la capa activa es la fuente y hay instancias visibles, se exporta solo el
  cuerpo de la fuente.
- No se deshabilita por la mera presencia de otras instancias visibles.
- Limitación visible en la UI: “Fabricate exports one body from the active
  layer; instance composition is not multi-body.”
- La advertencia debe mostrarse también cuando el cuerpo exportado no representa
  toda la composición visual.

---

## 9. UI mínima

### 9.1 Layers

- Mantener `+ ADD LAYER`.
- Añadir `+ INSTANCE`.
- `+ INSTANCE` abre un selector de capas fuente (solo capas generadoras).
- Si no hay capas generadoras, se deshabilita con motivo.
- Al alcanzar **24 instance layers**, `+ INSTANCE` se deshabilita con un aviso
  claro de límite.
- La fila de instancia muestra:
  - badge `INSTANCE`;
  - nombre de la instancia;
  - `↳ sourceName`;
  - operadores propios.
- La fila de fuente no cambia.

### 9.2 Formulario activo

Si la capa activa es una instancia:

- se oculta/reemplaza `Generator`, `Parameters`, `Equations` y `Harmonics`;
- aparece una sección `Instance`:
  - selector de capa fuente;
  - parámetros de la fuente en modo **read-only**;
  - enlace “Select source layer”;
- `Operators` sigue disponible, filtrado a transformaciones permitidas
  (`translate`, `rotate`, `scale`);
- `Style` sigue disponible por instancia;
- `document.generator` devuelve `null`; la UI usa un resolver explícito
  (`sourceGeneratorFor(document, layer)`) para mostrar el nombre/params de la
  fuente.

Si la capa activa es generadora, la UI actual no cambia.

### 9.3 Estado y overlays

- Status: `Layer 3 · Torus radial 1 · instance ← Torus · 1 op`.
- Parametric overlay: “Instance of Torus” y operadores de instancia.
- Mutation/Explore/Evolution: deshabilitados si la capa activa es instancia,
  con motivo “Select the source layer to mutate its parameters”.
- AI advisor/descriptor: no deben romperse; el descriptor de la instancia puede
  exponer la fuente y sus propios operadores.
- No se introduce resolución implícita de `document.generator`; cualquier
  consumidor que necesite el generador de la fuente usa el resolver explícito.

### 9.4 Eliminar/mover/duplicar

- `removeLayer` de una fuente con instancias: bloquear con aviso
  “Layer is used by N instances”.
- `removeLayer` de una instancia: elimina solo la instancia.
- `moveLayer`: no cambia referencias; solo orden de render.
- `duplicateLayer` de una instancia: copia `source.layerId` y operadores.
- `duplicateLayer` de una fuente: las instancias existentes siguen apuntando a
  la fuente original.

### 9.5 Bloqueo

- Bloquear la fuente impide editar sus parámetros/operadores, no impide evaluar
  sus instancias.
- Bloquear la instancia impide editar sus operadores/estilo/fuente, no afecta a
  la fuente.

### 9.6 Límite de instancias

- Máximo inicial: 24 instance layers por documento.
- La creación número 25 se rechaza con un mensaje visible.
- Los documentos importados con más de 24 instancias se conservan, pero la UI
  muestra una advertencia y bloquea nuevas instancias hasta reducir el número.
- Este límite es independiente del límite total de capas.

---

## 10. Compatibilidad y migración

- Documentos v3 existentes: sin `type` → generador.
- Presets built-in: sin cambios.
- Presets de usuario: conservan `type`/`source` al sanitizar.
- Notebook y sesión: el documento completo se guarda; no se guardan mallas.
- JSON round-trip: `type`, `source`, `operators`, `style` y IDs deben ser
  idénticos.
- Un documento con fuente inexistente sigue siendo válido como documento, pero
  produce error de evaluación y la UI permite relinkar/eliminar la instancia.
- No se cambia `DOCUMENT_VERSION`.
- No se cambia el formato de `SurfaceMapping` salvo campos opcionales de origen.

### 10.1 Conflicto con el límite actual de capas

`sanitizeDocument` limita hoy las capas a **16**:

```text
rawLayers.slice(0, 16)
```

Eso entra en conflicto directo con el límite de **24 instancias + al menos una
fuente** (25 capas como mínimo).

Propuesta:

- elevar el límite total a **32 capas**;
- mantener el límite de **24 instance layers**;
- validar el total y las instancias con mensajes distintos;
- conservar la compatibilidad de documentos antiguos.

Sin este cambio, el límite de 24 instancias no se puede cumplir.

---

## 11. OpenSpec propuesto

### Cambio

```text
2026-11-04-instance-layers
```

### Capabilities

Nueva:

- `instance-layers`

Modificadas:

- `composition-model`
- `surface-mapping`
- `surface-inspection`
- `fabrication-contracts`

### Requisitos propuestos

#### Instance layers

- Una capa de instancia referencia una capa generadora.
- La fuente conserva generador, parámetros y seed.
- La instancia conserva operadores, estilo, visibilidad y orden.
- La fuente puede cambiarse; el cambio invalida y reevalúa la instancia.
- No se permiten instancias de instancias ni ciclos.
- Una fuente oculta se evalúa solo si alguna instancia visible la necesita.
- Los errores de fuente se reportan en la instancia.
- El máximo inicial es 24 instance layers por documento.
- El límite total de capas sube de 16 a 32 para permitir 24 instancias + fuente.

#### Geometría canónica

- La instancia clona `evaluation.geometry` (Surface world).
- Nunca opera sobre `meshes` ni `renderMeshes`.
- En el MVP la fuente debe producir Surface; curvas o Mesh-only se rechazan.
- Los operadores de instancia corren antes de teselar.

#### Identidad

- IDs de instancia deterministas y únicos.
- IDs derivados estables entre reevaluaciones mientras no cambie el orden de
  salida de la fuente.
- Solo `layer.id` y `source.layerId` son persistentes.
- No se reutilizan IDs de la fuente.
- Picking expone instancia y fuente.

#### Mapping

- El mapping de instancia se regenera desde la Surface clonada.
- Dominio, grid, cell y UV se preservan.
- Mapping obsoleto se detecta y no se muestra como válido.

#### Evaluación

- Fuentes primero, instancias después.
- La fuente se evalúa una vez por ciclo.
- La invalidación de la fuente invalida sus instancias.
- Determinismo con seed/time/quality.
- Sin resolución implícita de `document.generator` para instancias.

#### UI

- Acción Add Instance Layer.
- Selector de fuente y cambio de fuente.
- Parámetros de fuente read-only.
- Identificación de fuente en Layers, inspector y overlay.
- Mutation/Explore/Evolution deshabilitados para instancias.
- Sin workspace nuevo.

#### Fabricate

- Single-body desde la capa activa.
- Limitación visible cuando hay múltiples instancias.
- No deshabilitar por la mera presencia de otras instancias visibles.

### Escenarios de aceptación

- Crear una instancia de Torus.
- Cambiar `samplesU` en la fuente y ver actualizar todas las instancias.
- Cambiar un operador de una instancia sin afectar a la fuente.
- Cambiar `source.layerId` y reevaluar la instancia.
- Inspeccionar dos instancias y obtener `layerId` distintos y el mismo
  `sourceLayerId`.
- Exportar SVG/PNG con orden y estilos.
- Exportar STL de un solo cuerpo desde la capa activa.
- Recargar y conservar `type`, `source` e IDs.
- Alcanzar 24 instancias y mostrar el mensaje de límite.

---

## 12. Pruebas

### Unitarias

- `sanitizeDocument` migra capas sin `type` a generador.
- `createInstanceLayer` no requiere generador.
- Referencia a fuente inexistente produce error keyed.
- Instancia de instancia produce error.
- IDs de instancia únicos/deterministas.
- `surfaceId`/`meshId` de instancia no colisionan con la fuente.
- Cambiar la fuente cambia la firma de la instancia.
- Cambiar una instancia no cambia la fuente.
- Ocultar la fuente con una instancia visible la evalúa.
- Ocultar la fuente y todas sus instancias evita su evaluación.
- Fuente con errores no se cachea como válida.
- Operadores no permitidos en instancia se rechazan sin geometría parcial.
- `mirror` se rechaza en instancia con un error explícito.
- Mapping regenerado conserva dominio/grid/cell/uv y IDs propios.
- `document.generator` es `null` con una instancia activa.
- El límite de 24 instancias y 32 capas se aplica.
- `document.version` sigue siendo 3.

### Integración

- `evaluateLayers` devuelve capas en el orden original.
- RenderScene contiene las instancias con su estilo.
- `pickSurface` devuelve instancia + fuente.
- `inspectionOverlay` y `validatePickResult` funcionan con IDs de instancia.
- UV Domain y seams usan el mapping de instancia.
- SVG/PNG conservan orden/visibilidad.
- Physical Units no altera la geometría.
- Fabricate resuelve un solo cuerpo de la capa activa.
- `removeLayer` bloquea la fuente referenciada y muestra el número de instancias.
- Duplicar una instancia conserva la fuente.

### E2E

- Add Instance Layer desde Layers.
- Selector de fuente y cambio de fuente.
- Cambiar parámetro de fuente y ver todas las instancias.
- Cambiar estilo/visibilidad de una instancia.
- Inspeccionar dos instancias y comprobar fuente + IDs.
- Recargar y restaurar la composición.
- Exportar SVG.
- Fabricate single-body con una instancia activa.
- Alcanzar el límite de 24 instancias y ver el mensaje.

### Guardrails de rendimiento

- Medir 24 instancias de una superficie 64×32.
- Mantener el límite de 32 capas.
- No añadir instanced rendering en este MVP.

---

## 13. Demo creativa: “Vortex Stack”

Una única fuente paramétrica:

```text
exprX = (2 + cos(v)) * cos(u)
exprY = (2 + cos(v)) * sin(u)
exprZ = sin(v) + 0.35 * sin(3u + v)
```

La fuente produce un toro deformado, no una repetición uniforme.

Instancias:

| Instancia | Transformación | Estilo |
|---|---|---|
| 0 | z = -1.8, rotZ = 0°, scale 1.00 | blanco, 1.0 |
| 1 | z = -1.2, rotZ = 18°, scale 0.92 | blanco, 0.9 |
| 2 | z = -0.6, rotZ = 36°, scale 0.84 | blanco, 0.8 |
| 3 | z = 0.0, rotZ = 54°, scale 0.76 | blanco, 0.7 |
| 4 | z = 0.6, rotZ = 72°, scale 0.68 | blanco, 0.6 |
| 5 | z = 1.2, rotZ = 90°, scale 0.60 | blanco, 0.5 |

La demo debe mostrar:

- una sola ecuación fuente;
- seis instancias con operadores propios;
- propagación al cambiar `exprZ`, `samplesU` o `samplesV`;
- picking e inspección con `sourceLayerId` común e IDs de instancia distintos;
- apariencia de “vórtice estratificado”, no una repetición plana;
- export SVG/PNG;
- Fabricate exporta un solo cuerpo de la instancia activa.

`mirror` no forma parte de la demo porque queda excluido del MVP.

---

## 14. Decisiones finales, riesgos y pendientes

### Decisiones finales

1. Las instancias pueden cambiar de fuente.
2. La fuente solo puede ser una capa generadora.
3. El cambio de fuente invalida y reevalúa la instancia.
4. Se bloquea eliminar una fuente con instancias dependientes.
5. Una fuente oculta se evalúa solo si alguna instancia visible la necesita.
6. `document.generator` devuelve `null` cuando la capa activa es una instancia.
7. Mutation, Explore y Evolution quedan deshabilitados para instancias.
8. Fabricate exporta un único cuerpo de la capa activa.
9. Fabricate informa que no exporta la composición completa.
10. No se permiten instancias de instancias ni ciclos.
11. La distribución se construye con varias instance layers.
12. Límite inicial: 24 instancias por documento.
13. Los parámetros de la fuente son read-only con enlace a la capa fuente.
14. `mirror` queda excluido del MVP porque la implementación actual no
    garantiza orientación/winding/normales/STL.
15. La fuente debe producir Surface canónica; Mesh-only y curvas se rechazan.
16. El límite total de capas sube de 16 a 32.

### Riesgos pendientes

- Cambios cross-cutting por `layer.generator` asumido en UI/lab.
- Coste de teselar cada instancia.
- Reasignación de IDs derivados si la fuente cambia su número/orden de
  superficies.
- Documentos con fuentes inexistentes.
- Confusión entre “capa independiente” e “instancia”.
- Fabricate single-body puede decepcionar si se espera exportar la composición.
- El límite de 32 capas es nuevo y debe convivir con presets/notebooks antiguos.

### Detalles de implementación no bloqueantes

- Si el selector de fuente incluye capas ocultas, debe mostrarlas con un badge
  de visibilidad.
- El cache de instancia puede empezar como `WeakMap<layer, result>` o como memo
  por evaluación; se elige tras medir.
- El formato exacto de los badges de Layers queda a criterio de la UI.

No hay decisiones de producto pendientes que bloqueen el OpenSpec.

---

## 15. Criterio de aceptación del diseño

Se acepta si:

- reutiliza el modelo de capas;
- no introduce un scene graph paralelo;
- define identidad y mapping sin ambigüedad;
- resuelve evaluación, cache e invalidación;
- conserva compatibilidad de documentos;
- mantiene Fabricate single-body;
- demuestra valor creativo con “Vortex Stack”;
- tiene un alcance implementable en un solo slice vertical.

No se acepta si:

- introduce `composition` como documento paralelo;
- permite instancias de instancias o ciclos;
- reutiliza IDs de la fuente;
- inventa mappings o UVs;
- promete multi-body, 3MF o CSG;
- añade un workspace de composición.
