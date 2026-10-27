import { Link, DisplayVariantId } from "ui";

type DescriptionProps = {
  variantId: string;
  referenceAllele: string;
  alternateAllele: string;
};

function Description({ variantId, referenceAllele, alternateAllele }: DescriptionProps) {
  return (
    <>
      Variant consequence prediction for transcripts in the genomic region of{" "}
      <strong>
        <DisplayVariantId
          variantId={variantId}
          referenceAllele={referenceAllele}
          alternateAllele={alternateAllele}
        />
      </strong>
      . Source:{" "}
      <Link to="https://www.ensembl.org/tools/vep" external>
        Ensembl VEP
      </Link>
    </>
  );
}

export default Description;
