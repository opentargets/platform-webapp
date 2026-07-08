import { Link } from "ui";

function Description({ symbol }) {
  return (
    <>
      Gene Essentiality assessment for <strong>{symbol}</strong> obtained through CRISPR
      loss-of-function screens in a wide range of cancer cell lines. Source:{" "}
      <Link external to="https://depmap.org/portal/">
        DepMap Portal
      </Link>
      .
    </>
  );
}

export default Description;
