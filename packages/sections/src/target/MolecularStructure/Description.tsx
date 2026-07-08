import { Link } from "ui";

type Props = { symbol: string };
function Description({ symbol }: Props) {
  return (
    <>
      Structural protein information for <strong>{symbol}</strong>. Source:{" "}
      <Link external to="https://www.uniprot.org/">
        UniProt
      </Link>
      .
    </>
  );
}

export default Description;
