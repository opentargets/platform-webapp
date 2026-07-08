import { Link } from "ui";

type Props = { symbol: string };
function Description({ symbol }: Props) {
  return (
    <>
      Mutational constraint observed in {symbol} canonical transcript in natural populations.
      Source:{" "}
      <Link external to="https://gnomad.broadinstitute.org">
        gnomAD
      </Link>
      .
    </>
  );
}

export default Description;
