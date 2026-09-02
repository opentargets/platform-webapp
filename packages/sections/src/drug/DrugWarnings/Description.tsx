import { Link } from "ui";

type Props = { name: string };
function Description({ name }: Props) {
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
