import { Link } from "ui";

type Props = { symbol: string; diseaseName: string };
function Description({ symbol, diseaseName }: Props) {
  return (
    <>
      Expert-curated genomic biomarkers of drug sensitivity, resistance, and toxicity for drugs
      targeting <strong>{symbol}</strong> with an experimental or approved indication of{" "}
      <strong>{diseaseName}</strong>. Source:{" "}
      <Link external to="https://www.cancergenomeinterpreter.org/2018/biomarkers">
        Cancer Genome Interpreter
      </Link>
      .
    </>
  );
}

export default Description;
