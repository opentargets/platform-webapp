import { Link } from "ui";

function Description({ symbol, diseaseName }) {
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
