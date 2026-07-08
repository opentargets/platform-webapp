import { Link } from "ui";

function Description({ symbol, name }) {
  return (
    <>
      Mapping of phenotypes in <strong>{symbol}</strong> animal model mutants similar to{" "}
      <strong>{name}</strong>. Source:{" "}
      <Link to="https://www.mousephenotype.org" external>
        IMPC
      </Link>
    </>
  );
}

export default Description;
