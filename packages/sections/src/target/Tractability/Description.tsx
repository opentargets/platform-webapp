import { Link } from "ui";

type Props = { symbol: string };
function Description({ symbol }: Props) {
  return (
    <>
      Target tractability assessment for <strong>{symbol}</strong>. Source:{" "}
      <Link external to="https://platform-docs.opentargets.org/target/tractability">
        Open Targets
      </Link>
      .
    </>
  );
}

export default Description;
