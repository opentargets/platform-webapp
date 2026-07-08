import { Link } from "ui";

function Description({ symbol }) {
  return (
    <>
      Biological pathways where <strong>{symbol}</strong> is present. Source:{" "}
      <Link external to="https://reactome.org/">
        Reactome
      </Link>
      .
    </>
  );
}

export default Description;
