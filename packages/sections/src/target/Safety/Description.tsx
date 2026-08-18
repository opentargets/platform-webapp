import { Link } from "ui";

type Props = { symbol: string };
function Description({ symbol }: Props) {
  return (
    <>
      Reported safety effects and risk information for <strong>{symbol}</strong>. Source:{" "}
      <Link external to="https://platform-docs.opentargets.org/target/safety">
        Open Targets
      </Link>
      .
    </>
  );
}

export default Description;
