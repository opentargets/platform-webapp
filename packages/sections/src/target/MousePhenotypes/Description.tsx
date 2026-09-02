import { Link } from "ui";

type Props = { symbol: string };
function Description({ symbol }: Props) {
  return (
    <>
      Phenotypes associated with <strong>{symbol}</strong> murine homologue(s). Source:{" "}
      <Link external to="http://www.informatics.jax.org/phenotypes.shtml">
        MGI
      </Link>
      .
    </>
  );
}

export default Description;
