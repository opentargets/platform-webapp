import { Link } from "ui";

type Props = { symbol: string; name: string };
function Description({ symbol, name }: Props) {
  return (
    <>
      95% GWAS credible sets prioritising <strong>{symbol}</strong> as likely causal gene for{" "}
      <strong>{name}</strong>. Source:{" "}
      <Link to="https://platform-docs.opentargets.org/evidence#gwas-associations" external>
        Open Targets
      </Link>
    </>
  );
}

export default Description;
