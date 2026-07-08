import { Link } from "ui";

type Props = { symbol: string };
function Description({ symbol }: Props) {
  return (
    <>
      Subcellular location data for <strong>{symbol}</strong>. Source:{" "}
      <Link external to="https://www.uniprot.org/">
        UniProt
      </Link>
      ,{" "}
      <Link external to="https://www.proteinatlas.org/">
        HPA
      </Link>
      .
    </>
  );
}

export default Description;
