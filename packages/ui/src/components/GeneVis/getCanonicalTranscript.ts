export function getCanonicalTranscript(target: any) {
  const transcripts = target.transcripts?.rows ?? [];
  return transcripts.find(transcript => transcript.isEnsemblCanonical) ??
    (transcripts.length === 1 ? transcripts[0] : undefined);
}
