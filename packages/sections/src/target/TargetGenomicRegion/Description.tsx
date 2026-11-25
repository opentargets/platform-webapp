type DescriptionProps = {
  targetSymbol?: string;
};

function Description({ targetSymbol }: DescriptionProps) {
  return (
    <>
      Genes (canonical transcripts) in the region of <strong>{targetSymbol}</strong>. Build: GRCh38.
    </>
  );
}

export default Description;
