import { Link } from "ui";

type Props = { name: string };

function Description({ name }: Props) {
  return (
    <>
      Investigational and approved indications for <strong>{name}</strong> curated from clinical
      trial records and post-marketing package inserts. Source:{" "}
      <Link to="https://platform-docs.opentargets.org/drug/indications" external>
        Open Targets
      </Link>{" "}
      and{" "}
      <Link to="https://www.ebi.ac.uk/chembl/" external>
        ChEMBL
      </Link>
      .
    </>
  );
}

export default Description;
