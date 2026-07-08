import { Link } from "ui";

type Props = { name: string };
function Description({ name }: Props) {
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
