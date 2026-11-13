/**
 * geometry/trust.ts — lifecycle for mesh-level trust metadata.
 *
 * `manifoldGuaranteed` is evidence about one concrete mesh. It must not be
 * inherited by a mesh that has been welded, capped, split, flipped, simplified
 * or otherwise post-processed.
 */

export interface TrustMeta {
  manifoldGuaranteed?: boolean;
  [key: string]: unknown;
}

export function clearManifoldGuarantee<T extends TrustMeta | null | undefined>(meta: T): T | TrustMeta {
  if (!meta || meta.manifoldGuaranteed !== true) return meta;
  const next: TrustMeta = { ...meta };
  delete next.manifoldGuaranteed;
  return next;
}

export function isManifoldGuaranteed(meta: TrustMeta | null | undefined): boolean {
  return meta?.manifoldGuaranteed === true;
}
