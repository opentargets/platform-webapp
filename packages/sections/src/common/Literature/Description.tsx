import { Link } from "ui";

const url = "http://platform-docs.opentargets.org/bibliography";

type Props = { name: string };
function Description({ name }: Props) {
  return (
    <>
      Scientific literature mentioning NLP-recognised entity <strong>{name}</strong> and other
      selected co-occurring entities. Source:{" "}
      <Link external to={url}>
        Open Targets
      </Link>
      .
    </>
  );
}

export default Description;
