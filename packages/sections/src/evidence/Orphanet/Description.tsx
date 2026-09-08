import { Link } from "ui";

type Props = { symbol: string; diseaseName: string };
function Description({ symbol, diseaseName }: Props) {
  return (
    <>
      Expert-reviewed data supporting the relationship between <strong>{symbol}</strong> and{" "}
      <strong>{diseaseName}</strong>. Source:{" "}
      <Link to="https://www.orpha.net/consor/cgi-bin/Disease_Genes.php" external>
        Orphanet
      </Link>
    </>
  );
}

export default Description;
