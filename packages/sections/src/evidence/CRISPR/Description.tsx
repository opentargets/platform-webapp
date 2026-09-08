import { Link } from "ui";

type Props = { symbol: string; name: string };
function Description({ symbol, name }: Props) {
  return (
    <>
      Cancer cell line dependencies identified using CRISPR-Cas9 whole genome screenings pinpointing
      a <strong>{symbol}</strong> dependency in <strong>{name}</strong>. Source:{" "}
      <Link to="https://score.depmap.sanger.ac.uk" external>
        Project Score
      </Link>
    </>
  );
}

export default Description;
