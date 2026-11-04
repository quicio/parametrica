# Contrapropuesta — Fase 4H: Instance Layers (Composition Lite)

> Respuesta al documento **“Parametrica — Fase 5A: Generative Composition”**.
> No implementar todavía. Este documento pide una segunda iteración de la
> propuesta, no código.

---

## 1. Veredicto

La dirección creativa es buena y encaja mejor con la identidad de Parametrica
que abrir directamente Phase 5 — Solid foundations.

Pero la propuesta actual **no debería ejecutarse tal cual**:

- mezcla composición, instancias, parámetros compartidos, variaciones, mapping,
  inspección, unidades y fabricación en un solo slice;
- no aprovecha que el modelo de capas ya compone varias figuras;
- no define todavía la autoridad de IDs, mappings, orden de evaluación ni ciclos;
- puede derivar en un segundo scene graph paralelo a `layers`;
- no aclara qué aporta una instancia frente a los arrays/repeat existentes.

Mi contrapropuesta es un slice más pequeño:

> **Fase 4H — Instance Layers (Composition Lite):**
> una capa puede referenciar la geometría de otra capa, heredar sus parámetros
> compartidos y aplicar transformaciones/operadores propios, conservando IDs y
> mappings válidos.

No es un nuevo documento de composición. Es una extensión controlada del modelo
de capas existente.

---

## 2. Lo que sí se conserva de la propuesta 5A

- Explorar composiciones espaciales, no solo una superficie aislada.
- Instancias con transformaciones independientes.
- Distribución/repetición usando los operadores existentes.
- Parámetros compartidos por referencia.
- SurfaceMapping e inspección deben seguir funcionando.
- Physical Units y Fabricate Mode deben seguir siendo compatibles.
- Nada de CSG, booleanas, reparación ni funciones CAD.
- Nada de campos matemáticos en esta fase.
- Determinismo y edición paramétrica como principios.

---

## 3. Problemas concretos de la propuesta actual

### 3.1 Ya existe composición: son las capas

`documents.layers` ya permite varias figuras con generador, operadores, seed,
estilo, visibilidad y orden independientes. `evaluateLayers` evalúa cada capa
como un subdocumento y las agrega.

Por tanto, “composición de múltiples superficies existentes” no es una capacidad
nueva por sí misma. La capacidad nueva real es **referenciar una capa fuente y
derivar instancias**.

### 3.2 “Composición” puede convertirse en un segundo scene graph

Un objeto `composition` de nivel superior competiría con `layers`:

- otro orden de evaluación;
- otro modelo de IDs;
- otra UI;
- otra ruta de render/export/picking;
- otra migración.

No lo justifico para el primer slice.

### 3.3 Un operador no es el lugar correcto

Los operadores actuales reciben la geometría de **su** capa:

```text
apply(items, params, ctx) → items
```

No reciben resultados evaluados de otras capas. Meter referencias cross-layer en
un operador rompería:

- el contrato de stages;
- el cache por capa;
- el aislamiento de evaluación;
- la trazabilidad de errores.

### 3.4 Faltan reglas de identidad

La propuesta no responde con precisión:

- ¿Qué ID tiene una instancia?
- ¿Se reutiliza el `surfaceId` de la fuente?
- ¿Cómo se remapea `SurfaceMapping.surfaceId` y `meshId`?
- ¿Qué devuelve `pickSurface` cuando hay seis copias de la misma superficie?
- ¿Cómo se evita que dos instancias colisionen en caches?

Sin estas reglas, la implementación derivará en IDs duplicados y mappings
inválidos.

### 3.5 Faltan reglas de evaluación

No se define:

- orden fuente → instancia;
- invalidación cuando cambia la fuente;
- prohibición de ciclos;
- si una instancia puede referenciar otra instancia;
- qué ocurre si la fuente está oculta o bloqueada.

### 3.6 Variaciones deterministas es otro slice

“Variaciones deterministas” puede significar ruido, offsets por instancia,
expresiones por índice o seeds. Es una capacidad distinta de la composición.

En el MVP, la variación debe limitarse a:

- operadores existentes por instancia;
- transformaciones independientes;
- parámetros compartidos de la fuente.

### 3.7 Fabricate multi-body no está resuelto

Una composición produce varios cuerpos. El MVP actual de Fabricate resuelve un
solo `Mesh/Solid` cerrado y exporta un STL.

La propuesta debe declarar explícitamente:

- Fabricate sigue siendo single-body;
- una composición no se exporta como multi-body en este slice;
- no se promete 3MF.

### 3.8 El nombre “Fase 5A” es engañoso

Phase 5 está reservada en el roadmap para `solid-foundations`.

Este trabajo debería llamarse:

> **Fase 4H — Instance Layers**

o

> **Composition Lite**

No Phase 5A.

---

## 4. Auditoría real de la arquitectura

### Motor y capas

- `src/core/engine.js`
  - `evaluateDocument`
  - `evaluateLayers`
  - `evaluateSurfaceDocument`
  - `evaluateSpatialDocument`
  - caches: `SURFACE_CACHE`, `MESH_CACHE`, `MESH_VIEW_CACHE`, `WORLD_CACHE`
- `src/core/document.js`
  - `createLayer`
  - `sanitizeDocument`
  - `attachLayerAliases`
- `openspec/specs/composition-model/spec.md`
  - capas independientes, orden, visibilidad, estilo y seed por capa.

`evaluateLayers` crea un subdocumento por capa y llama a `evaluateDocument`.
No existe hoy resolución de dependencias entre capas.

### Geometría y mapping

- `src/geometry/contracts.js`: `Surface`, `Mesh`, `Solid`.
- `src/geometry/transformGeometry.js`: `mapGeometryPoints`.
- `src/geometry/surfaceTessellation.js`: `tessellateSurfaceWithMapping`.
- `src/geometry/validate.js`: validación de Surface/Mesh/Solid.
- `src/geometry/surfaceTessellation.js` genera `SurfaceMapping` con:
  - `surfaceId`
  - `meshId`
  - `domain`
  - `grid`
  - `faces[].indices`
  - `faces[].cell`
  - `faces[].uv`

### Render, inspección y picking

- `src/application/renderSceneBuilder.js`
- `src/interaction/surfacePicker.js`
- `src/interaction/inspectionOverlay.js`
- `src/interaction/seamOverlay.js`
- `src/ui/SurfaceInspector.js`
- `src/ui/UVDomainInset.js`

La inspección y el picking dependen de `layer.id`, `mesh.id`,
`mapping.meshId` y `mapping.surfaceId`.

### Unidades y fabricación

- `src/core/units.js`
- `src/application/fabricationSource.js`
- `src/export/stl.js`
- `src/export/geometryExport.js`

`buildFabricationReport` resuelve el primer cuerpo cerrado válido de la capa
activa. `exportBinarySTL` exporta un solo cuerpo.

### Conclusión de la auditoría

La extensión mínima debe vivir en el **modelo de capas** y en
**`evaluateLayers`**, reutilizando:

- `createLayer`/`sanitizeDocument` para el contrato;
- `evaluateDocument` para la capa fuente;
- `mapGeometryPoints` para transformar clones;
- `tessellateSurfaceWithMapping` para mappings;
- las rutas actuales de render/picking/inspección.

No debe crear un pipeline paralelo.

---

## 5. Alternativa propuesta: Instance Layers

### 5.1 Contrato mínimo

Una capa puede ser de dos tipos:

```js
// Capa generadora existente
{
  id: 'layer-1',
  name: 'Torus',
  generator: { id: 'parametric-surface', params: {...}, mods: {} },
  operators: [],
  style: {...},
  visible: true
}

// Nueva capa de instancia
{
  id: 'layer-2',
  name: 'Torus / radial 1',
  source: { layerId: 'layer-1' },
  generator: null,
  operators: [
    { id: 'rotate', params: { angle: 60 } },
    { id: 'scale', params: { sx: 0.92, sy: 0.92, sz: 0.92 } }
  ],
  style: {...},
  visible: true
}
```

Reglas:

- `source.layerId` debe apuntar a una capa generadora del mismo documento.
- En el MVP no se permiten cadenas de instancias ni ciclos.
- La capa fuente conserva la autoridad sobre parámetros y seed.
- La instancia tiene autoridad sobre sus operadores, estilo, visibilidad y
  orden.
- La instancia no puede editar la geometría de la fuente.
- La instancia no persiste mallas ni mappings derivados.

### 5.2 Resolución de la fuente

`evaluateLayers` debe:

1. Evaluar primero las capas generadoras.
2. Resolver cada instancia contra su fuente.
3. Reutilizar la evaluación de la fuente dentro del mismo ciclo.
4. Aplicar los operadores de la instancia sobre el clon world.
5. Tessellar/mapping solo cuando corresponda.
6. Agregar el resultado al mismo resultado de capas existente.

No se duplica la evaluación del generador. Sí se duplica la geometría world
necesaria para que render/picking/export sigan consumiendo datos canónicos.

### 5.3 Identidad

IDs deterministas y sin colisión:

```text
instance layer.id       = layer-2
instance surfaceId      = layer-1#surface-0@layer-2
instance meshId         = layer-1#surface-0@layer-2:mesh
sourceSurfaceId         = layer-1#surface-0
sourceLayerId           = layer-1
```

Reglas:

- No reutilizar `surfaceId` ni `meshId` de la fuente.
- `SurfaceMapping.surfaceId` y `meshId` se remapean al clon.
- `domain`, `grid`, `faces[].indices`, `cell` y `uv` se conservan.
- El mapping puede clonarse si solo cambian transformaciones.
- Si un operador cambia topología, el mapping se regenera como en 4A.
- `pickSurface` debe devolver `layerId` de la instancia y `sourceLayerId`.

### 5.4 Evaluación y cache

La firma de una instancia debe incluir:

- `layer.id`;
- `source.layerId`;
- firma de la capa fuente;
- operadores de la instancia;
- seed/time/quality aplicables.

Si cambia la fuente:

- se invalida la fuente;
- se invalidan sus instancias;
- no se invalidan capas independientes.

### 5.5 Visibilidad y bloqueo

Decisión a resolver en la propuesta refinada:

- ¿Ocultar la capa fuente oculta también sus instancias?
- Mi recomendación: **no**. La fuente se evalúa igualmente; la visibilidad de la
  instancia es independiente.
- Bloquear la fuente no debe bloquear la instancia, pero la instancia no puede
  editar los parámetros de la fuente.

### 5.6 UI mínima

- En **Layers**, acción “Add instance layer”.
- Selector de capa fuente.
- La capa de instancia muestra su fuente en la fila y en el inspector.
- Los parámetros de la fuente no se duplican en la instancia.
- Los operadores de la instancia se editan con el stack actual.
- Sin nuevo workspace de composición.

### 5.7 Inspección

La inspección debe mostrar:

- instancia (`layerId`, `layerName`);
- fuente (`sourceLayerId`, `sourceLayerName`);
- `surfaceId` de la instancia;
- mapping ok/mismatch;
- UV, celda y XYZ.

El UV Domain y los seams deben usar el mapping de la instancia, no el de la
fuente.

### 5.8 Fabricate

- Se mantiene single-body.
- Fabricate resuelve el primer cuerpo válido de la capa activa.
- Una capa de instancia puede ser válida como fuente de fabricación si su clon
  produce un cuerpo cerrado.
- No se añade multi-body, packing ni 3MF.
- La propuesta debe declarar esta limitación de forma visible.

---

## 6. Alcance del MVP

### Dentro

- Capas de instancia que referencian una capa generadora.
- Transformaciones por instancia mediante operadores existentes.
- Parámetros compartidos por referencia.
- Distribución/array usando los operadores actuales.
- Mapping remapeado y válido.
- Inspección con fuente + instancia.
- Determinismo y cache.
- Compatibilidad con documentos existentes.
- SVG/PNG con el orden y estilo actuales.
- Fabricate single-body.

### Fuera

- CSG, booleanas, caps, reparación.
- Campos matemáticos.
- Variaciones procedurales más allá de operadores.
- Cadenas de instancias o DAG.
- Composición multi-fuente en un mismo objeto.
- Multi-body STL, 3MF, packing.
- Edición de geometría clonada.
- Nuevo workspace o documento de composición.
- Instanced rendering o GPU instancing.

---

## 7. Casos de aceptación

### Unitarios

- Una capa de instancia conserva generador/params de la fuente.
- IDs de instancia son únicos y deterministas.
- `SurfaceMapping` remapea `surfaceId`/`meshId` y conserva dominio/UVs.
- Cambiar un parámetro de la fuente cambia todas sus instancias.
- Cambiar una instancia no cambia la fuente.
- Una referencia a capa inexistente produce error keyed, no crash.
- Un ciclo o una instancia de instancia se rechaza en el MVP.
- Ocultar la fuente no elimina sus instancias.
- La evaluación es determinista para el mismo documento/seed/time.

### Integración

- Render de varias instancias con estilos independientes.
- Picking devuelve la instancia correcta y su `sourceLayerId`.
- Inspector muestra UV/mapping de la instancia.
- UV Domain/Seams usan el mapping de la instancia.
- Export SVG/PNG conserva orden y estilos.
- Fabricate sigue resolviendo un solo cuerpo.
- Physical Units no altera la geometría de instancia.

### E2E

- Crear una capa fuente Torus.
- Añadir 6 instance layers con rotación/escala.
- Cambiar `samplesU` o una expresión de la fuente y ver actualizar las 6.
- Inspeccionar dos instancias y comprobar IDs distintos y mismo `sourceLayerId`.
- Exportar SVG.
- Comprobar que Fabricate exporta un cuerpo o queda limitado a uno.

---

## 8. Demo creativa obligatoria

Una superficie fuente:

```text
Parametric Surface · Torus
```

Seis instancias:

```text
0°   · 1.00
60°  · 0.92
120° · 0.84
180° · 0.76
240° · 0.68
300° · 0.60
```

La demo debe demostrar:

- que las seis comparten la ecuación fuente;
- que cada una tiene transformación propia;
- que cambiar la fuente actualiza todas;
- que la inspección distingue instancia y fuente;
- que el resultado es visualmente interesante sin CSG ni campos.

Si la demo no aporta valor creativo claro, el slice no debe implementarse.

---

## 9. Preguntas que debe resolver el documento refinado

1. ¿La instancia referencia una capa o una superficie concreta dentro de una capa?
2. ¿Qué ocurre si la fuente tiene varias superficies?
3. ¿La instancia puede aplicar cualquier operador aceptado por Surface/Mesh?
4. ¿Cuál es la política exacta de ciclos y profundidad?
5. ¿Qué IDs se persisten y cuáles se derivan?
6. ¿El mapping se clona o se regenera? ¿En qué casos?
7. ¿Qué pasa si la fuente está oculta, bloqueada o tiene errores?
8. ¿Cómo se selecciona una instancia en el canvas y en Layers?
9. ¿Cómo se comporta Fabricate con varias instancias?
10. ¿Qué parte de la UI es nueva y cuál reutiliza Layers/Operators?

---

## 10. Formato esperado de la segunda iteración

El documento refinado debe incluir:

- alcance final y no-goals;
- contrato de datos exacto;
- reglas de IDs;
- reglas de mapping;
- orden de evaluación, cache y ciclos;
- visibilidad/bloqueo;
- UI mínima;
- compatibilidad y migración;
- limitaciones explícitas de Fabricate;
- casos unit/integration/e2e;
- demo creativa;
- criterios de aceptación;
- riesgos y decisiones abiertas.

Sigue prohibido implementar código, crear commits o archivar OpenSpec en esta
iteración.

---

## 11. Criterio de decisión

Aceptaría la propuesta refinada si:

- mantiene el foco en **instance layers** y no en un scene graph;
- reutiliza `layers`, `evaluateLayers`, `SurfaceMapping` y picking;
- define IDs y mappings sin ambigüedad;
- limita el MVP a una fuente y transformaciones;
- declara Fabricate single-body;
- incluye una demo creativa convincente.

Rechazaría cualquier versión que:

- introduzca un documento `composition` paralelo;
- añada CSG/campos/reparación;
- mezcle variaciones y composición;
- prometa multi-body o 3MF;
- no explique la diferencia entre instancia y capa independiente.
