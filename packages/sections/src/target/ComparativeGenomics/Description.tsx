import { Link } from "ui";

function Description({ symbol }: { symbol: string }) {
  return (
    <>
      Homology for <strong>{symbol}</strong> across selected species. Source:{" "}
      <Link external to="https://www.ensembl.org/help">
        Ensembl Compara
      </Link>
      .
    </>
  );
}

export default Description;
