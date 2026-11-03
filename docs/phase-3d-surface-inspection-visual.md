# Fase 3D — Surface Inspection Visual

> **Estado:** implementado.
>
> **Fecha:** 2026-11-03.
>
> **Base:** SurfaceMapping (3A), Projection Source (3B), Surface Inspection
> auditada (3C).
>
> **Naturaleza:** evolución visual UI-only. No modifica geometría, teselación,
> mapping, proyección, escena, frame, bbox ni exportadores.

---

## 1. Objetivo

Mejorar la inspección de superficies con feedback visual directo sobre el
canvas:

- marcador del punto world inspeccionado;
- contorno del triángulo seleccionado;
- contorno de la celda paramétrica cuando el mapping es válido;
- estados visuales para mapping `missing` / `mismatch`;
- pin/release separado del hover.

La inspección sigue siendo exploratoria. No edita geometría ni UVs.

---

## 2. Datos reutilizados

No se añadieron contratos geométricos. Se reutilizan:

- `SurfacePickResult`: layer, mesh, surface, face, triangle indices,
  barycentric, world, UV, cell, triangle, mapping status, distance/depth.
- `SurfaceMapping`: face→cell→UV per corner.
- `RenderScene` layer transforms: world → artboard para el overlay.
- `SurfaceInspector`: estado hover/pin y presentación.

No se usa `Mesh.uvs` ni se reconstruye UV desde XYZ.

---

## 3. Overlay visual

Componente puro:

`src/interaction/inspectionOverlay.js`

```text
buildInspectionOverlay({ evaluation, scene, result })
  → {
      marker: {x,y},
      triangle: [{x,y} × 3] | null,
      cell: [{x,y} × 4] | null,
      mappingValid: boolean,
    }
```

Reglas:

- el marcador usa `result.world` y el transform de la capa;
- el triángulo usa `mesh.faces[result.faceIndex]`;
- la celda solo se genera si `mappingStatus === 'ok'`;
- la celda se obtiene de los dos triángulos del mapping con la misma `cell`;
- si faltan las dos caras o hay vértices no proyectables, no se inventa celda;
- no se dibuja nada si el resultado ya no corresponde a la evaluación actual.

Dibujo:

- Canvas single, después de la geometría;
- recortado al artboard;
- marker con halo y cruz, tamaño constante en pantalla;
- triángulo blanco con relleno tenue;
- celda con relleno y contorno rojo suizo;
- mapping inválido: triángulo discontinuo/atenuado, sin celda;
- `captureMode` desactiva el overlay: PNG/GIF/SVG/plotter no lo incluyen.

---

## 4. Pin / Release

`SurfaceInspector` mantiene:

- `hoverResult`;
- `pinnedResult`;
- `pinnedView`;
- `pinnedLayerId`.

Comportamiento:

- **PIN** fija el resultado actual.
- Mientras está fijado, el hover no reemplaza la presentación.
- **RELEASE** vuelve al hover actual o a “Hover a surface”.
- El botón está en el header del inspector y tiene `pointer-events: auto`.
- El panel sigue siendo transparente al puntero salvo el botón.

### Invalidación

Un pin se libera cuando:

- cambia la evaluación y el resultado ya no valida contra la malla/mapping;
- cambia la topología;
- cambia la capa activa;
- cambia la cámara, proyección, frame o artboard;
- entra en Quad;
- empieza playback.

Un resize de canvas **no** invalida el pin: el resultado world sigue siendo
válido y el overlay se reproyecta.

La validación comprueba:

- layer/mesh/face actuales;
- índices del triángulo;
- punto world reconstruido desde baricéntricas;
- estado del mapping;
- UV y celda si el mapping es válido.

Nunca se reutiliza un `SurfacePickResult` obsoleto.

---

## 5. Archivos

**Nuevos**

- `src/interaction/inspectionOverlay.js`

**Modificados**

- `src/ui/SurfaceInspector.js`
- `src/interaction/surfacePicker.js` (`validatePickResult`)
- `src/render/p5/P5Adapter.js` (dibujo del overlay)
- `style.css` (botón PIN/RELEASE)
- `test/lab.smoke.mjs`
- `e2e/surface.spec.js`
- documentación y OpenSpec.

No se modificaron:

- `SurfaceMapping`;
- `Projection Source`;
- `ViewTransform`;
- `RenderScene`;
- teselación;
- exportadores.

---

## 6. Pruebas

Unitarias:

- overlay con mapping válido: marker + triángulo + celda de 4 esquinas;
- mapping missing: triángulo, sin celda, `mappingValid=false`;
- mapping malformado: sin celda;
- `validatePickResult` acepta el pick actual;
- geometría modificada invalida;
- capa oculta invalida;
- world manipulado invalida.

E2E:

- hover y campos del inspector;
- pin/release;
- pin sobrevive al hover y al resize;
- pin se invalida con cámara, proyección, playback y cambio de capa;
- no-hit;
- Quad `Single view only`;
- persistencia del toggle;
- PNG de artboard sin overlay;
- preferencia persistente.

---

## 7. Limitaciones

- Solo Canvas single; no hay overlay ni picking Quad.
- La celda solo se resalta si el mapping es válido.
- En mallas muy densas la celda puede ser visualmente muy pequeña; el marcador
  sigue siendo visible.
- No se visualizan seams/twists como tales. El mapping contiene la
  información, pero una visualización de seams requeriría una convención de
  presentación adicional; no se inventa.
- El pin se libera con cambios de cámara/proyección por seguridad; no sigue el
  punto a través de una nueva vista.
- La transparencia no afecta al picking.
- El overlay es UI-only y no se exporta.

---

## 8. Validación

- `npm run check`: lint, **1894/1894** unit checks y build.
- `npm run test:e2e`: **113/113** tests.
- `openspec validate --specs --strict`: **73/73** specs.
- Verificación visual manual: Hyperbolic Saddle con marcador/celda; Torus con
  inspector compacto y PIN/RELEASE; Quad con `Single view only`.
- PNG del artboard sin overlay; SVG/plotter sin datos de inspección.

---

## 9. Recomendación para la siguiente fase

La siguiente evolución natural sería una visualización **estática y explícita**
de seams/twists usando `SurfaceMapping.domain` y las caras de borde, sin
inventar información. Antes de hacerlo conviene definir:

- qué se considera un seam visual (borde de dominio, cambio de UV o ambos);
- cómo se representa un twist sin sugerir una orientación falsa;
- si el overlay debe sobrevivir al pin o ser independiente.

No avanzar a Quad picking, edición de UV, CAD ni fabricación sin una nueva fase.
