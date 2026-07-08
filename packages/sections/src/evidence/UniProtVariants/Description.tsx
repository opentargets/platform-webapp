import { Link } from "ui";

function Description({ symbol, diseaseName }) {
  return (
    <>
      Literature-based curation associating genetic variations affecting <strong>{symbol}</strong>{" "}
      protein products with <strong>{diseaseName}</strong>. Source:{" "}
      <Link to="https://www.uniprot.org" external>
        UniProt
      </Link>
    </>
  );
}

export default Description;
