import { Link } from "ui";

type Props = { symbol: string };
function Description({ symbol }: Props) {
  return (
    <>
      Potent, selective and cell-permeable chemical modulators for <strong>{symbol}</strong>.
      Source:{" "}
      <Link external to="https://www.probes-drugs.org/">
        Probes & Drugs
      </Link>
    </>
  );
}

export default Description;
