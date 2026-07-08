import { Link } from "ui";

function Description({ symbol }) {
  return (
    <>
      Physical and functional molecular interactions with <strong>{symbol}</strong>. Source:{" "}
      <Link to="https://platform-docs.opentargets.org/target/molecular-interactions" external>
        Open Targets
      </Link>
      ,{" "}
      <Link
        to="https://platform-docs.opentargets.org/target/molecular-interactions#intact"
        external
      >
        IntAct
      </Link>
      ,{" "}
      <Link
        to="https://platform-docs.opentargets.org/target/molecular-interactions#signor"
        external
      >
        Signor
      </Link>
      ,{" "}
      <Link
        to="https://platform-docs.opentargets.org/target/molecular-interactions#reactome"
        external
      >
        Reactome
      </Link>
      ,{" "}
      <Link
        to="https://platform-docs.opentargets.org/target/molecular-interactions#string"
        external
      >
        String
      </Link>
    </>
  );
}

export default Description;
