import { Link } from "ui";

type Props = { symbol: string };
function Description({ symbol }: Props) {
  return (
    <>
      Genetic variants in <strong>{symbol}</strong> that have been associated with drug response
      (Gene may not be direct target of the drug). Source:{" "}
      <Link external to="https://www.pharmgkb.org/">
        ClinPGx
      </Link>
      .
    </>
  );
}

export default Description;
