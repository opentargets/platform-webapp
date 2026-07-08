import { Link } from "ui";

type Props = { symbol: string };
function Description({ symbol }: Props) {
  return (
    <>
      RNA and protein baseline expression for <strong>{symbol}</strong> (see{" "}
      <Link external to="https://platform-docs.opentargets.org/target/baseline-expression">
        our documentation
      </Link>{" "}
      for more information). Source:{" "}
      <Link external to="https://tabula-sapiens.sf.czbiohub.org/">
        Tabula Sapiens
      </Link>
      ,{" "}
      <Link external to="https://www.gtexportal.org/home/">
        GTEx
      </Link>
      ,{" "}
      <Link external to="https://home.opentargets.org/OTAR3091">
        PRIDE (OTAR3091)
      </Link>{" "}
      and{" "}
      <Link external to="https://dice-database.org/">
        DICE
      </Link>
      .
    </>
  );
}

export default Description;
