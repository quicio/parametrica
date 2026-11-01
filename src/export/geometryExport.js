/**
 * export/geometryExport.js — contracts for future fabrication exporters.
 *
 * SVG/PNG export uses the render scene. STL/3MF use world Mesh/Solid and do not
 * depend on p5, camera or document.view.
 */

import { isMesh, isSolid } from '../geometry/contracts.js';
import { validateMesh, validateSolid } from '../geometry/validate.js';

export class GeometryExporter {
  constructor({ id, extension, mimeType }) {
    this.id = id;
    this.extension = extension;
    this.mimeType = mimeType;
  }

  /** @returns {string|Uint8Array} */
  export() {
    throw new Error(`${this.id}: export(geometry, options) must be implemented`);
  }
}

export function validateForFabrication(geometry) {
  if (isSolid(geometry)) return validateSolid(geometry);
  if (isMesh(geometry)) return validateMesh(geometry);
  return { ok: false, errors: ['fabrication export requires a Mesh or Solid'], warnings: [] };
}

export function createExportContext({ units = 'unitless', tolerance = 1e-6 } = {}) {
  return { units, tolerance };
}
