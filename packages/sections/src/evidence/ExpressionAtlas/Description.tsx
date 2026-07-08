import { Link } from "ui";

function Description({ symbol, name }) {
  return (
    <>
      Transcriptomic analysis reporting a significant differential expression of{" "}
      <strong>{symbol}</strong> when comparing control samples with <strong>{name}</strong> samples.
      Source:{" "}
      <Link to="https://www.ebi.ac.uk/gxa/home" external>
        Expression Atlas
      </Link>
    </>
  );
}

export default Description;
