# Parametrica — Auditoría de arquitectura y evolución del acabado geométrico

**Estado auditado:** commit `35fda6d` (`Polish lattice cells, joints, perforation and print checks`).
**Fecha:** 2026-11-06.
**Alcance:** arquitectura, generador lattice, visualización, fabricación y evolución.
**Naturaleza:** auditoría de solo lectura. No se modificó código de implementación, no se
crearon especificaciones OpenSpec y no se hizo commit.

**Método.** Lectura directa del código, contraste con `docs/architecture.md` y
`openspec/specs/`, y mediciones puntuales en Node sobre los presets
`Solid Vase 200`, `Lattice Vase 200` y `Perforated Vase 200`. Las mediciones
no son gates de CI; sirven para dimensionar el estado actual.

**Marcas usadas en todo el documento:**

- **[H] Hecho verificado:** leído en el código o medido directamente.
- **[I] Inferencia:** consecuencia razonada de un hecho, no ejecutada.
- **[R] Recomendación:** propuesta, no implementada.
- **[D] Decisión pendiente:** requiere aprobación del responsable del proyecto.

---

# 1. Resumen ejecutivo

Parametrica tiene una arquitectura sólida y poco habitual para una app de
navegador: un **documento JSON** se evalúa con un pipeline puro, determinista y
cacheado; la geometría canónica vive en **world space**; la presentación se
resuelve en una única capa de escena; y la fabricación es una **derivación
validada** que nunca reescribe la geometría autoral. Esa separación es el activo
principal y debe preservarse.

El acabado lattice actual, sin embargo, es más limitado de lo que sugiere el
nombre:

- Es un **Voronoi periódico sobre una superficie de revolución**, no un sistema
  general de lattice sobre superficies arbitrarias.
- Los struts son **tubos de radio constante** con tapas planas; las uniones son
  esferas low-poly. No hay blending orgánico, sección variable ni continuidad
  G1/G2.
- La “uniformidad” de celdas es **heurística y dependiente de la seed**. En el
  preset real medí un coeficiente de variación de área de celda de **0.357**;
  el escenario de test con otra seed/top da **0.257**. La afirmación “celdas
  uniformes” no está garantizada por contrato.
- La visualización es **p5 2D sobre Canvas**: no hay WebGL, materiales PBR,
  iluminación, sombras, AO ni z-buffer. El sombreado es por profundidad/alfa y
  painter’s algorithm.
- La fabricación es robusta en validación y reparación, pero la
  manufacturabilidad es **heurística**: no hay slicer, soportes, espesor mínimo
  medido ni optimización de orientación.
- Hay dos detalles de contrato que conviene corregir antes de crecer:
  `3MF` asume caras triangulares sin triangularlas, y el flag
  `manifoldGuaranteed` puede sobrevivir a post-procesos que ya no lo garantizan.

La evolución recomendada no es “más features” sino **extraer contratos
explícitos** para el lattice, los struts orgánicos, el refinamiento, la
apariencia y el perfil de fabricación, manteniendo el documento y el renderer
actuales como base. La identidad de Parametrica —exploración paramétrica, no
CAD— se preserva si el lattice se trata como **geometría derivada** y la
apariencia como **capa de presentación**, no como parte del documento
geométrico.

**Baseline medido [H]:**

| Indicador | Valor |
|---|---:|
| Presets built-in | 51 |
| Generadores registrados | 25 |
| Checks Node (lab + dominio) | 2151 + 534 = 2685 |
| Tests e2e | 152 |
| Specs OpenSpec | 110 |

---

# 2. Arquitectura actual

## 2.1 Modelo mental

El pipeline es:

```text
Documento JSON (v3)
  │
  ├─ evaluateDocument(document, {time, quality})
  │     ├─ generator (2D sample | 3D generate)
  │     ├─ world operators → view operators
  │     ├─ enforceBudget (50k/corve, 200k total)
  │     ├─ análisis diferencial lazy
  │     └─ Surface → Mesh (teselación + SurfaceMapping)
  │
  ▼
Evaluation { curves, geometry, meshes, surfaceMappings, renderMeshes, errors, stats, bbox }
  │
  ├─ buildRenderScene(evaluation, document, view)
  │     └─ RenderScene { layers, transform, meta }
  │           ├─ P5Adapter (Canvas)
  │           ├─ SVG / plotter
  │           └─ previews
  │
  └─ buildFabricationReport(evaluation, layerIndex, units, fabrication)
        └─ Mesh/Solid derivado → validación → STL / 3MF
```

**[H]** El motor (`src/core/engine.js`) es puro y corre en Node. No importa p5,
DOM ni la UI. La proyección y el encuadre viven en `src/view/` y el renderer sólo
consume `RenderScene`.

## 2.2 Módulos y responsabilidades

| Capa | Archivos clave | Responsabilidad |
|---|---|---|
| Documento / contratos | `src/core/document.js`, `src/core/schema.js`, `src/core/layers.js`, `src/core/units.js` | Documento v3, sanitización, layers, unidades físicas |
| Registro | `src/core/registry.js` | Generadores, operadores y passes auto-registrados |
| Evaluación | `src/core/engine.js` | Pipeline, cachés por etapa, presupuestos, análisis lazy |
| Generadores | `src/generators/*.js` | 2D `sample` y 3D `generate`; `surface-lattice` incluido |
| Operadores | `src/operators/*.js` | Transformaciones world/view sobre curvas y superficies |
| Geometría | `src/geometry/*.js` | Contratos, teselación, validación, reparación, CSG, SDF, lattice, perforación |
| Vista | `src/view/camera.js`, `transform.js`, `projection.js`, `viewportCoordinates.js`, `spatialReference.js` | Cámara orbital, proyección, frame, ejes, picking |
| Escena | `src/application/renderSceneBuilder.js` | Única conversión world → artboard para presentación |
| Render | `src/render/p5/P5Adapter.js`, `src/render/passes/*.js`, `scene.js`, `fill.js`, `passStyle.js` | Backend p5, passes, estilo, gradientes |
| Fabricación | `src/application/fabricationSource.js`, `fabricationJobs.js`, `fabricationJobRunner.js`, `src/workers/fabricationWorker.js` | Selección de fuente, reparación, booleanos, worker |
| Export | `src/export/stl.js`, `3mf.js`, `geometryExport.js`, `Exporter.js` | STL binario, 3MF, validación de export |
| UI | `src/ui/Controls.js`, `src/ui/sections/*.js` | Modos, paneles, orquestación de Fabricate |
| Presets | `src/presets/builtins.js`, `catalog.js`, `PresetManager.js`, `preview.js` | Documentos de ejemplo, metadatos, thumbnails |

## 2.3 Flujo de parámetros a geometría

**[H]** `evaluateDocument` despacha según capacidades:

- Generadores 2D/planos: `generator.sample()` → `Curve2D` en artboard.
- Generadores espaciales: `generator.generate()` → `Curve3D`/`Surface` en world.
- Superficies: `Surface` → `tessellateSurfaceWithMapping` → `Mesh` + `SurfaceMapping`.
- Instancias: `evaluateInstanceLayer` sobre la capa fuente.

Los parámetros se resuelven con `resolveParams` (`src/animation/animatable.js`),
que admite números y expresiones animables. Las expresiones se compilan con un
parser propio (`src/math/expression.js`) y un scope inyectado
(`src/math/stdlib.js`); no hay `eval`/`new Function` sobre input del usuario
**[H]** (el comentario de `docs/architecture.md` lo confirma y el código lo
implementa con `compileOrThrow`).

### Cachés y estado

| Caché | Clave | Qué evita |
|---|---|---|
| `STAGE_CACHE` | `(seed,time,quality,timeline,stage.id,params,mods,enabled)` | Re-evaluar prefijos de etapas |
| `SURFACE_CACHE` | `(version,seed,time,quality,generator,params,worldOps)` | Regenerar superficies |
| `WORLD_CACHE` | similar + operadores world | Re-evaluar curvas 3D |
| `VIEW_CACHE` | world geometry + cámara + proyección + fit | Reproyectar curvas |
| `MESH_CACHE` | identidad de `surfaces` | Reteselar |
| `MESH_VIEW_CACHE` | malla + proyección + cámara + fit | Reproyectar mallas |
| `INSTANCE_CACHE` | capa instancia + firma | Re-evaluar instancias |
| `SCENE_CACHE` | evaluación + view + preview | Reconstruir `RenderScene` |
| `FabricationJobs` | evaluación + prepKey + capa | Re-lanzar el worker |
| `PresetManager` preview | hash del documento | Regenerar thumbnails |

**[H]** Los presupuestos son 50 000 puntos por curva y 200 000 totales
(`POINT_LIMITS`), aplicados después de cada etapa. El análisis diferencial es un
getter lazy. La cámara no invalida la geometría world.

**[H]** La UI guarda historial (50 pasos) y sesión; el documento es la unidad de
persistencia. No hay estado geométrico oculto en la UI.

## 2.4 Flujo de geometría a visualización

**[H]** `buildRenderScene` (`src/application/renderSceneBuilder.js`):

1. Agrupa las capas visibles.
2. Elige la proyección (`3d`, `xy`, `xz`, `yz`) con fallback si no hay geometría
   espacial.
3. Resuelve **una** `ViewTransform` para la escena (`frame.mode = scene`) o una
   por capa (`composition`).
4. Proyecta curvas y mallas con `projectWorldCurvesToView` /
   `projectWorldMeshesToView`.
5. Deriva wireframes de mallas con `meshWireframeCurves` (sólo mallas con
   `meta.gridRows/gridCols`).
6. Aplica el frame y devuelve `RenderScene { layers, transform, meta }`.

La cámara es orbital alrededor de **+Z** (`src/view/camera.js`): `yaw` gira el
ojo, `pitch` lo sube/baja, `fov` es el radio de órbita y la distancia al plano.
`+Z` es vertical en pantalla. Las proyecciones ortográficas usan
`PROJECTION_AXES` (`src/view/viewportCoordinates.js`).

**[H]** `P5Adapter.drawFrame` compone: fondo, artboard, guías/underlay,
referencia espacial, passes por capa, overlays, coordenadas y, opcionalmente,
quad view. p5 se importa de forma lazy; `p.smooth()` y
`pixelDensity(devicePixelRatio)` están activos.

## 2.5 Flujo de geometría a STL/3MF

**[H]** `Exporter.buildSTLFromCurrent` obtiene el `fabricationReport` (o lo
recalcula), exige `exportable` y llama a `exportBinarySTL`. El STL:

- es binario, little-endian;
- triangula cada cara con abanico (`face[0], face[i], face[i+1]`);
- calcula la normal por winding;
- aplica `mmPerWorldUnit` sólo a las coordenadas exportadas;
- **no incluye unidad** (STL no tiene campo de unidad); el header dice
  “millimetres”.

`export3MF` escribe un objeto por body, `unit="millimeter"` y escala las
coordenadas. **Detalle [H]:** `build3MFModelXML` escribe
`v1=face[0], v2=face[1], v3=face[2]`; no triangula caras de más de 3 vértices.

## 2.6 Contratos y tipos

**[H]** `src/geometry/contracts.js` define datos planos, no clases:

- `Curve2D`, `Curve3D` (`points`, `closed`, `meta`).
- `Surface` (`domain`, `grid.points[u][v]`, `grid.rows/cols`).
- `Mesh` (`vertices`, `faces`, `normals?`, `faceNormals?`, `uvs?`, `meta`).
- `Solid` (`boundary`, `shells`, `closed`, `volume`, `validation`).

La validación (`src/geometry/validate.js`) devuelve
`{ ok, errors, warnings, meta }`; `validateMesh` calcula bordes abiertos,
non-manifold, orientación inconsistente, caras degeneradas, volumen y
auto-intersecciones.

## 2.7 Contraste con la documentación

**[H] Deriva documental detectada:**

- `docs/architecture.md` dice “24 registered models”; el registro real tiene
  **25** generadores (`Generators.list()`), incluyendo `surface-lattice`.
- `docs/architecture.md` no tiene capítulo de **Fabricate** ni de
  lattice/perforación/print checks; el módulo existe y es central.
- El comentario de `src/geometry/latticeNetwork.js` dice “Two Lloyd steps”;
  el código ejecuta **4** (`for pass < 4`).
- `src/geometry/perforation.js` conserva un bloque de comentario obsoleto
  (“Outer radius R(z)…” ) antes de la función exacta
  `radiusProfileFromSurface`.
- `src/presets/builtins.js` define `FABRICATE_UNITS` con
  `mmPerWorldUnit: 10`, mientras los jarrones lo sobrescriben a `1`. Es una
  convención frágil si se copia un preset sin el override.

---

# 3. Auditoría del generador lattice

## 3.1 Algoritmo real

**[H]** El generador `surface-lattice` (`src/generators/surfaceLattice.js`)
recibe:

- `profile`: expresión `R(v)` para `v ∈ [0,1]`;
- `height`: altura Z;
- `floor`: z mínimo;
- `cellSize`: pitch nominal en mm;
- `strut`, `rim`, `seed`, `samples`;
- `fit`, `depthOcclusion`, `depthAttenuation` para presentación.

`generate()` compila la expresión y construye la red con
`buildRevolveLattice` (`src/geometry/latticeNetwork.js`). Los pasos exactos:

1. **Área lateral** por integración de troncos de cono sobre `[zMin,zMax]`
   (192 muestras). `meanRadius` es el radio medio.
2. **Cantidad de seeds** ≈ `area / cellSize²`.
3. **Muestreo de seeds**: `z` uniforme, aceptado con probabilidad
   proporcional a `R(z)²` (por defecto `seedWeight: 'radius2'`), `theta`
   uniforme. La idea es compensar el estiramiento métrico `R/meanR` al
   desenrollar el cilindro.
4. **Voronoi periódico** en el plano `(X = theta·meanR, z)`: cada celda parte de
   un rectángulo grande y se recorta contra las mediatrices de todas las seeds y
   sus copias `±2π` (`voronoiCells`, `clipHalfPlane`). Esto evita una costura
   vertical artificial.
5. **4 pasadas de Lloyd**: el centroide de cada celda se convierte en la nueva
   seed, con wrap periódico en `X` y clamp en `z`.
6. **Aristas compartidas**: se deduplican por clave cuantizada de
   `(θ, z)`; se descartan aristas menores a `max(1.5, cellSize·0.1)`.
7. **Curvas**: cada arista se muestrea en `samples` pasos (por defecto 6) sobre
   `x=R(v)cosθ`, `y=R(v)sinθ`, `z`. Se emite un `Curve3D` por arista.
8. **Estadísticas**: celdas, aristas, longitud mínima/media/máxima, área de
   celda y su CV.

La red es **determinista** para `(perfil, parámetros, seed)`; la seed efectiva
del generador es `params.seed + ctx.seed·9973`.

### Mediciones del preset real

**[H]** Con el perfil del preset (R−1.75), `height=200`, `top=198`, `floor=3`,
`cellSize=20`, seed `9980`, 6 muestras:

| Métrica | Valor |
|---|---:|
| Celdas | 220 |
| Aristas / struts | 638 |
| Longitud mínima | 2.0 mm |
| Longitud media | 13.9 mm |
| Longitud máxima | 44.1 mm |
| Área de celda media | 392.6 mm² |
| Área de celda mín./máx. | 153.7 / 1064.2 mm² |
| CV de área de celda | **0.357** |

**[H] Contraste importante:** el test de `surface-lattice` usa el perfil sin
inset, `top=200`, seed 7 y obtiene CV **0.257**; con seed 8, CV **0.319**. Es
decir, la uniformidad **depende de la seed y del recorte superior**. El preset
real está por encima del umbral de 0.35 que el propio test usa para el escenario
“fácil”. La afirmación de “celdas uniformes” es, hoy, una mejora relativa, no
una garantía.

**[I]** La causa principal es que el diagrama se calcula con un radio nominal
constante (`meanRadius`), no con una métrica local `R(z)`. La ponderación R²
compensa en promedio, pero no convierte el problema en un Voronoi conforme. Las
celdas de borde (piso/boca) además quedan truncadas, lo que infla el CV.

## 3.2 Construcción del sólido

**[H]** `buildLatticeSolid` (`src/geometry/latticeSolid.js`):

1. Cada `Curve3D` se convierte en un **tubo cerrado** con
   `tubeMesh`: frames por parallel transport, sección circular de
   `radialSegments` lados (8 por defecto), tapas planas.
2. En cada vértice de grado ≥ 3 se agrega una **esfera low-poly** de radio
   `1.04·strut/2`; se omiten esferas a menos de `2.15·radio` para evitar
   auto-intersecciones. Todas las esferas se empaquetan en **un solo Mesh**
   (`jointSpheresMesh`).
3. **Piso**: cilindro sólido desde `z=0` hasta `floor + 2r + 0.5`, radio
   `max(R del anillo inferior) + r`.
4. **Borde**: toro de radio mayor `max(R del anillo superior)`, menor
   `max(rim/2, 1.3r)`, centrado en `height − minor` para que el tope quede en
   `height`.
5. **Unión**: `booleanSolids('union', [piso, borde, joints, ...tubos])` con
   `strategy:'manifold'`, `tolerance`, `maxInputTriangles: 400 000`.
6. **Post-proceso**:
   - si la validación falla, `repairMesh` con `orient:true`, `topology:'split'`;
   - si quedan loops de borde menores a `max(0.1, tolerance·10)`, se tapan
     (`capMicroHoles`); loops mayores se consideran fallas reales.
7. **Validación**: cerrado, manifold, orientado, volumen positivo.

### Mediciones del sólido

**[H]** `Lattice Vase 200`:

| Métrica | Valor |
|---|---:|
| Struts | 638 |
| Uniones (esferas) | 373 |
| Triángulos | 121 142 |
| Vértices | 60 093 |
| Volumen | 119 554.76 mm³ |
| BBox | 174.72 × 174.85 × **199.89** mm |
| Tiempo de build (Node) | ~3.2 s |
| Estrategia | Manifold |
| Micro-caps | 0 |

El bbox no da exactamente 200 mm: el toro del borde se tesela en 96×10 y el
tope real queda ~0.11 mm por debajo. El test lo tolera (<1 mm); es una precisión
dimensional a documentar.

**[H]** Casos de escala: con `cellSize=15` el sólido pasa a ~213k triángulos y
~10.8 s; con 25 mm, ~77k triángulos y ~2.3 s. El costo y la robustez dependen
fuertemente de la densidad.

## 3.3 Qué es paramétrico y qué es derivado

| Elemento | Naturaleza |
|---|---|
| `R(v)`, `height`, `cellSize`, `strut`, `rim`, `floor`, `seed`, `samples` | **Paramétrico** (documento) |
| Seeds y celdas Voronoi | **Derivado determinista** de seed+params |
| Aristas y puntos de curva | **Derivado** |
| Tubos, esferas de unión, piso, borde | **Derivado** (malla) |
| Unión Manifold, micro-caps | **Derivado** |
| Preview sólido simplificado | **Derivado de presentación** |
| Perfil de fabricación, checks | **Derivado de análisis** |

La malla del sólido **no se guarda en el documento**; se recalcula al abrir
Fabricate. El documento sólo conserva la red de curvas y los parámetros.

## 3.4 Respuestas explícitas

- **¿Los struts son cilindros, tubos, segmentos, curvas o superficies?**
  Los centroides son **curvas 3D** (`Curve3D`) muestreadas; el sólido son
  **tubos cerrados** de sección circular constante. No son superficies
  paramétricas de espesor variable.
- **¿Cómo se representan las intersecciones?**
  No se resuelven en la red. Se resuelven en la **unión booleana Manifold** de
  tubos, esferas, piso y borde. No hay blending ni intersección explícita entre
  curvas.
- **¿La geometría se construye mediante operaciones booleanas?**
  Sí, para el sólido: unión de cientos de tubos + joints + piso + borde. La red
  de curvas en sí no usa booleanos.
- **¿Se utiliza algún sistema de superficies implícitas?**
  En el lattice **no**. El proyecto sí tiene SDF (`sdfRepair`,
  `manifoldLevelSet`, `remesh` con marching tetrahedra), pero el lattice no lo
  usa. Las intersecciones son malla/boolean, no campo implícito.
- **¿Qué partes son realmente paramétricas?**
  El perfil, la altura, la densidad, la seed, el strut, el rim y el floor. La
  topología celular es derivada de la seed; el usuario no edita celdas
  individuales.
- **¿Qué partes son geometría derivada?**
  Seeds, celdas, aristas, tubos, esferas, piso, borde, unión, perforaciones y
  previews.
- **¿Qué limitaciones tiene el algoritmo para un acabado escultórico?**
  Radio constante, tapas planas, joints low-poly, ausencia de blending,
  revolución solamente, uniformidad dependiente de seed, sin densidad local,
  sin sección variable, sin control de desviación, sin refuerzo/suavizado
  adaptativo, y un renderer 2D que no muestra normales ni materiales.

## 3.5 Continuidad, suavizado y transformaciones

- Las aristas son **lineales en (θ,z)**, muestreadas sobre la superficie; no son
  splines. En los vértices celulares terminan tubos separados.
- Las tapas de tubo son planas; las esferas de unión son de 5–6 slices y 4–5
  stacks. No hay continuidad G1/G2.
- La unión Manifold resuelve intersecciones, pero deja facetas y cambios de
  sección visibles.
- **[H] Transformaciones:** `buildLatticeCandidate` toma las curvas ya
  evaluadas (post-operadores world) pero construye piso/borde asumiendo **Z-up y
  una revolución alrededor del eje Z**, usando `params.height`. Un operador
  world que traslade/rote/deforme la red puede dejar piso/borde desalineados.
  No hay un contrato que impida esa combinación.
- **Perforación:** el modo cutout reutiliza sólo las **seed positions** del
  Voronoi; los agujeros son cilindros radiales redondos, no celdas Voronoi. Es
  una alternativa válida, pero no es la misma geometría que la canasta de
  struts.

---

# 4. Auditoría del sistema de visualización

## 4.1 Motor y pipeline

**[H]** `P5Adapter` (`src/render/p5/P5Adapter.js`) usa **p5 1.11** en modo
**Canvas 2D**. Se carga lazy. En `mount`:

- `createCanvas(w,h)` sin `WEBGL`;
- `pixelDensity(devicePixelRatio)`;
- `p.smooth()` (antialiasing del canvas);
- `p.frameRate(60)`.

`drawFrame`:

1. Avanza el reloj de animación si `playing`.
2. Fondo, artboard, translate/scale.
3. `buildRenderScene` (o quad por panel).
4. Guías, underlay, referencia.
5. `drawSceneContent`: por capa, por `modeId`, ejecuta el pass registrado.
6. Overlays, inspección, seams, coordenadas.
7. `p.pop()`.

No hay `WEBGL`, `ambientLight`, `directionalLight`, `shader`, `normalMaterial`
ni texturas en el código de render **[H]** (búsqueda exhaustiva en `src/render`).

## 4.2 Materiales, iluminación, sombras, AO

| Capacidad | Estado |
|---|---|
| Materiales | **No.** Sólo `style.stroke`/`style.fill` (color, opacidad, ancho, gradiente) |
| PBR (roughness/metallic) | **No** |
| Iluminación | **No** |
| Sombras | **No** |
| Ambient occlusion | **No** |
| HDRI | **No** |
| Antialiasing | **Sí**, `p.smooth()` + devicePixelRatio |
| z-buffer | **No**; painter’s algorithm |
| Post-proceso | **No** |

**[H]** `surface-fill` ordena caras por profundidad media y dibuja cada cara con
`beginShape/vertex/endShape`; `lattice-preview` agrupa en 48 bandas de
profundidad y dibuja un path por banda. El sombreado es por alfa de profundidad
(o bandas), **no por normal**. `fill.js` soporta relleno sólido y gradientes
lineal/radial; `palettes.js` y `lookPresets.js` son recetas de color/passes, no
materiales.

## 4.3 Cámara y calidad

- **Cámara [H]:** orbital alrededor de +Z, `yaw/pitch/fov`; `project3D` pinhole;
  eye a distancia `fov`; near-plane clipping; `+Z` vertical. `P5Adapter` también
  soporta drag, zoom y quad view con proyecciones `xy/xz/yz`.
- **Resolución [H]:** canvas CSS × devicePixelRatio; artboard por defecto
  900×900; `fit` encuadra la escena; no hay supersampling ni TAA/SSAA.
- **Mallas [H]:** la resolución la fija el generador (`samplesU/V` de la
  superficie) y la teselación (2 triángulos por celda). No hay teselación
  adaptativa por curvatura en el camino de superficie.
- **Preview vs final [H]**:
  - Red: curvas de la red (rápido).
  - Sólido: malla preparada; si >60k caras, `manifoldSimplify(0.35)` para
    pantalla (la exportación usa la malla completa).
  - Durante drag/playback: fallback a red.
  - El preview sólido oculta las demás capas y usa `lattice-preview`.
  - Mediciones: sólido ~46–61 ms/frame; red durante drag ~4–7 ms; el fill
    per-face original del sólido denso llegó a ~839 ms, y el batching lo bajó a
    ~160 ms; con simplificación ~50 ms.

## 4.4 Separación geometría / apariencia / materiales / iluminación / render

- **Geometría vs apariencia:** separadas. `style`/`lookPresets` no tocan
  geometría; los passes leen estilo.
- **Materiales:** no existen como contrato; sólo color/opacidad/gradiente.
- **Iluminación:** no existe.
- **Renderizado:** abstraído por `Renderer` y `RenderScene`; p5 es una
  implementación. SVG/plotter consumen la misma escena.
- **Mejoras sin tocar geometría [R]:** paletas/estilo, cámara, guides,
  antialiasing, preview simplificado, overlays, y un **backend de presentación
  PBR** que consuma la misma `RenderScene` (no la geometría autoral).

---

# 5. Auditoría del pipeline de fabricación

## 5.1 Flujo Fabricate

**[H]** `Controls.refreshFabricate` construye
`{ evaluation, layerIndex, units, preparation }`. Si
`isHeavyFabrication(prep)` (boolean, repair, self-intersections o lattice), lo
manda al worker; si no, llama `buildFabricationReport` en el hilo principal.
El worker (`src/workers/fabricationWorker.js`) corre
`runFabricationJob`, que inicializa Manifold, emite progreso grueso
(`engine`, `boolean|sdf|preparing`, `done`) y devuelve el reporte.

**[H]** `resolveFabricationSource`:

1. Normaliza la preparación (`scope`, boolean, repair, cap, topology,
   nonOrientable, CSG strategy, SDF, lattice, cutouts, tolerance, etc.).
2. Elige la capa activa o todas las visibles (`composition`).
3. Si `lattice` y la capa es `surface-lattice`, construye el sólido de tubos
   (`buildLatticeCandidate`) y lo usa como único candidato.
4. Si no, selecciona `Mesh/Solid` de `layer.geometry`/`layer.meshes`.
5. Repara (`repairMesh` / `repairSelfIntersections`) si se pidió.
6. Aplica weld/cap (`prepareMesh`) si se pidió.
7. Aplica booleanos de scope (`booleanSolids`) si hay ≥2 bodies.
8. En modo cutouts, resta los cilindros de perforación del shell.
9. Devuelve `source`, `candidates`, `bodies`, errores y el reporte.

## 5.2 Reparación, booleanos y validación

- **Weld/cap [H]:** `solidPrep.js` (`weldMesh`, `prepareMesh`, `mergeMeshes`,
  `boundaryLoops`), tolerancia 1e-6 por defecto, hash espacial determinista.
- **Reparación [H]:** `repair.js` limpia caras inválidas/degeneradas/duplicadas,
  suelda, tapa loops (planar ear-clipping con fallback fan), repara orientación
  por grafo de adyacencia y volumen de shells, y opcionalmente topología
  (`split`/`remove`, non-orientable `cut`/`reject`).
- **Auto-intersecciones [H]:** `selfIntersection.js` usa BVH + tests de
  triángulos con `orient3dSign` exacto; `selfIntersectionRepair.js` prefiere
  **Manifold SDF** (`sdfRepair` + `Manifold.levelSet`) y cae a **remesh**.
- **CSG [H]:** `booleanSolids` usa Manifold si está listo (`strategy:auto`), si
  no BSP propio; `strategy:'remesh'` usa marching tetrahedra. Límites BSP:
  `maxDepth 4096`, `maxPolygons 250 000`, `maxInputTriangles 50 000` por
  defecto (el lattice lo sube a 400 000). Manifold es el camino primario.
- **Validación [H]:** `validateMesh` exige cerrado, manifold, orientado,
  volumen finito/positivo, sin caras degeneradas y sin auto-intersecciones
  (salvo `meta.manifoldGuaranteed`). `validateForFabrication` es la puerta del
  export.

### Hallazgo de confianza [H]

`manifoldEngine.fromManifold` marca `meta.manifoldGuaranteed = true` y
`validateMesh` **omite** la detección de auto-intersecciones cuando ese flag
está presente. `repairMesh`, `capMicroHoles` y el preview conservan
`...mesh.meta`, por lo que el flag puede sobrevivir a:
- `topology:'split'` dentro de `manifoldBoolean`;
- reparación de orientación;
- micro-caps;
- simplificación de preview (aunque `manifoldSimplify` vuelve de Manifold, el
  caso de `capMicroHoles` sobre un resultado ya reparado es el más sensible).

**[I]** No observé un defecto en los presets actuales, pero es un **riesgo de
contrato**: un post-proceso que cambia topología no debería heredar una garantía
de Manifold. La mitigación es limpiar el flag al post-procesar o revalidar sin
la garantía.

## 5.3 STL y 3MF

- **STL [H]:** binario, 80-byte header, triángulos de 50 bytes, normales por
  winding, escala de unidades aplicada sólo al escribir, sin campo de unidad. El
  header declara milímetros. `validateForFabrication` se ejecuta de nuevo en el
  exportador.
- **3MF [H]:** un objeto por body, `unit="millimeter"`, escala de vértices,
  ZIP store determinista. **No triangula caras**: escribe sólo
  `face[0..2]`. En el pipeline actual las mallas finales suelen ser triangulares
  (teselación de superficie y salida Manifold), pero el contrato `Mesh` admite
  polígonos. Es una inconsistencia latente.
- **¿Conserva la geometría original?** **No exactamente.** Exporta una
  **representación derivada**:
  - una `Surface` siempre se tesela a `Mesh`;
  - si hay repair/cap/weld, se aplica;
  - si hay boolean/lattice/perforación, se exporta el resultado;
  - el STL triangula y escala; el 3MF escribe caras tal cual.
  Si la fuente ya es un `Mesh` cerrado y no hay preparación, los vértices son
  los mismos salvo escala y triangulación de caras.
- **Unidades [H]:** `mmPerWorldUnit` debe ser finito y >0; sin eso, el export
  falla (`units-required`). Los presets de jarrón fijan `mmPerWorldUnit=1`; el
  default de `FABRICATE_UNITS` es 10.

## 5.4 Manufacturabilidad existente y faltante

**Existe [H]:**
- validación cerrado/manifold/orientado/volumen;
- detección de auto-intersecciones (limitada a 32 pares por defecto, truncable);
- reparación de agujeros, orientación, topología;
- booleanos y multi-body;
- unidades y escala;
- `printChecks`: overhang > 50°, contacto con cama, feature mínima cuando se
  conoce; warnings a >12% overhang, sin cama, o feature <2 mm;
- lattice strut/floor/rim; perforación radial;
- preview sólido y export STL/3MF.

**No existe [H]:**
- slicer real, alturas de capa, soportes, puentes, adherencia;
- espesor mínimo medido (sólo el nominal `strut` para lattice/perforado; el
  jarrón sólido reporta `minFeatureMm: null`);
- tamaño mínimo de apertura medido;
- optimización automática de orientación;
- chequeo de cama/volumen de impresión;
- análisis de componentes desconectados más allá de `bodies`;
- import STL/3MF;
- estimación de tiempo/material;
- PBR/inspección de normales.

**Mediciones de print checks [H]:** sólido 0% overhang, cama 6674.84 mm²,
feature null; lattice 9.30% overhang, cama 6818.87 mm², feature 3.5 mm;
perforado 2.54% overhang, cama 6674.84 mm², feature 3.5 mm. El umbral de warning
es 12%, por lo que el lattice con 9.3% queda “ok” aunque un slicer podría pedir
soportes.

---

# 6. Limitaciones identificadas

## 6.1 Geometría y lattice

1. **Uniformidad dependiente de seed [H]:** CV 0.357 en el preset, 0.257 en el
   escenario de test. No hay contrato de tamaño de celda; sólo una heurística.
2. **Sólo revolución [H]:** `R(v)` + `height`; no hay lattice sobre `Surface`
   arbitraria ni UV general.
3. **Sección constante [H]:** tubos de radio fijo; sin perfil variable, sin
   engrosamiento local, sin fusiones suaves.
4. **Uniones low-poly [H]:** esferas de 5–6 slices; no hay blending G1/G2.
5. **Tapas planas [H]:** los tubos terminan en abanico; las esferas cubren el
   cruce, pero no hay continuidad de superficie.
6. **Resolución fija [H]:** 8 lados por tubo, 6 muestras por arista (editable
   hasta 16), piso con radio en segmentos, rim 96×10. No hay teselación
   adaptativa ni control de desviación.
7. **Sin densidad local [H]:** no hay campos de densidad, blue-noise, hex o
   power diagram; sólo Voronoi con seed.
8. **Transformaciones [H]:** piso/borde asumen Z-up/revolución; operadores world
   pueden romper la relación.
9. **Robustez [H]:** el union Manifold puede fallar o dejar micro-grietas; el
   builder las tapa sólo bajo 0.1 mm; casos densos son sensibles. La ruta BSP
   puede exceder presupuesto y la ruta remesh puede ser muy lenta (observé
   ~800 s para un caso de 15 mm con la estrategia remesh; no es una opción
   interactiva).
10. **Precisión dimensional [H]:** altura 199.89 mm, no 200.0; el test tolera
    1 mm.

## 6.2 Visualización

1. **Sin PBR/materiales/luces/sombras/AO [H].**
2. **Sin z-buffer [H]:** painter’s algorithm; caras que se intersectan o
   concavidades pueden ordenarse mal.
3. **Sombreado por profundidad, no por normal [H]:** el volumen se lee por alfa
   y bandas, no por iluminación.
4. **Sin post-proceso [H].**
5. **Preview simplificado [H]:** la malla de pantalla no es la de export; es una
   decisión correcta, pero debe comunicarse.
6. **Quad view [H]:** el preview sólido no se inyecta en el panel 3D del quad
   (el preview se pasa al `drawFrame` single; `drawQuadView` construye escenas
   sin preview). [I] Es una limitación de UX si el usuario trabaja en quad.

## 6.3 Fabricación

1. **Sin slicer/soportes [H].**
2. **Feature mínima nominal [H]:** `minFeature` usa `strut` para lattice y
   cutouts; no mide el espesor real de la pared sólida (el jarrón sólido da
   `null`).
3. **Overhang heurístico [H]:** 50° y 12%; no considera orientación, soportes ni
   puentes.
4. **3MF no triangula [H].**
5. **Trust flag [H/I]:** `manifoldGuaranteed` puede sobrevivir a post-procesos.
6. **Auto-intersecciones limitadas [H]:** 32 pares por defecto, truncable.
7. **Sin orientación automática [H].**
8. **Sin import [H].**

## 6.4 Documentación / higiene

- `docs/architecture.md` no cubre Fabricate y dice 24 generadores (hay 25).
- Comentario “Two Lloyd steps” (hay 4).
- Comentario duplicado en `perforation.js`.
- `FABRICATE_UNITS` default 10 vs jarrones 1.
- `Lattice Vase` stats `rim: 2` es el radio menor del toro, no el parámetro
  `rim=4`; el nombre es ambiguo.

---

## 6.5 Identidad arquitectónica y modos

**[H] Responsabilidades actuales:**

| Modo | Responsabilidad | No debería hacer |
|---|---|---|
| **FORM** | Documento, generador, parámetros, operadores, capas | Reparar, fabricar o renderizar producto |
| **LOOK** | Estilo, passes, cámara, canvas, coordenadas, unidades | Cambiar geometría |
| **EXPLORE** | Análisis, mutación, advisor, exploración/evolución | Introducir geometría fuera del documento |
| **PERFORM** | Animación y timeline | Evaluar geometría distinta del documento |
| **INGEST** | Entrada de imagen / trazado | Tocar el pipeline de fabricación |
| **KEEP** | Notebook, presets, export | Reinterpretar geometría |
| **FABRICATE** | Derivar, reparar, booleanos, lattice/perforación, checks, STL/3MF | Editar la geometría autoral |

**Separación que debe preservarse [R]:**

- **Generación paramétrica** (FORM) vs **geometría derivada** (FABRICATE): el
  sólido preparado no se escribe en el documento.
- **Geometría** vs **apariencia** (LOOK): color/passes/materiales no cambian
  vértices.
- **Refinamiento** vs **generación**: el refinamiento es una etapa derivada con
  presupuesto y trazabilidad, no un generador nuevo.
- **Fabricación** vs **render**: el export usa world Mesh/Solid; nunca la
  cámara, el frame ni el canvas.

**Infraestructura compartible [R]:** contratos de geometría, Manifold/SDF,
worker, `RenderScene`, unidades, validación y el sistema de presets.

**No se propone un modo nuevo.** Las capacidades de lattice orgánico,
refinamiento, PBR y perfil de fabricación pueden vivir dentro de FORM/LOOK/
FABRICATE con contratos explícitos. Un modo “Sculpt” separado sólo se
justificaría si apareciera una autoría directa de malla que hoy no existe y que
rompería la identidad de workbench paramétrico.

# 7. Alternativas tecnológicas evaluadas

> No se recomienda una tecnología por popularidad. Se evalúa adecuación al
> código real, costo y riesgo.

## A. Curvas y struts orgánicos

| Alternativa | Compatibilidad | Complejidad | Ventajas | Límites | Dependencias | Riesgo / perf | Contratos |
|---|---|---|---|---|---|---|---|
| **Catmull-Rom** sobre los puntos de arista | Alta: `Curve3D` ya es polilínea; se puede remuestrear antes de `tubeMesh` | Media | Curvas suaves, barato, sin deps | Puede overshoot; no controla tangentes; no resuelve uniones | Ninguna | Bajo; +puntos | Cambia el muestreo de curvas; no el documento |
| **B-spline / Bézier** con puntos de control | Media: requiere control points y evaluación | Media-alta | Control local, tangencia | Más UI/contrato; no hay editor de control points | Ninguna | Medio | Nuevo contrato de curva/struts |
| **Tangencia controlada** | Media | Alta | Continuidad G1/G2 | Requiere resolver el grafo de uniones | Ninguna | Alto | Cambia el modelo de nodos |
| **Sección transversal variable** | Alta: `tubeMesh` puede aceptar radio por punto | Media | Struts orgánicos, refuerzos locales | Más triángulos; control de mínimo | Ninguna | Medio | `strutProfile` en LatticeSpec |
| **Curvatura de nervios** | Media | Alta | Look escultórico | Requiere campo de curvatura y blending | Ninguna | Alto | Nuevo contrato |
| **Suavizado de conexiones** | Baja-media | Alta | Uniones orgánicas | Puede perder aperturas; difícil de validar | SDF/remesh | Alto | Refinement/JointSpec |

**Recomendación [R]:** empezar por **Catmull-Rom + radio variable** (bajo costo,
mejora visual inmediata), y dejar B-spline/tangencia para una fase posterior.
No introducir una librería de curvas: el proyecto ya tiene resampling y
`Curve3D`; implementar Catmull-Rom es pequeño y determinista.

## B. Intersecciones

| Alternativa | Compatibilidad | Complejidad | Ventajas | Límites | Riesgo / perf | Contratos |
|---|---|---|---|---|---|---|
| **Manifold union actual** | Total | Baja (ya existe) | Exacto, validado, rápido en casos normales | Facetas, tapas, sin blending; fallas en casos densos | Medio | Ninguno |
| **SDF smooth union + levelSet** | Alta: ya existe `sdfRepair`/`manifoldLevelSet` | Alta | Uniones orgánicas, watertight, blends | Resolución/costo; pierde bordes finos; agujeros pequeños | Alto (grid) | Nuevo `JointSpec`/resolución |
| **Remesh global** | Alta: `remesh` existe | Media | Watertight, aproxima blends | Muy lento; pierde detalle; no interactivo | Muy alto | Igual que SDF |
| **Boolean + fillet de malla** | Baja: no hay fillet nativo | Muy alta | Bordes suaves | Complejo, frágil | Alto | Nuevo kernel |
| **Metaballs / implicit skin** | Baja: no existe | Muy alta | Orgánico | No es el modelo actual; difícil de controlar | Alto | Nuevo motor |
| **Híbrido (tubos + SDF local en nodos)** | Media | Alta | Blend donde importa, menos costo que global | Complejo de implementar/validar | Medio-alto | `JointSpec` |

**Recomendación [R]:** mantener Manifold como camino exacto por defecto y
ofrecer un **modo “organic joints”** que aplique SDF smooth-union sólo en la
vecindad de los nodos, con resolución y presupuesto explícitos. Un SDF global
del lattice completo es riesgoso por tiempo y pérdida de aperturas.

## C. Refinamiento de superficies

| Alternativa | Compatibilidad | Complejidad | Ventajas | Límites | Riesgo / perf |
|---|---|---|---|---|---|
| **Manifold `smoothOut` + `refineToLength`** | Alta (API ya disponible) | Media | Suaviza aristas, preserva watertight | Explosión de triángulos (medí 64k→179k–378k) | Alto |
| **Remesh adaptativo** | Alta (`remesh` existe) | Media-alta | Reconstruye, preserva features | Lento; aproximado; resolución fija | Alto |
| **Catmull-Clark** | Baja (no existe) | Alta | Suavizado de malla | Pierde agujeros/bordes; no trivial | Medio |
| **Control de desviación (Hausdorff)** | Baja | Alta | Calidad medible | Costoso; requiere sampling | Medio |
| **Refinamiento local por curvatura** | Media | Alta | Eficiente | Requiere análisis de curvatura y selección | Medio |

**Recomendación [R]:** no refinar globalmente el lattice. Si se busca acabado
escultórico, el camino correcto es **blending en nodos + curvas suaves**, no
subdividir toda la malla. El refinamiento global debe tener presupuesto de
triángulos y control de desviación, y usarse sólo en export “high”.

## D. Apariencia y visualización

| Alternativa | Compatibilidad | Complejidad | Ventajas | Límites | Dependencias | Riesgo |
|---|---|---|---|---|---|---|
| **p5 2D actual** | Total | Baja | Identidad técnica, liviano, determinista | Sin PBR/luces/sombras/AO | p5 | Ninguno |
| **Three.js / WebGL PBR** | Media: nuevo backend que consuma `RenderScene` | Alta | Materiales, HDRI, sombras, AO, producto | Duplica renderer; bundle; shaders; estado | three (nueva) | Alto |
| **WebGPU** | Baja: soporte/experiencia | Muy alta | Futuro, compute | Madurez, fallback | WebGPU | Muy alto |
| **Render offline (Blender/KeyShot)** | Alta como export | Media (fuera de app) | Calidad máxima | No es in-app; pipeline externo | Externa | Bajo para la app |

**Recomendación [R]:** preservar p5 2D como **modo técnico** y agregar, si se
aprueba, un **backend de presentación PBR opcional** (Three.js) que consuma la
misma `RenderScene`. No reemplazar p5: la identidad visual técnica es parte del
producto y el costo de mantener dos backends debe ser explícito. Un “Product
render” puede ser un look/modo de presentación, no el default.

## E. Fabricación

| Alternativa | Compatibilidad | Complejidad | Ventajas | Límites | Riesgo |
|---|---|---|---|---|---|
| **Checks heurísticos actuales** | Total | Baja | Rápido, sin deps | No es slicer; falsos positivos/negativos | Bajo |
| **Perfil de fabricación (min wall/strut/opening, overhang, cama)** | Alta | Media | Contrato claro, gating | Requiere medición de espesor/apertura | Medio |
| **Orientación automática** | Alta con `printChecks` | Media | Menos soportes | Optimización multiobjetivo | Medio |
| **Slicer WASM (CuraEngine/Prusa)** | Media | Muy alta | Validación real | Peso, WASM, mantenimiento | Alto |
| **Slicer externo (CLI)** | Alta fuera del browser | Media | Real | No in-app; requiere backend | Medio |
| **Soportes** | Baja | Muy alta | Imprimibilidad | Generación/validación compleja | Alto |
| **Import STL/3MF** | Media | Alta | Combinar partes | Nuevo pipeline, reparación | Medio |

**Recomendación [R]:** definir primero un **ManufacturingProfile** con
mediciones geométricas y warnings; no integrar un slicer en el corto plazo. La
validación final de capas/soportes puede seguir siendo externa, pero el perfil
debe decir qué se midió y qué no.

---

# 8. Propuesta de evolución

## 8.1 Principios

1. **Preservar la identidad:** documento JSON, motor puro, registries,
   world/view separation, estética técnica, Fabricate como derivación.
2. **No convertir en CAD:** el lattice es una familia paramétrica/derivada, no
   un editor de sólidos arbitrario.
3. **Contratos antes de features:** LatticeSpec, RefinementSpec,
   AppearanceSpec, ManufacturingProfile.
4. **No romper el documento:** los nuevos campos deben ser opcionales y
   sanitizables; los presets viejos deben seguir abriendo.
5. **Medir:** cada fase debe tener acceptance geométrico, visual y de
   performance.

## 8.2 Contratos propuestos

| Contrato | Contenido mínimo | Dónde vive | Qué reemplaza/ordena |
|---|---|---|---|
| `LatticeSpec` | `surface` (revolución o UV), `cellField`, `strutProfile`, `jointStyle`, `sampling`, `seed`, `clearance`, `manufacturing` | Derivado, no documento | El caso especial `surface-lattice` + `buildLatticeCandidate` |
| `RefinementSpec` | método, tolerancia, preservar aperturas, presupuesto, desviación | Derivado | Refinamiento ad-hoc |
| `AppearanceSpec` / `MaterialSpec` | material, color, roughness, metallic, textura, lighting/HDRI | View/Look, separado de geometría | Estilo actual + futuro PBR |
| `ManufacturingProfile` | proceso, nozzle, minWall, minStrut, minOpening, overhang, cama, soportes, orientación | View/Fabricate | `printChecks` suelto |
| `DerivedGeometry` | provenance (source layer, ops, spec, validation, profile) | Fabricate/worker | Candidatos y reportes ad-hoc |

**[D]** ¿`LatticeSpec` debe persistirse en el documento o derivarse de la capa?
Recomendación: **derivarse** de la capa + params; no agregar una capa oculta ni
un campo nuevo al documento en la primera fase. Si se necesita reproducibilidad,
guardar el spec como metadata de preset, no como geometría.

## 8.3 Fases

### Fase 0 — Baseline y contratos (bajo riesgo)

- Corregir deriva documental (24→25, Fabricate, comentarios).
- Definir por escrito `LatticeSpec` y `ManufacturingProfile` (sin implementar).
- Resolver 3MF (triangular o rechazar caras >3) y limpiar
  `manifoldGuaranteed` en post-procesos.
- Medir y documentar límites de longitud/triángulos/tiempo.
- **Aceptación:** docs coherentes; tests actuales verdes; sin cambio de
  geometría.

### Fase 1 — LatticeSpec y uniformidad real

- Extraer el lattice a un módulo de geometría derivada con spec explícito.
- Implementar una métrica local (p. ej. coordenada de arco `s = ∫R dθ` o
  power diagram) para que el tamaño de celda no dependa de la seed.
- Validar CV de área en el preset real, no sólo en un escenario de test.
- Mantener revolución como primer alcance; Surface/UV general queda para
  después.
- **Aceptación:** CV < 0.25 en el preset; dimensiones 200 ± 0.2 mm; 15–25 mm
  dentro de tolerancia; mismos presets y export.

### Fase 2 — Struts y uniones orgánicas

- Catmull-Rom (o B-spline) para centerlines; radio variable por punto.
- Joints: esferas de mayor resolución o SDF local en nodos; blending
  controlado.
- Mantener Manifold exacto como fallback/“technical”.
- **Aceptación:** closed/manifold; sin auto-intersecciones; mejora visual
  medida; presupuesto de triángulos/tiempo; 15 mm no explota.

### Fase 3 — Refinamiento y desviación

- Refinamiento local/adaptativo, no global.
- Preservar aperturas y bordes; control de desviación.
- Perfil “draft/standard/high” con presupuesto.
- **Aceptación:** watertight; desviación < tolerancia; triángulos/tiempo
  acotados; preview sigue simplificado.

### Fase 4 — Apariencia (opcional, independiente)

- Backend de presentación PBR (Three.js/WebGL) detrás de `RenderScene`.
- Materiales/HDRI/AO/sombras; presets de material; “Product” look.
- p5 2D queda como modo técnico/default.
- **Aceptación:** feature flag; geometría/export sin cambios; performance;
  bundle bajo control; no rompe SVG/plotter.

### Fase 5 — ManufacturingProfile

- Perfil con min wall/strut/opening, overhang, cama, orientación.
- Medición de espesor (ray/SDF) y aperturas; warnings; gating configurable.
- Orientación automática simple; soportes sólo como heurística (no slicer).
- **Aceptación:** reporte de perfil; tests de casos conocidos; export sigue
  usando la malla validada; no se promete slicer.

## 8.4 Dependencias y orden

```text
Fase 0 (contratos/docs/bugs)
   ├─ Fase 1 (LatticeSpec + uniformidad)
   │     ├─ Fase 2 (struts/joints orgánicos)
   │     │     └─ Fase 3 (refinamiento/desviación)
   │     └─ Fase 5 (manufacturing profile)
   └─ Fase 4 (PBR, independiente de geometría)
```

Fase 4 puede ir en paralelo si se acepta el costo del segundo backend. Fase 5
necesita Fase 1 para conocer strut/wall; Fase 3 mejora la precisión de los
checks.

## 8.5 Qué preservar / qué evolucionar

**Preservar [R]:**
- `document.js` como fuente de verdad; `Curve/Surface/Mesh/Solid` planos.
- `engine.js` puro, caches por etapa, budgets.
- `RenderScene` y `ViewTransform`; mundo vs artboard.
- `Fabricate` como derivación read-only de la geometría autoral.
- Manifold/SDF/repair/worker.
- Modos actuales; no agregar modos nuevos.

**Evolucionar [R]:**
- El caso especial `surface-lattice` → `LatticeSpec`/derived geometry.
- `printChecks` → `ManufacturingProfile`.
- `surface-fill`/`lattice-preview` → contrato de apariencia/material.
- Documentación de Fabricate y del lattice.
- Precisión dimensional y triangulación 3MF.

## 8.6 Criterios de aceptación transversales

- Determinismo: misma seed/params → misma malla (hash).
- Validación: closed, manifold, oriented, volumen, sin auto-intersecciones
  (o SDF garantizado).
- Export: STL/3MF parseables; triángulos consistentes; unidades.
- Performance: eval <16/50 ms; build lattice <5 s para 20 mm; preview <100 ms;
  drag <10 ms.
- Visual: screenshots de referencia para `Solid/Lattice/Perforated`; no
  regresión de la estética técnica.
- Compatibilidad: documentos viejos abren; presets actuales no cambian de
  semántica.

## 8.7 Estrategia de validación

- Unit tests de red (determinismo, CV, bordes), sólido (closed/manifold/volume),
  perforación (holes, floor/rim), print checks (casos sintéticos).
- E2E de Fabricate (worker, preview, export).
- Golden screenshots con Playwright para los tres jarrones y una escultura
  lattice.
- Benchmarks Node para 15/20/25 mm; límites de memoria del worker.
- Validación externa en slicer para 2–3 STL representativos; documentar
  resultados como “verificación manual”, no como gate.

---

# 9. Roadmap técnico recomendado

| Fase | Objetivo | Entregables | Aceptación | Riesgo |
|---|---|---|---|---|
| 0 | Baseline | docs, contratos escritos, 3MF/trust fix | tests verdes, sin cambio geométrico | Bajo |
| 1 | LatticeSpec + uniformidad | spec, red local, tests CV | CV <0.25, 200 ±0.2, 15–25 mm | Medio |
| 2 | Struts orgánicos | Catmull-Rom, radio variable, joints | closed/manifold, mejora visual, 15 mm estable | Alto |
| 3 | Refinamiento | adaptativo, desviación, budgets | watertight, desviación, perf | Alto |
| 4 | PBR opcional | backend WebGL, materiales/HDRI | feature flag, perf, export intacto | Muy alto |
| 5 | ManufacturingProfile | perfil, mediciones, orientación | reporte, tests, export confiable | Medio |

**OpenSpec sugeridos (no creados en esta auditoría):**
`lattice-spec`, `organic-struts`, `surface-refinement`, `product-preview`,
`manufacturing-profile`. Cada uno debe declarar dependencias de
`geometry-contracts`, `fabrication-contracts`, `render-scene-separation` y
`world-view-separation`.

---

# 10. Riesgos y decisiones pendientes

## 10.1 Decisiones

| ID | Decisión | Opciones | Recomendación |
|---|---|---|---|
| D1 | Alcance del lattice | Revolución / Surface UV general | **Revolución primero**; UV general después |
| D2 | Motor de uniones | Manifold exacto / SDF / híbrido | **Híbrido**: Manifold default, SDF local opcional |
| D3 | Renderer | p5 2D / WebGL PBR / ambos | **Ambos**: p5 técnico, WebGL opcional |
| D4 | Persistencia del LatticeSpec | Documento / derivado / preset metadata | **Derivado** + metadata de preset |
| D5 | Gating de manufactura | Warnings / bloqueo | **Warnings**; bloquear sólo invalidez geométrica |
| D6 | Slicer | In-app WASM / externo / no | **Externo** en el corto plazo |
| D7 | Import STL/3MF | Ahora / después | **Después** de estabilizar el lattice |
| D8 | Presupuesto visual/geométrico | triángulos/tiempo | Definir por perfil draft/standard/high |

## 10.2 Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| SDF global destruye aperturas finas | Alto | Resolución/localización; validar agujeros |
| Split de renderer p5/WebGL | Alto | `RenderScene` como contrato; un solo backend default |
| Booleanos inestables en 15 mm | Alto | Presupuesto, fallback, tests de casos densos |
| `manifoldGuaranteed` heredado | Medio | Limpiar flag en post-proceso; revalidar |
| 3MF pierde caras >3 | Medio | Triangular en el writer o rechazar |
| Heurísticas de impresión falsas | Medio | Etiquetar como heurística; validación externa |
| Deriva documental | Medio | Actualizar `docs/architecture.md` y specs |
| Scope creep a CAD | Alto | Mantener LatticeSpec como familia paramétrica |
| Performance del worker | Medio | Medir 15/20/25; límites y cancelación |
| Presets viejos | Bajo | Campos opcionales y sanitización |

## 10.3 Preguntas abiertas

1. ¿El objetivo visual es **render de producto in-app** o exportar a un
   renderer externo?
2. ¿La celda “15–25 mm” es un contrato duro o una guía estética?
3. ¿Se acepta que el lattice sea **sólo de revolución** en la próxima fase?
4. ¿La fabricación debe bloquear export con overhang alto o sólo advertir?
5. ¿Se necesita import para combinar con Blender/Rhino, o el flujo es
   únicamente paramétrico?
6. ¿Cuál es el presupuesto de triángulos/tiempo para un export “high”?

---

# 11. Referencias exactas a archivos y componentes

## 11.1 Núcleo y contratos

| Archivo | Componentes relevantes |
|---|---|
| `src/core/engine.js` | `evaluateDocument`, `evaluateSurfaceDocument`, `evaluateSpatialDocument`, `evaluateLayers`, `STAGE_CACHE`, `SURFACE_CACHE`, `WORLD_CACHE`, `VIEW_CACHE`, `MESH_CACHE`, `MESH_VIEW_CACHE`, `INSTANCE_CACHE`, `POINT_LIMITS` |
| `src/core/document.js` | `DOCUMENT_VERSION`, `DEFAULT_CAMERA`, `DEFAULT_FABRICATION`, `sanitizeDocument`, `sanitizeFabricationSettings` |
| `src/core/registry.js` | `Registry`, `Generators`, `Operators`, `RenderPasses` (registro y validación) |
| `src/core/units.js` | `millimetresPerUnit`, `bboxToMillimetres`, `sanitizeUnits` |
| `src/core/layers.js` | `createLayer`, `createInstanceLayer`, fuentes de instancia |
| `src/geometry/contracts.js` | `Curve2D/3D`, `Surface`, `Mesh`, `Solid`, `GEOMETRY_KIND` |
| `src/geometry/validate.js` | `validateMesh`, `validateSolid`, `validateSurface`, `manifoldGuaranteed` |
| `src/geometry/surfaceTessellation.js` | `tessellateSurfaceWithMapping`, `SurfaceMapping`, seams/twists |
| `src/geometry/relations.js` | `surfaceToMesh`, `meshToSolid` |

## 11.2 Lattice, perforación y print checks

| Archivo | Componentes relevantes |
|---|---|
| `src/generators/surfaceLattice.js` | `Generators.register('surface-lattice')`, `generate`, params `profile/height/floor/cellSize/strut/rim/seed/samples` |
| `src/geometry/latticeNetwork.js` | `buildRevolveLattice`, `voronoiCells`, `clipHalfPlane`, `polygonCentroid`, `seedWeight`, 4 Lloyd passes |
| `src/geometry/latticeSolid.js` | `buildLatticeSolid`, `tubeMesh`, `jointSpheresMesh`, `appendSphere`, `floorSolid`, `rimSolid`, `cylinderMesh`, `torusSolid`, `capMicroHoles` |
| `src/geometry/perforation.js` | `buildPerforationCutters`, `radiusProfileFromSurface`, `radiusProfileFromMesh` |
| `src/geometry/printChecks.js` | `analyzePrintability`, `DEFAULT_OVERHANG_ANGLE = 50`, warning >12%, feature <2 mm |
| `src/presets/builtins.js` | `Solid Vase 200`, `Lattice Vase 200`, `Perforated Vase 200`, `fabricateView`, `FABRICATE_DEFAULTS` |
| `src/presets/catalog.js` | categoría `fabricate`, metadatos de los tres jarrones |

## 11.3 Visualización

| Archivo | Componentes relevantes |
|---|---|
| `src/render/Renderer.js` | contrato `Renderer` |
| `src/render/p5/P5Adapter.js` | `load`, `mount`, `drawFrame`, `drawSceneContent`, `drawQuadView`, `pixelDensity`, `smooth`, `frameRate(60)` |
| `src/application/renderSceneBuilder.js` | `buildRenderScene`, `ViewTransform`, `sourceGroups`, preview injection, `SCENE_CACHE` |
| `src/render/scene.js` | `createRenderScene`, `createRenderLayer` |
| `src/render/passes/surface.js` | `surface-wireframe`, `surface-fill`, `lattice-preview` |
| `src/render/passes/core.js` | `stroke`, `points`, `wireframe`, `control-polygon` |
| `src/render/fill.js` | `applyFill`, gradientes |
| `src/render/passStyle.js` | `PASS_APPEARANCE`, overrides por pass |
| `src/render/lookPresets.js` | recetas de apariencia (no materiales) |
| `src/render/palettes.js` | paletas de color |
| `src/view/camera.js` | `DEFAULT_CAMERA`, `project3D`, cámara orbital |
| `src/view/transform.js` | `ViewTransform`, `resolveFrame`, `resolveEffectiveCamera`, `SPACE` |
| `src/view/projection.js` | `projectWorldCurvesToView`, `projectWorldMeshesToView`, `projectMeshToView` |
| `src/view/viewportCoordinates.js` | `PROJECTION_AXES`, `projectionAxes`, `quadPanelLayout` |
| `src/render/p5/overlays.js` | `drawQuadView`, `drawCoordinates` |
| `src/render/reference.js` | ejes/ground de referencia |

## 11.4 Fabricación y export

| Archivo | Componentes relevantes |
|---|---|
| `src/application/fabricationSource.js` | `resolveFabricationSource`, `buildFabricationReport`, `buildLatticeCandidate`, cutouts, `normalizePreparation` |
| `src/application/fabricationJobs.js` | `isHeavyFabrication`, `FabricationJobs` |
| `src/application/fabricationJobRunner.js` | `runFabricationJob` |
| `src/workers/fabricationWorker.js` | worker entry, progress/result/error |
| `src/geometry/csg.js` | `booleanSolids`, estrategias Manifold/BSP/remesh, límites |
| `src/geometry/manifoldEngine.js` | `initManifold`, `manifoldBoolean`, `manifoldSimplify`, `manifoldLevelSet`, `manifoldGuaranteed` |
| `src/geometry/solidPrep.js` | `weldMesh`, `prepareMesh`, `mergeMeshes`, `boundaryLoops` |
| `src/geometry/repair.js` | `repairMesh`, `repairOrientation`, `capWithStrategy` |
| `src/geometry/selfIntersection.js` | `detectSelfIntersections`, BVH, 32 pairs default |
| `src/geometry/selfIntersectionRepair.js` | `repairSelfIntersections` (SDF/remesh) |
| `src/geometry/sdfRepair.js` | `sdfRepair`, winding SDF, `Manifold.levelSet` |
| `src/geometry/remesh.js` | `remesh`, marching tetrahedra, resolución |
| `src/geometry/robustPredicates.js` | `orient2dSign`, `orient3dSign`, exact BigInt fallbacks |
| `src/export/geometryExport.js` | `validateForFabrication`, `GeometryExporter` |
| `src/export/stl.js` | `exportBinarySTL`, triangulación, escala, sin unidad |
| `src/export/3mf.js` | `export3MF`, `build3MFModelXML`, unit millimeter, caras `face[0..2]` |
| `src/export/Exporter.js` | `buildSTLFromCurrent`, `build3MFFromCurrent`, `exportSTL`, `export3MF` |

## 11.5 UI, worker y modos

| Archivo | Componentes relevantes |
|---|---|
| `src/ui/Controls.js` | `MODES` (Form/Look/Explore/Perform/Ingest/Keep/Fabricate), `refreshFabricate`, `renderFabricate`, `syncLatticePreview`, `updateFabricateNarrative` |
| `src/ui/sections/fabricateSections.js` | grupos Source/Repair/Combine/Output/Checks, Preview, Lattice, Printability |
| `src/ui/sections/formSections.js` | Layers, Generator, Parameters, Equations, Harmonics, Operators |
| `src/ui/sections/lookSections.js` | Looks, Camera, Canvas, Coordinates, Scale |
| `src/ui/sections/keepSections.js` | Style, Render, Overlays, Image, Animation, Timeline, Mutation, Analysis, Notebook, Advisor, Explore, Evolution, Presets, Export |
| `src/application/App.js` | `rebuild`, `evaluate`, `session`, `history`, `fabricationPreview` |
| `src/presets/PresetManager.js` | presets, favoritos, recents, previews |
| `src/presets/preview.js` | `renderPresetPreview`, hash/caché |

## 11.6 Documentación y specs

- `docs/architecture.md` — modelo mental, módulos, data flow, decisiones,
  performance. **No cubre Fabricate** y declara 24 generadores (real: 25).
- `docs/fabricate-presets.md` — ejemplos, lattice, perforado, preview,
  print checks.
- `openspec/specs/geometry-contracts/spec.md`,
  `fabrication-contracts/spec.md`, `fabrication-export/spec.md`,
  `surface-lattice/spec.md`, `perforated-wall/spec.md`,
  `printability-checks/spec.md`, `lattice-preview/spec.md`.
- `openspec/roadmap.md` — fases shipped 1–18.

---

# 12. Limitaciones de esta auditoría

- **Solo lectura.** No se modificó código de implementación, no se crearon
  specs OpenSpec y no se hizo commit. El único archivo nuevo es este documento.
- **Mediciones acotadas.** Los tiempos se midieron en Node sobre una máquina y
  sin carga sostenida; no son gates de CI ni benchmarks reproducibles en otras
  máquinas.
- **Sin slicer real.** Los chequeos de impresión son heurísticas de malla; no se
  ejecutó PrusaSlicer, Cura, Bambu Studio ni un motor de capas.
- **Sin perfilado de GPU.** No hay camino WebGL/GPU en la app actual, por lo que
  no se midió rendimiento de materiales, luces o sombras.
- **Sin fuzzing ni auditoría de seguridad.** No se hizo un barrido exhaustivo de
  casos límite, memoria a largo plazo, ni fuzzing de expresiones/booleanos.
- **Evidencia de código, no de producto.** Los hallazgos de 3MF y
  `manifoldGuaranteed` son riesgos de contrato; no observé un fallo en los
  presets actuales.
- **Vigencia.** El snapshot es el commit `35fda6d`; cambios posteriores pueden
  invalidar cifras y referencias.

# Apéndice A — Mediciones reproducidas

**[H]** Comandos de auditoría ejecutados en Node 22 sobre la máquina de
auditoría, sin carga sostenida. No son gates de CI.

| Escenario | Triángulos | Volumen (mm³) | BBox (mm) | Tiempo |
|---|---:|---:|---|---:|
| `Solid Vase 200` | 18 470 | 305 022.57 | 174.895 × 174.895 × 200 | ~1.6 s |
| `Lattice Vase 200` | 121 142 | 119 554.76 | 174.72 × 174.85 × 199.89 | ~3.2 s |
| `Perforated Vase 200` | 38 078 | 213 686.48 | 174.77 × 174.38 × 200 | ~2.2 s |

| Print check | Overhang | Cama (mm²) | Feature mínima |
|---|---:|---:|---:|
| Solid | 0% | 6 674.84 | null |
| Lattice | 9.30% | 6 818.87 | 3.5 mm |
| Perforated | 2.54% | 6 674.84 | 3.5 mm |

| Red lattice (preset) | Valor |
|---|---:|
| Celdas | 220 |
| Aristas | 638 |
| Longitud mín./media/máx. | 2.0 / 13.9 / 44.1 mm |
| Área de celda mín./media/máx. | 153.7 / 392.6 / 1064.2 mm² |
| CV de área | 0.357 |

**Nota:** el test de `surface-lattice` valida CV <0.35 en un escenario distinto
(perfil sin inset, `top=200`, seed 7), donde medí 0.257. El preset real no está
cubierto por ese umbral. Es una de las brechas prioritarias.

# Apéndice B — Evidencia de la deriva documental

- `docs/architecture.md`: “24 registered models”; `Generators.list()` devuelve
  25.
- `src/geometry/latticeNetwork.js`: comentario “Two Lloyd steps”; código
  `for (let pass = 0; pass < 4; pass++)`.
- `src/geometry/perforation.js`: bloque “Outer radius R(z)…” seguido de
  “Exact R(z)…”.
- `src/presets/builtins.js`: `FABRICATE_UNITS.mmPerWorldUnit = 10`; los
  presets de jarrón usan `1`.
- `src/export/3mf.js`: `v1=face[0], v2=face[1], v3=face[2]` sin triangular.
