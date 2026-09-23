import { Link, DisplayVariantId } from "ui";

type DescriptionProps = {
  variantId: string;
  referenceAllele: string;
  alternateAllele: string;
};

function Description({ variantId, referenceAllele, alternateAllele }: DescriptionProps) {
  return (
    <>
      Predicted and curated functional effect of{" "}
      <strong>
        <DisplayVariantId
          variantId={variantId}
          referenceAllele={referenceAllele}
          alternateAllele={alternateAllele}
        />
      </strong>
      . Source{" "}
      <Link to="https://www.ensembl.org/tools/vep" external>
        Ensembl VEP,{" "}
      </Link>
      <Link to="https://gnomad.broadinstitute.org/" external>
        gnomAD,{" "}
      </Link>
      <Link to="https://home.opentargets.org/node/1967" external>
        OTAR2075.
      </Link>
    </>
  );
}

export default Description;
