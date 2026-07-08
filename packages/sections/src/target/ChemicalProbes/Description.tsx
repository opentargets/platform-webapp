import { Link } from "ui";

function Description({ symbol }) {
  return (
    <>
      Potent, selective and cell-permeable chemical modulators for <strong>{symbol}</strong>.
      Source:{" "}
      <Link external to="https://www.probes-drugs.org/">
        Probes & Drugs
      </Link>
    </>
  );
}

export default Description;
