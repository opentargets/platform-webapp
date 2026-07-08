import { Link } from "ui";

type Props = { symbol: string; diseaseName: string };
function Description({ symbol, diseaseName }: Props) {
  return (
    <>
      Catalogue of somatic mutations that causally implicate <strong>{symbol}</strong> in{" "}
      <strong>{diseaseName}</strong>. Source:{" "}
      <Link to="https://cancer.sanger.ac.uk/census" external>
        COSMIC
      </Link>
    </>
  );
}

export default Description;
