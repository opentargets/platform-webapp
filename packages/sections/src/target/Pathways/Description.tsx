import { Link } from "ui";

type Props = { symbol: string };
function Description({ symbol }: Props) {
  return (
    <>
      Biological pathways where <strong>{symbol}</strong> is present. Source:{" "}
      <Link external to="https://reactome.org/">
        Reactome
      </Link>
      .
    </>
  );
}

export default Description;
