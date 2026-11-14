/** Contracts for fabrication exporters. */

import { isMesh, isSolid } from '../geometry/contracts.ts';
import { validateMesh, validateSolid } from '../geometry/validate.ts';

export interface FabricationValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
  meta: Record<string, unknown> | null;
}

export interface ExportContextOptions {
  units?: string;
  tolerance?: number;
}

export interface ExportContext {
  units: string;
  tolerance: number;
}

export class GeometryExporter {
  id: string;
  extension: string;
  mimeType: string;

  constructor({ id, extension, mimeType }: { id: string; extension: string; mimeType: string }) {
    this.id = id;
    this.extension = extension;
    this.mimeType = mimeType;
  }

  export(): string | Uint8Array {
    throw new Error(`${this.id}: export(geometry, options) must be implemented`);
  }
}

export function validateForFabrication(geometry: unknown): FabricationValidation {
  if (isSolid(geometry)) return validateSolid(geometry) as FabricationValidation;
  if (isMesh(geometry)) return validateMesh(geometry) as FabricationValidation;
  return { ok: false, errors: ['fabrication export requires a Mesh or Solid'], warnings: [], meta: null };
}

export function createExportContext({ units = 'unitless', tolerance = 1e-6 }: ExportContextOptions = {}): ExportContext {
  return { units, tolerance };
}
