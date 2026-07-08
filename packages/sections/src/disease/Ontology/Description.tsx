import { Link } from "ui";

function Description({ name }) {
  return (
    <>
      Ontology subgraph including children, ancestors and therapeutic areas of{" "}
      <strong>{name}</strong>. Source:{" "}
      <Link to="https://www.ebi.ac.uk/efo/" external>
        EFO
      </Link>
      .
    </>
  );
}

export default Description;
