import { Link } from "ui";

function Description({ name }) {
  return (
    <>
      Manually curated withdrawn and black box warnings for <strong>{name}</strong>. Source:{" "}
      <Link to="https://www.ebi.ac.uk/chembl" external>
        ChEMBL
      </Link>
    </>
  );
}

export default Description;
