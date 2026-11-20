import { useQuery } from "@apollo/client";
import { faCircleXmark } from "@fortawesome/free-regular-svg-icons";
import { faCircleCheck } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useTheme } from "@mui/material/styles";
import {
  type DrugBodyProps,
  type DrugPharmacogenomicsQuery,
  type DrugPharmacogenomicsQueryVariables,
  naLabel,
  PHARM_GKB_COLOR,
  variantConsequenceSource,
} from "@ot/constants";
import { epmcUrl, identifiersOrgLink, sentenceCase } from "@ot/utils";
import type { ReactNode } from "react";
import {
  DirectionalityDrawer,
  DisplayVariantId,
  LabelChip,
  Link,
  type OtTableColumn,
  OtTableServer,
  PublicationsDrawer,
  SectionItem,
  Tooltip,
} from "ui";
import { typedDocument } from "../../utils/typedDocument";
import { definition } from ".";
import Description from "./Description";
import PHARMACOGENOMICS_QUERY_DOCUMENT from "./Pharmacogenomics.gql";

const PHARMACOGENOMICS_QUERY = typedDocument<
  DrugPharmacogenomicsQuery,
  DrugPharmacogenomicsQueryVariables
>(PHARMACOGENOMICS_QUERY_DOCUMENT);

type PharmacogenomicsRow = NonNullable<
  DrugPharmacogenomicsQuery["drug"]
>["pharmacogenomics"]["rows"][number];

const PAGE_SIZE = 10;

const getLevelElementClassName = (level: string) => {
  switch (level) {
    case "1":
      return "green";
    case "1A":
      return "green";
    case "1B":
      return "green";
    case "2":
      return "blue";
    case "2A":
      return "blue";
    case "2B":
      return "blue";
    case "3":
      return "yellow";
    case "4":
      return "red";
    default:
      return "red";
  }
};

type Props = DrugBodyProps;

function Body({ id: chemblId, label: name, entity }: Props) {
  const variables = { chemblId };
  const theme = useTheme();
  const levelColors: Record<string, string> = {
    green: PHARM_GKB_COLOR.green,
    red: PHARM_GKB_COLOR.red,
    yellow: PHARM_GKB_COLOR.yellow,
    blue: theme.palette.primary.main,
  };

  const columns: OtTableColumn<PharmacogenomicsRow>[] = [
    {
      id: "gene",
      label: "Gene",
      renderCell: ({ target }) => {
        if (target) {
          return (
            <Link asyncTooltip to={`/target/${target.id}`}>
              <span>{target.approvedSymbol}</span>
            </Link>
          );
        }
        return naLabel;
      },
      filterValue: ({ target }) => target?.approvedSymbol ?? "",
    },
    {
      id: "variantRsId",
      label: "rsID",
      enableHiding: false,
      renderCell: ({ variantRsId }) =>
        variantRsId ? (
          <Link
            external
            to={`https://www.ensembl.org/Homo_sapiens/Variation/Explore?v=${variantRsId}`}
          >
            {variantRsId}
          </Link>
        ) : (
          naLabel
        ),
    },
    {
      id: "starAllele",
      label: "Star Allele",
      renderCell: ({ haplotypeId, haplotypeFromSourceId }) => {
        const displayId = haplotypeId || haplotypeFromSourceId || naLabel;
        const LinkComponent = haplotypeFromSourceId && (
          <Link external to={`https://www.pharmgkb.org/haplotype/${haplotypeFromSourceId}`}>
            {displayId}
          </Link>
        );

        return LinkComponent || displayId || naLabel;
      },
    },
    {
      id: "genotypeId",
      label: "Genotype ID",
      tooltip: (
        <>
          VCF-style(chr_pos_ref_allele1,allele2). See{" "}
          <Link
            external
            to="https://github.com/apriltuesday/opentargets-pharmgkb/tree/issue-18#variant-coordinate-computation"
          >
            here
          </Link>{" "}
          for more details.
        </>
      ),
      renderCell: ({ genotypeId }) => {
        if (!genotypeId) return naLabel;
        const [chr, pos, ref, alt] = genotypeId.split(",")[0].split("_");
        if (!chr || !pos || !ref || !alt) return genotypeId;
        const variantId = `${chr}_${pos}_${ref}_${alt}`;
        return (
          <Link asyncTooltip to={`/variant/${variantId}`}>
            <DisplayVariantId
              variantId={variantId}
              referenceAllele={ref}
              alternateAllele={alt}
              expand={false}
            />
            {genotypeId.includes(",") ? `,${genotypeId.split(",")[1]}` : ""}
          </Link>
        );
      },
    },
    {
      id: "variantConsequence",
      label: "Variant Consequence",
      renderCell: ({ variantFunctionalConsequence, genotypeId }) => {
        const pvparams = genotypeId?.split(",")[0].split("_") || [];
        return (
          <div style={{ display: "flex", gap: "5px" }}>
            {variantFunctionalConsequence ? (
              <LabelChip
                label={variantConsequenceSource.VEP.label}
                value={sentenceCase(variantFunctionalConsequence.label) ?? undefined}
                tooltip={variantConsequenceSource.VEP.tooltip}
                to={identifiersOrgLink("SO", variantFunctionalConsequence.id.slice(3))}
              />
            ) : (
              naLabel
            )}
            {(variantFunctionalConsequence?.id === "SO:0001583" ||
              variantFunctionalConsequence?.id === "SO:0001587") && (
              <LabelChip
                label={variantConsequenceSource.ProtVar.label}
                to={`https://www.ebi.ac.uk/ProtVar/query?chromosome=${pvparams[0]}&genomic_position=${pvparams[1]}&reference_allele=${pvparams[2]}&alternative_allele=${pvparams[3]}`}
                tooltip={variantConsequenceSource.ProtVar.tooltip}
              />
            )}
          </div>
        );
      },
      filterValue: ({ variantFunctionalConsequence }) =>
        sentenceCase(variantFunctionalConsequence?.label),
    },
    {
      id: "drugResponse",
      label: "Drug Response Phenotype",
      renderCell: ({ phenotypeText, phenotypeFromSourceId, genotypeAnnotationText }) => {
        let phenotypeTextElement: ReactNode = phenotypeText || naLabel;

        if (phenotypeFromSourceId)
          phenotypeTextElement = (
            <Link asyncTooltip to={`/disease/${phenotypeFromSourceId}`}>
              {phenotypeTextElement}
            </Link>
          );

        if (genotypeAnnotationText)
          phenotypeTextElement = (
            <Tooltip title={genotypeAnnotationText} showHelpIcon>
              {phenotypeTextElement}
            </Tooltip>
          );

        return phenotypeTextElement;
      },
      filterValue: ({ phenotypeText }) => phenotypeText ?? "",
    },
    {
      id: "drugResponseCategory",
      label: "Drug Response Category",
      renderCell: ({ pgxCategory }) => pgxCategory || naLabel,
      filterValue: ({ pgxCategory }) => pgxCategory,
    },
    {
      id: "directionality",
      label: "Directionality",
      renderCell: ({ variantAnnotation }) => (
        <DirectionalityDrawer variantAnnotation={variantAnnotation} caption="Directionality" />
      ),
    },
    {
      id: "isDirectTarget",
      label: "Direct Drug Target",
      renderCell: ({ isDirectTarget }) => {
        const ICON_NAME = isDirectTarget ? faCircleCheck : faCircleXmark;
        return <FontAwesomeIcon icon={ICON_NAME} size="lg" color={theme.palette.primary.main} />;
      },
    },
    {
      id: "evidenceLevel",
      label: "Confidence Level",
      tooltip: (
        <>
          As defined by
          <Link external to={"https://www.pharmgkb.org/page/clinAnnLevels"}>
            {" "}
            ClinPGx ClinAnn Levels
          </Link>
        </>
      ),
      renderCell: ({ evidenceLevel }) => {
        if (evidenceLevel) {
          const levelClass = getLevelElementClassName(evidenceLevel);
          return (
            <span
              style={{
                color: "white",
                padding: theme.spacing(0.5),
                borderRadius: theme.spacing(0.5),
                background: levelColors[levelClass],
              }}
            >
              Level {evidenceLevel}
            </span>
          );
        }
        return naLabel;
      },
      filterValue: ({ evidenceLevel }) => `Level ${evidenceLevel}`,
    },
    {
      id: "source",
      label: "Source",
      renderCell: ({ studyId }) =>
        studyId ? (
          <Link external to={`https://www.pharmgkb.org/clinicalAnnotation/${studyId}`}>
            ClinPGx
          </Link>
        ) : (
          naLabel
        ),
    },
    {
      id: "literature",
      label: "Literature",
      renderCell: ({ literature }) => {
        const literatureList = literature
          .filter((id) => id !== "NA")
          .map((id) => ({
            name: id,
            url: epmcUrl(id),
            group: "literature",
          }));

        return <PublicationsDrawer entries={literatureList} />;
      },
    },
  ];

  // first page only: drives the section loading/error state, the table fetches
  // the same page from the Apollo cache and then paginates on its own
  const request = useQuery(PHARMACOGENOMICS_QUERY, {
    variables: { ...variables, index: 0, size: PAGE_SIZE },
  });

  return (
    <SectionItem
      definition={definition}
      request={request}
      entity={entity}
      renderDescription={() => <Description name={name} />}
      renderBody={() => (
        <OtTableServer<PharmacogenomicsRow>
          columns={columns}
          query={PHARMACOGENOMICS_QUERY}
          variables={variables}
          dataPath="drug.pharmacogenomics"
          pageSize={PAGE_SIZE}
          dataDownloader
          dataDownloaderFileStem={`${chemblId}-pharmacogenomics`}
        />
      )}
    />
  );
}

export default Body;
