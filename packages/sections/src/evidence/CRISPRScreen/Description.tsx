import { Link } from "ui";

type Props = { symbol: string; name: string };
const Description = ({ symbol, name }: Props) => (
  <>
    CRISPR knockout screens from public CRISPR datasources, associating <strong>{symbol}</strong>{" "}
    and CRISPR results. Sources:{" "}
    <Link external to="https://crisprbrain.org/">
      CRISPRBrain
    </Link>
  </>
);

export default Description;
