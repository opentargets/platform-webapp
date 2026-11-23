/**
 * The canonical transcript of a target, as served by the API's
 * `Target.canonicalTranscript`: its coordinates and strand, without exons, so
 * genes are drawn as a line spanning the transcript with no exon blocks.
 */
export function getCanonicalTranscript(target: any) {
  return target.canonicalTranscript ?? undefined;
}
