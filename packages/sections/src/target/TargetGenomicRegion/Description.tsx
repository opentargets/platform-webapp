type DescriptionProps = {
  targetSymbol?: string;
};

function Description({ targetSymbol }: DescriptionProps) {
  return (
    <>
      Genes in the region of <strong>{targetSymbol}</strong> (build: GRCh38).
    </>
  );
}

export default Description;
