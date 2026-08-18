import { Link } from "ui";

type Props = { name: string };
function Description({ name }: Props) {
  return (
    <>
      Active and closed projects for <strong>{name}</strong>. Source:{" "}
      <Link external to="http://home.opentargets.org/">
        Open Targets
      </Link>
      .
    </>
  );
}

export default Description;
