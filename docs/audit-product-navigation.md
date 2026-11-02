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
- **Palette system / color-by-metric** más allá del color ramp actual.
- **Multi-viewport del Helix Lab:** 3D + tres proyecciones simultáneas.
- **Image tracing multicontorno / con huecos.**
- **Ajustes por pass y render modes por capa.**
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

- Fill con gradientes lineales/radiales; sin ajustes por pass.
- `view.modes` global; sin modos por capa.
- Sin controles por pass más allá de activar/desactivar.

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
| Render passes | **Grupos/descripciones/aplicabilidad** | Settings por pass pendientes. |
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

- Fill ya tiene gradientes lineales/radiales; faltan ajustes por pass.
- No hay settings por pass ni modos por capa.
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
- Los passes hardcodean colores/grosores; no hay settings por pass.
- `P5Adapter` sigue leyendo el documento para animación/artboard/underlay.
- SVG y render p5 comparten los draw calls, pero no una descripción de escena completa.
- Múltiples stores de persistencia.
- Historial incluye cambios de vista (usado por Camera Reset).
- `view.strokeWeight` es un alias sincronizado de `style.stroke.width`.

---

## 12. Oportunidades de evolución

- **Export:** frame/GIF/SVG-frame export ya pertenece a Perform; los passes
  vectoriales y el SVG de plotter ya están cubiertos.
- **Color:** palette system/color-by-metric más allá del ramp actual.
- **Image:** multicontorno y huecos.
- **Helix:** multi-viewport 3D + tres proyecciones.
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
| Render modes globales vs por capa | Globales | Decidir si se vuelven por capa. |
| Fill/ramp scope | Ramp global; fill sólido/gradiente | Decidir settings por pass. |
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

### Estado de la suite

- `npm run check`: lint, **1665/1665** checks y build.
- `npm run test:e2e`: **101/101** tests.
- `openspec validate --specs --strict`: **59/59** specs.
- No hay cambios OpenSpec activos.
