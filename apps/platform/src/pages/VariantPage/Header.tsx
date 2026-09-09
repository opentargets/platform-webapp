import { faMapPin } from "@fortawesome/free-solid-svg-icons";
import { Header as HeaderBase, XRefLinks, DisplayVariantId } from "ui";
import { VariantPageDataType } from "./types";

const xrefsToDisplay = {
  ensembl_variation: {
    label: "Ensembl",
    urlStem: "https://www.ensembl.org/Homo_sapiens/Variation/Explore?v=",
  },
  gnomad: {
    label: "gnomAD",
    urlBuilder: id => `https://gnomad.broadinstitute.org/variant/${id}?dataset=gnomad_r4`,
  },
  protvar: {
    label: "ProtVar",
    urlBuilder: (id, { chromosome, position, referenceAllele, alternateAllele }) =>
      `https://www.ebi.ac.uk/ProtVar/query?chromosome=${chromosome}&genomic_position=${position}&reference_allele=${referenceAllele}&alternative_allele=${alternateAllele}`,
  },
  clinvar: {
    label: "ClinVar",
    urlStem: "https://www.ncbi.nlm.nih.gov/clinvar/variation/",
  },
  omim: {
    label: "OMIM",
    urlStem: "https://www.omim.org/entry/",
  },
};

function processXRefs(dbXRefs) {
  const xrefs = {};
  for (const { id, source } of dbXRefs) {
    const { label, urlBuilder, urlStem } = xrefsToDisplay[source];
    if (xrefs[source]) {
      xrefs[source].ids.add(id);
    } else {
      xrefs[source] = {
        label,
        urlStem,
        urlBuilder,
        ids: new Set([id]),
      };
    }
  }
  return xrefs;
}

export function buildHeaderMeta({
  variantId,
  variantPageData,
}: {
  variantId: string;
  variantPageData: VariantPageDataType;
}) {
  const xrefs = processXRefs(variantPageData?.dbXrefs || []);

  return {
    title: (
      <DisplayVariantId
        variantId={variantId}
        referenceAllele={variantPageData?.referenceAllele}
        alternateAllele={variantPageData?.alternateAllele}
      />
    ),
    Icon: faMapPin,
    externalLinks: (
      <>
        {Object.keys(xrefs).map(xref => {
          const { label, urlBuilder, urlStem, ids } = xrefs[xref];
          return (
            <XRefLinks
              key={xref}
              label={label}
              urlStem={urlStem}
              urlBuilder={urlBuilder ? id => urlBuilder(id, variantPageData) : null}
              ids={[...ids]}
              limit="3"
            />
          );
        })}
      </>
    ),
  };
}

type HeaderProps = {
  loading: boolean;
  variantId: string;
  variantPageData: VariantPageDataType;
};

function Header({ loading, variantId, variantPageData }: HeaderProps) {
  const { title, Icon, externalLinks } = buildHeaderMeta({ variantId, variantPageData });

  return (
    <HeaderBase loading={loading} title={title} Icon={Icon} externalLinks={externalLinks} />
  );
}

export default Header;
