import { Link } from "ui";

type Props = { symbol: string; diseaseName: string };
function Description({ symbol, diseaseName }: Props) {
  return (
    <>
      Gene burden analysis prioritising <strong>{symbol}</strong> as likely causal gene for{" "}
      <strong>{diseaseName}</strong>. Source:{" "}
      <Link to="https://platform-docs.opentargets.org/evidence#gene-burden" external>
        Open Targets
      </Link>
    </>
  );
}

export default Description;