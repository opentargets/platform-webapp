import { Link } from "ui";

function Description({ symbol }) {
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
