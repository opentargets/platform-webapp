import { Link } from "ui";

function Description({ symbol }) {
  return (
    <>
      Structural protein information for <strong>{symbol}</strong>. Source:{" "}
      <Link external to="https://www.uniprot.org/">
        UniProt
      </Link>
      .
    </>
  );
}

export default Description;
