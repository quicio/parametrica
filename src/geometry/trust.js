/**
 * geometry/trust.js — lifecycle for mesh-level trust metadata.
 *
 * `manifoldGuaranteed` is evidence about one concrete mesh. It must not be
 * inherited by a mesh that has been welded, capped, split, flipped, simplified
 * or otherwise post-processed.
 */

export function clearManifoldGuarantee(meta) {
  if (!meta || meta.manifoldGuaranteed !== true) return meta;
  const next = { ...meta };
  delete next.manifoldGuaranteed;
  return next;
}

export function isManifoldGuaranteed(meta) {
  return meta?.manifoldGuaranteed === true;
}
