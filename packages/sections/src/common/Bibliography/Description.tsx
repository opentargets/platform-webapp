import { Link } from "ui";

function Description({ label }) {
  return (
    <>
      Scientific literature related to <strong>{label}</strong> based on text mining PubMed
      abstracts. Source:{" "}
      <Link to="http://link.opentargets.io/" external>
        Open Targets
      </Link>
    </>
  );
}

export default Description;
