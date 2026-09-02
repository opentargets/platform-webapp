import { Link } from "ui";

type Props = { symbol: string; diseaseName: string };
function Description({ symbol, diseaseName }: Props) {
  return (
    <>
      Gene-Disease Validity curation assesing the strength of the evidence supporting or refuting a
      claim that variation in <strong>{symbol}</strong> causes <strong>{diseaseName}</strong>.
      Source:{" "}
      <Link to="https://clinicalgenome.org/curation-activities/gene-disease-validity/" external>
        Gene-Disease Validity curation
      </Link>
    </>
  );
}

export default Description;
