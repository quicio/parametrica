# Auditoría de navegación y responsabilidades — Parametrica

**Original:** 2026-11-01  
**Actualización de implementación:** 2026-11-02, tras `product-hardening`,
las correcciones de auditoría, LOOK Phase 1/2, la corrección de cámara, GIF
export, SVG export fidelity y fill gradients.  
**Alcance de esta revisión:** actualizar el estado real de los hallazgos. No es
una nueva auditoría y no introduce funcionalidades ni cambios de código.

---

## 0. Resumen de la actualización

### Defectos y deudas resueltos

| Hallazgo | Estado | Solución aplicada |
|---|---|---|
| Los passes `tangents` / `normals` / `curvature` por capa usaban el análisis combinado | **Resuelto** | `evaluateLayers` expone análisis lazy por capa; `P5Adapter` mapea el análisis de la capa que dibuja. |
| `style.blend` se exponía pero no se aplicaba | **Resuelto** | `P5Adapter` aplica el modo por capa y lo resetea antes de la siguiente capa/overlays. |
| Los render passes aparecían activos aunque no aplicaran | **Resuelto con alcance** | Metadatos `appliesTo`; la UI desactiva y refresca la aplicabilidad tras cada evaluación. |
| El SVG omitía features activas sin avisar | **Resuelto** | `SvgContext` reproduce los passes vectoriales, overlays y blend. Solo Signed Distance sigue siendo una omisión raster-only explícita. |
| No había secuencia SVG frame-by-frame | **Resuelto** | Timeline exporta `frame-NNN.svg` + `manifest.json` en Perform. |
| No había salida para plotter | **Resuelto** | Export Plotter SVG: solo trazos visibles, sin fills/gradientes/blend/overlays/passes. |
| Image tracing solo trazaba el contorno mayor | **Resuelto** | Modo All contours: componentes separados, cada uno como capa Fourier; huecos siguen pendientes. |
| Helix solo mostraba una proyección a la vez | **Resuelto** | Layout Quad: 3D + XY/XZ/YZ en canvas; SVG/plotter usan la proyección activa y avisan. |
| Gradient Wireframe no permitía elegir la métrica de color | **Resuelto** | `view.colorMetric`: auto, altura, radio, curvatura o longitud de arco. |
| Render modes eran globales y los passes no tenían opacidad | **Resuelto con alcance** | `layer.modes` por capa y `view.passOpacity` por pass; color/grosor por pass siguen pendientes. |
| La métrica de color era solo global | **Resuelto** | `layer.colorMetric` con herencia de `view.colorMetric` y selector en Style. |
| Las paletas eran solo presets fijos | **Resuelto** | Paletas custom locales: guardar, reemplazar, aplicar y borrar. |
| La telemetría no mostraba las propiedades de la forma | **Resuelto** | Overlay `ƒ` en el borde: capa, generador, parámetros, seed y operadores; toggle persistente. |
| El fit y la proyección estaban repartidos entre generadores, engine y exporters | **Resuelto con alcance** | Contratos P/W/A, `ViewTransform` único y `RenderScene` compartido por canvas, Quad, SVG y plotter. El fit sigue serializado en `generator.params` como alias de compatibilidad, pero el engine lo aplica como frame. |
| El viewport no mostraba el origen ni los ejes del mundo | **Resuelto** | Spatial Reference UI-only: origen, ejes XYZ, etiquetas y suelo opcional derivados del `RenderScene`; nunca altera el frame ni entra en exports. |
| Los huecos internos se perdían al trazar | **Resuelto con alcance** | Los huecos se trazan como capas Fourier nombradas; el fill even-odd sigue pendiente. |
| Fill solo admitía color sólido | **Resuelto** | `fill.gradient` lineal/radial con ángulo, centro, radio y 2–4 colores, en canvas y SVG. |
| El canvas inicial podía quedar 100 px más estrecho que su contenedor | **Resuelto** | `P5Adapter` reajusta el canvas tras el layout y vuelve a ajustarlo al cargar; el artboard usa el ancho disponible y se centra. |
| `view.colorRamp` no tenía editor | **Resuelto** | Editor de 2–6 stops, add/remove/reset, preview y persistencia en LOOK → Render. |
| La cámara no tenía reset explícito | **Resuelto** | Reset undoable, deshabilitado en proyección ortográfica. |
| No había renombrado visible de capa | **Resuelto** | Acción de renombrado en Layers. |
| Notebook mantenía `notes`/`tags` sin editor | **Resuelto** | Edición de notas y tags en Notebook. |
| Explore randomizaba con seed interno no visible | **Resuelto** | Seed visible y reproducible. |
| Status y telemetría duplicaban información | **Resuelto** | Status de capa/panel separado de la telemetría de evaluación. |
| La lista de passes no tenía agrupación ni descripciones | **Resuelto** | Grupos Base/Surfaces/Color/Diagnostics y descripción por pass. |
| LOOK mezclaba canvas global y estilo de capa | **Resuelto** | LOOK dividido en Camera, Canvas, Style, Render y Overlays, con alcance explícito. |
| La cámara producía líneas radiales al acercarse/entrar en la geometría | **Resuelto** | Recorte de plano cercano, separación de curvas ocultas, límite de FOV y distancia de cámara según el radio de la escena. |
| No había export GIF | **Resuelto** | Export GIF desde Timeline, con duración/FPS del timeline, 360 px máximo, 240 frames y loop según el timeline. |
| `SPEC.md` §11 estaba desactualizado | **Resuelto** | Estado de render passes, color ramp y proyecciones actualizado. |

### Resuelto con alcance

| Hallazgo | Estado | Nota |
|---|---|---|
| `layer.locked` no impedía nada | **Parcial: content lock** | Bloquea generador, parámetros, ecuaciones/armónicos, operadores y estilo. Rename/reorder/delete/duplicate y restauración/exploración siguen fuera del contrato. |
| LOOK estaba sobrecargado | **Resuelto** | Phase 1 separó Camera/Canvas/Style/Render/Overlays. Phase 2 movió Image a Ingest y Animation/Timeline a Perform; el grupo Work desapareció. |

### Hallazgos que permanecen

- **Signed Distance** sigue siendo una omisión raster-only del SVG; PNG es el
  fallback fiel.
- **Color y grosor configurables por pass** (la opacidad ya existe).
- **Even-odd fill de huecos / jerarquía de contornos.**
- **Quad SVG/plotter:** el quad sigue siendo canvas-only; PNG/GIF lo capturan.
- **Surfaces ignoran operadores**; el pipeline sigue siendo curve-céntrico.
- **Notebook y Presets** siguen siendo dos bibliotecas separadas.
- **MAKE/fabricación:** no hay autoría de sólidos, CSG, STL/3MF, unidades ni
  preparación de impresión.
- **Persistencia múltiple** y otras deudas arquitectónicas descritas abajo.

No hay ningún cambio OpenSpec activo. Lo reciente está archivado en
`openspec/changes/archive/`.

---

## 1. Resumen ejecutivo

Parametrica mantiene seis modos (`FORM`, `LOOK`, `EXPLORE`, `PERFORM`,
`INGEST`, `KEEP`) y 22 secciones construidas una vez y ocultas por modo.

La implementación reciente cambió el mapa de LOOK y corrigió varias
promesas falsas:

1. LOOK se dividió en Camera, Canvas, Style, Render y Overlays.
2. Image pasó a **Ingest**; Animation y Timeline pasaron a **Perform**.
3. El grupo temporal **Work** desapareció.
4. El color ramp ya es editable.
5. Los passes tienen grupos, descripciones y aplicabilidad truthful.
6. Camera reset, estilo por capa, status/telemetría y metadata de Notebook se
   alinearon con la UI.
7. La proyección y el render 3D dejaron de producir líneas radiales cuando la
   cámara entraba en la geometría.
8. Timeline exporta PNG ZIP y GIF.

Siguen abiertos varias capacidades visuales/de exportación y toda la visión
MAKE/fabricación.

---

## 2. Mapa actual de navegación

| Modo | Secciones |
|---|---|
| **FORM** | Layers, Generator, Parameters, Equations, Harmonics, Operators |
| **LOOK** | Camera, Canvas, Style, Render, Overlays |
| **EXPLORE** | Mutation, Analysis, Advisor, Explore, Evolution |
| **PERFORM** | Animation, Timeline |
| **INGEST** | Image |
| **KEEP** | Notebook, Presets, Export |

Estado de navegación:

- Modo y secciones abiertas se persisten en `parametrica.ui.v1`.
- Los ids antiguos `view`/`artboard` se mapean a las nuevas secciones de LOOK.
- El alias defensivo `work` se migra a `perform`; los ids `image`,
  `animation` y `timeline` conservan su estado abierto/cerrado.
- Todas las secciones se construyen en cada `Controls.build()`.
- No hay routing, deep links ni historial de navegación.
- `Equations` y `Harmonics` son condicionales.
- El status de capa/panel ya no duplica la telemetría de evaluación.

Cambios de comportamiento dentro del mapa actual:

- **Camera**: proyección, guides y reset; reset deshabilitado en ortográfica.
- **Canvas**: artboard, tamaño, fondo y margen, marcados como globales.
- **Style**: stroke, fill, blend y paleta de la capa activa.
- **Render**: passes agrupados, descripciones, aplicabilidad y color ramp.
- **Overlays**: diagnósticos globales.
- **Layers**: content lock y renombrado visible.
- **Notebook**: notas y tags editables.
- **Ingest**: Image, underlay y tracing existente.
- **Perform**: Animation, Timeline, PNG ZIP y GIF.
- **Keep**: Notebook, Presets, Export final (SVG, PNG, JSON, clipboard).

---

## 3. Inventario funcional — estado actual

### FORM

| Funcionalidad | Estado actual | Nota |
|---|---|---|
| Bloqueo de capa | **Parcial: content lock** | Bloquea contenido; no rename/reorder/delete/duplicate. |
| Renombrar capa | **Implementado** | Acción visible en Layers. |
| Undo/redo y seed | En Explore | Siguen fuera de Form. |
| Operadores sobre superficies | No soportado | `evaluateSurfaceDocument` sigue ignorando operadores. |
| `setGenerator` conserva operadores | Comportamiento existente | No se abordó. |
| Operadores de malla/sólido | No existen | La autoría sigue siendo curve-céntrica. |

### LOOK

| Funcionalidad | Estado actual | Nota |
|---|---|---|
| Camera / Canvas / Style | **Separados** | Alcance global vs capa activa explícito. |
| Blend | **Implementado** | Por capa y reseteado; PNG lo refleja. |
| Passes de render | **Agrupados y descritos** | Aplicabilidad preservada. |
| Diagnóstico por capa | **Resuelto** | Cada capa usa su propio análisis. |
| Color ramp | **Editor implementado** | Global, independiente de la paleta. |
| Paleta/ramp | **Independientes por decisión** | Aplicar paleta no cambia el ramp. |
| Fill | Sólido + gradientes | Gradientes lineales/radiales con dirección, centro, radio y 2–4 colores. |
| Cámara | **Reset + guardas** | Reset undoable; recorte de plano cercano y distancia de escena. |
| Image | En **Ingest** | Underlay/tracing existente, sin cambios de capacidad. |
| Animation/Timeline | En **Perform** | Frame ZIP y GIF siguen en Timeline. |
| SVG export | **Passes vectoriales + overlays + blend** | Solo Signed Distance es raster-only. |

### EXPLORE

- Mutation sigue siendo one-shot en capa activa.
- Seed/reroll y randomize tienen seed visible/reproducible.
- Analysis y Advisor siguen en Explore.
- Evolution depende de Notebook.
- Sensitivity se limita a capa activa y hasta 12 parámetros.
- No hay historial persistente de candidatos.
- La separación conceptual Observe/Ask sigue pendiente.

### INGEST

- Image: underlay local, threshold preview, contour tracing y aplicación
  Fourier existentes.
- No se añadieron capacidades nuevas de tracing.

### PERFORM

- Animation: transporte de tiempo.
- Timeline: keyframes, easing, grabación, loop, PNG ZIP y GIF.
- Keep no duplica el export temporal.

### KEEP

| Funcionalidad | Estado actual | Nota |
|---|---|---|
| Export SVG | **Passes vectoriales + overlays + blend** | Solo Signed Distance queda como omisión raster-only. |
| Notebook notes/tags | **Editor implementado** | Notas y tags editables. |
| Presets/Notebook | Dos bibliotecas | Siguen sin unificar/relacionar. |
| Frame export / GIF | En Perform | No se duplica en Keep. |
| Fabricación | Solo contratos | Sin STL/3MF ni autoría de sólidos. |

---

## 4. Diagnóstico de LOOK

### Responsabilidades actuales

LOOK ya no mezcla canvas global y estilo de capa: Camera, Canvas, Style,
Render y Overlays tienen contratos separados. Image, Animation y Timeline ya
no viven en LOOK: Image está en Ingest y Animation/Timeline en Perform.

### Resuelto en Phase 1

- División Camera/Canvas/Style/Render/Overlays.
- Etiquetas de alcance global vs capa activa.
- Reset de cámara undoable y gating ortográfico.
- Editor de color ramp.
- Agrupación y descripciones de passes.
- Migración de estado UI desde `view`/`artboard`.
- Estilo `view.style` como alias explícito de la capa activa.

### Resuelto en Phase 2

- Image → **Ingest**.
- Animation + Timeline → **Perform**.
- Frame ZIP y GIF export siguen en Timeline, sin duplicarse en Keep.
- Se retiró **Work · temporary**.
- Se adaptó la migración de UI state (`work → perform`, ids de sección
  preservados) y los e2e.

### Límites que siguen

- Fill con gradientes lineales/radiales; color/grosor por pass pendientes.
- `view.modes` global; sin modos por capa.
- Passes con opacidad; color y grosor siguen fijos.

---

## 5. Diagnóstico de FORM

FORM sigue siendo autoría + composición + transformación.

Resuelto:

- Renombrado visible de capa.
- Content lock con guardas defensivas en generador, parámetros, ecuaciones,
  armónicos, operadores y estilo.

Pendiente:

- Decidir si el lock cubre rename/reorder/delete/duplicate.
- Las superficies ignoran operadores.
- `setGenerator` conserva operadores y sobrescribe el nombre.
- Seed y undo/redo siguen en EXPLORE.
- No hay operadores de malla/sólido.

---

## 6. Diagnóstico de EXPLORE

Sigue mezclando:

1. mutación one-shot;
2. observación (métricas/sensibilidad);
3. advisor offline/LLM;
4. exploración paramétrica 1D/2D/morph/randomize;
5. evolución dependiente de Notebook.

Resuelto:

- Seed visible y reproducible en Explore.

Pendiente:

- historial de candidatos;
- separación conceptual Observe/Ask;
- mover undo/redo/seed fuera de Explore;
- relación más clara entre Analysis y Notebook.

---

## 7. Diagnóstico de KEEP

Sigue conteniendo Notebook, Presets y Export.

Resuelto:

- Notas y tags editables en Notebook.
- Export SVG reproduce passes vectoriales, overlays y blend; avisa solo de Signed Distance.
- GIF export existe en Timeline.

Pendiente:

- relación Notebook/Presets;
- mover frame/GIF export a su ubicación final;
- export de fabricación.

---

## 8. Funcionalidades transversales

| Funcionalidad | Estado actual | Nota |
|---|---|---|
| Cámara | **Reset + guardas** | Reset undoable; recorte de plano cercano y distancia de escena. |
| Proyección | Global, gated por capa activa | Sin cambios de contrato. |
| Viewport/canvas | Global | Reajuste tras layout; ocupa el ancho disponible y centra el artboard. |
| Artboard | Global | Canvas section. |
| Imagen | Underlay UI-only | No entra en documentos ni export. |
| Export | SVG vectorial + SVG frames; PNG fiel; GIF animado | Signed Distance es la única omisión raster-only. |
| Animación/Timeline | En **Perform** | PNG ZIP + GIF siguen en Timeline. |
| Imagen | En **Ingest** | Underlay/tracing existente, UI-only. |
| Overlays | Globales | Sin cambios. |
| Presets | Workspace | Sin relación con Notebook. |
| Persistencia | Múltiples stores | Deuda arquitectónica. |
| Configuración global | UI/AI settings | Sin cambios. |
| Status/telemetría | **Separados** | Status de capa/panel vs evaluación. |
| History | Incluye cámara/estilo | La decisión de Camera Reset usa este historial. |
| Seed | Global, en Explore | Ya visible. |
| Analysis | Por capa | Correcto para diagnósticos. |
| Layer lock | **Content lock** | Estructura/identidad fuera de alcance. |
| Render passes | **Grupos/descripciones/aplicabilidad/opacidad** | Color/grosor por pass pendientes. |
| Blend | **Implementado** | `screen`/`difference` requieren revisión visual. |
| GIF export | **Implementado** | 360 px, 240 frames, loop según timeline. |

---

## 9. Estado actual de MAKE

Sin cambios.

- No existe MAKE como sección, modo o workspace.
- Existen contratos Surface/Mesh/Solid, teselación, `meshToSolid`,
  `geometryExport` y validación de fabricación.
- No hay autoría de mallas/sólidos, operadores 3D, STL/3MF, unidades ni
  preparación de impresión.
- La visión de fabricación sigue en conflicto con el modelo curve-céntrico, el
  renderer p5 sin z-buffer/iluminación y la exportación artboard/curvas.

---

## 10. Conflictos con la visión futura

1. Documento curve-céntrico; superficies sin operadores.
2. Renderer p5 con painter ordering, sin inspección de sólidos.
3. Export artboard/curvas; sin fabricación.
4. Navegación Form/Look/Explore/Perform/Ingest/Keep vs modos futuros del roadmap.
5. Estilo por capa pero render global.
6. Historial de documento completo (incluye cámara/estilo).
7. Persistencia múltiple.
8. Sin unidades ni tolerancias de fabricación.
9. Presupuestos de rendimiento orientados a puntos, no a mallas/sólidos.
10. MAKE no definido.
11. Ingest/Perform ya tienen dueño, pero sus capacidades futuras siguen sin plan.

Las correcciones recientes no resuelven estos conflictos; mejoran la
veracidad, la estabilidad de cámara y la exportación del estado actual.

---

## 11. Problemas y oportunidades

### 11.1 Problemas confirmados — estado actual

| Problema | Estado | Nota |
|---|---|---|
| Análisis combinado en passes por capa | **Resuelto** | Análisis lazy por capa + mapeo en `P5Adapter`. |
| `style.blend` sin efecto | **Resuelto** | Blend por capa, reset, PNG. |
| `layer.locked` sin efecto | **Parcial** | Content lock; estructura/identidad pendiente. |
| Passes no aplicables activos | **Resuelto con alcance** | `appliesTo` + UI. |
| SVG omite features sin avisar | **Resuelto** | Passes vectoriales, overlays y blend exportados; SDF avisado. |
| `view.colorRamp` sin UI | **Resuelto** | Editor en Render. |
| `renameLayer` sin UI | **Resuelto** | Acción en Layers. |
| Notebook notes/tags sin UI | **Resuelto** | Editor en Notebook. |
| Explore seed interno | **Resuelto** | Seed visible. |
| Frame/GIF export en Timeline | **Resuelto** | Pertenece a Perform; Keep no lo duplica. |
| Status/telemetría duplicados | **Resuelto** | Separados. |
| LOOK sobrecargado | **Resuelto** | Phase 1 + Phase 2; LOOK es appearance/viewport. |
| Cámara con artefactos al entrar en geometría | **Resuelto** | Plano cercano + distancia de escena + FOV mínimo. |
| `setGenerator` conserva operadores | Sin cambios | Comportamiento existente. |
| Superficies ignoran operadores | Sin cambios | Limitación estructural. |
| MAKE ausente | Sin cambios | Fuera de alcance. |

### 11.2 Problemas de UX

- Fill ya tiene gradientes lineales/radiales; faltan color/grosor por pass.
- Hay modos por capa y opacidad por pass; faltan color/grosor por pass.
- Notebook y Presets siguen siendo dos bibliotecas sin relación explícita.
- Seed y undo/redo siguen en EXPLORE.
- Analysis/Advisor siguen en EXPLORE.
- Copy sigue mezclando inglés y español.
- El content lock solo cubre contenido; las acciones estructurales siguen sin
  protección.
- `screen`/`difference` requieren revisión visual.

### 11.3 Problemas arquitectónicos

- `view.style` es alias del estilo de la capa activa (decisión aceptada).
- `view.modes` es global; el estilo es por capa.
- El pipeline de superficies salta operadores.
- Los passes siguen hardcodeando color/grosor; la opacidad ya es configurable.
- `P5Adapter` sigue leyendo el documento para animación/artboard/underlay.
- SVG y render p5 comparten los draw calls, pero no una descripción de escena completa.
- Múltiples stores de persistencia.
- Historial incluye cambios de vista (usado por Camera Reset).
- `view.strokeWeight` es un alias sincronizado de `style.stroke.width`.

---

## 12. Oportunidades de evolución

- **Export:** frame/GIF/SVG-frame export ya pertenece a Perform; los passes
  vectoriales y el SVG de plotter ya están cubiertos.
- **Color:** editor de paletas personalizado.
- **Passes:** color y stroke width por pass.
- **Quad:** reconstrucción SVG/plotter del layout 2×2.
- **Image:** even-odd fill de huecos y jerarquía.
- **Composición:** relación Notebook/Presets y persistencia unificada.
- **MAKE:** primer vertical slice de fabricación.
- **Verificación:** `screen`/`difference` y rendimiento de aplicabilidad en
  escenas grandes.

---

## 13. Decisiones que requieren intervención del usuario

| Decisión | Estado actual | Qué falta |
|---|---|---|
| Alcance del layer lock | Content lock | Decidir rename/reorder/delete/duplicate. |
| Blend | Implementado | Validar visualmente `screen`/`difference` y coste. |
| Estilo global vs por capa | `view.style` alias aceptado | Mantener o separar en el futuro. |
| Render modes globales vs por capa | Override por capa implementado | Mantener la herencia global y el override. |
| Fill/ramp scope | Ramp global; fill sólido/gradiente | Decidir color/grosor por pass y editor de paletas. |
| Notebook vs Presets | Separados | Unificar, relacionar o mantener. |
| MAKE | Sin código | Definir primer vertical slice y salida real. |
| Persistencia | Múltiples stores | Decidir si se unifica. |

---

## 14. Regresiones y verificación

### Confirmados y mitigados

| Problema | Estado | Nota |
|---|---|---|
| Toggles de render construidos con evaluación antigua | **Mitigado** | `App.evaluate()` refresca aplicabilidad. |
| Modos activos que dejan de aplicar se eliminan de `view.modes` | **Intencional** | El usuario debe reactivarlos si vuelven a aplicar. |
| Content lock desactiva la paleta que también toca el fondo | **Efecto lateral menor** | El fondo tiene control propio. |
| Cámara con líneas radiales al entrar en la geometría | **Resuelto** | Recorte de plano cercano, separación de curvas y distancia de escena. |

### Posibles, no confirmados

| Riesgo | Estado | Nota |
|---|---|---|
| `screen` / `difference` sin validación visual completa | Posible | Revisión manual pendiente. |
| `refreshRenderModes` en cada evaluación/playback | Posible rendimiento | Escrituras DOM guardadas; falta medir escenas grandes. |
| Solo algunos passes tienen `appliesTo` | Limitación | Los futuros passes deben declararlo. |
| El content lock no cubre timeline, exploración, presets ni restauración | Limitación documentada | Fuera del contrato de contenido. |
| El aviso SVG queda limitado a Signed Distance | UX | Ya no lista passes vectoriales. |
| El fit sigue serializado en `generator.params` | Limitación de compatibilidad | El engine lo consume como frame; una fase posterior puede mover el control a `view.frame` sin cambiar documentos. |
| Documentos mixtos 2D + 3D | Limitación de fase 0 | Las capas planas siguen en espacio artboard; no comparten frame espacial con las capas world. |
| El dominio UV no era visible | **Resuelto con alcance** | Inset UI-only con límites reales de `Surface.domain`, grid de baja densidad, orientación U/V y marcas de cierre/seam. Sin UV↔XYZ interactivo. |
| No existía una correspondencia paramétrica por esquina | **Resuelto con alcance** | `SurfaceMapping` generado junto a la teselación: celda/triángulo, UV reales por esquina, seams y twists; sidecar de evaluación sin consumo en render/picking todavía. |
| La malla proyectada perdía world y profundidad ortográfica | **Resuelto con alcance** | `preserveSource` opt-in añade `mesh-projection-source` con alias world, identidad de vértice y `orthoDepth` XY/XZ/YZ; el render normal no paga la asignación. |
| No se podía inspeccionar una superficie bajo el cursor | **Resuelto con alcance** | Surface Inspector en Canvas single: rayo world, intersección de triángulos, oclusión por distancia, UV reales por esquina y XYZ; sin edición, Quad ni export. |
| La inspección no tenía feedback visual en el canvas | **Resuelto con alcance** | Overlays UI-only de marcador, triángulo y celda paramétrica, con estados missing/mismatch y pin/release; fuera de escena y exports. |
| Los seams/twists no se podían distinguir visualmente | **Resuelto con alcance** | Overlay UI-only: bordes grises, seams rojos discontinuos y twists punteados, con leyenda explícita. Solo declara topología; no afirma continuidad geométrica. |
| Spatial Reference desaparecía en perspectiva | **Resuelto** | El extent usaba unidades proyectadas como world; ahora usa world bounds y cap por extensión horizontal, sin tocar frame ni bbox. |
| Quad en SVG/plotter | Limitación conocida | Quad sigue siendo canvas-only; la exportación usa la proyección activa. |
| Unidades físicas | Fuera de alcance | `A` es abstracto; la referencia espacial no muestra unidades físicas y el plotter aún no declara mm. |

### Estado de la suite

- `npm run check`: lint, **1924/1924** checks y build.
- `npm run test:e2e`: **115/115** tests.
- `openspec validate --specs --strict`: **73/73** specs.
- No hay cambios OpenSpec activos.
