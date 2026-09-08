import { useQuery } from "@apollo/client";
import { definition } from ".";
import Description from "./Description";
import PHARMACOGENOMICS_QUERY from "./PharmacogenomicsQuery.gql";
import { Fragment } from "react";
import { useTheme } from "@mui/material/styles";
import { Link, Tooltip, PublicationsDrawer, OtTable, SectionItem, DirectionalityDrawer } from "ui";
import { epmcUrl } from "@ot/utils";
import { naLabel, PHARM_GKB_COLOR } from "@ot/constants";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck } from "@fortawesome/free-solid-svg-icons";
import { faCircleXmark } from "@fortawesome/free-regular-svg-icons";

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

type BodyProps = {
  id: string;
  entity: string;
};

function Body({ id, entity }: BodyProps) {
  const variables = { variantId: id };

  const theme = useTheme();
  const levelColors = {
    green: PHARM_GKB_COLOR.green,
    red: PHARM_GKB_COLOR.red,
    yellow: PHARM_GKB_COLOR.yellow,
    blue: theme.palette.primary.main,
  };
  const columns = [
    {
      id: "genotypeId",
      label: "Genotype ID",
      enableHiding: false,
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
      renderCell: ({ genotypeId }) => genotypeId || naLabel,
    },
    {
      id: "drugs",
      label: "Drug(s)",
      renderCell: ({ drugs }) => {
        const drugsInfo = drugs.filter(d => d.drugId || d.drugFromSource);
        if (!drugsInfo.length) return naLabel;
        return (
          <>
            {drugsInfo.map(({ drugId, drugFromSource }, i) => {
              const drugText = drugFromSource ? drugFromSource.toUpperCase() : drugId;
              return (
                <Fragment key={drugText}>
                  {i > 0 && ", "}
                  {drugId ? (
                    <Link asyncTooltip to={`/drug/${drugId}`}>
                      {drugText}
                    </Link>
                  ) : (
                    drugText
                  )}
                </Fragment>
              );
            })}
          </>
        );
      },
      filterValue: ({ drugs }) =>
        drugs.map(d => `${d.drugFromSource ?? ""} ${d.drugId ?? ""}`).join(" "),
    },
    {
      id: "genotypeAnnotationText",
      label: "Drug response phenotype",
      renderCell: ({ phenotypeText, phenotypeFromSourceId, genotypeAnnotationText }) => {
        if (!phenotypeText) return naLabel;
        let phenotypeTextElement = phenotypeText;
        if (phenotypeFromSourceId)
          phenotypeTextElement = (
            <Link asyncTooltip to={`/disease/${phenotypeFromSourceId}`}>
              {phenotypeTextElement}
            </Link>
          );
        if (genotypeAnnotationText)
          phenotypeTextElement = (
            <Tooltip style="" title={genotypeAnnotationText} showHelpIcon>
              {phenotypeTextElement}
            </Tooltip>
          );
        return phenotypeTextElement;
      },
      filterValue: ({ phenotypeText }) => phenotypeText,
    },
    {
      id: "pgxCategory",
      label: "Drug response category",
      renderCell: ({ pgxCategory }) => pgxCategory || naLabel,
      filterValue: ({ pgxCategory }) => pgxCategory,
    },
    {
      id: "target.approvedSymbol",
      label: "Gene",
      renderCell: ({ target }) => {
        if (!target) return naLabel;
        return (
          <Link asyncTooltip to={`/target/${target.id}`}>
            {target.approvedSymbol}
          </Link>
        );
      },
      filterValue: ({ target }) => target.approvedSymbol,
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
      label: "Direct drug target",
      renderCell: ({ isDirectTarget }) => {
        const ICON_NAME = isDirectTarget ? faCircleCheck : faCircleXmark;
        return <FontAwesomeIcon icon={ICON_NAME} size="lg" color={theme.palette.primary.main} />;
      },
    },
    {
      id: "evidenceLevel",
      label: "Confidence level",
      comparator: (a, b) => (b.evidenceLevel < a.evidenceLevel ? 1 : -1),
      sortable: true,
      tooltip: (
        <>
          As defined by
          <Link external to={`https://www.pharmgkb.org/page/clinAnnLevels`}>
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
        const literatureList =
          literature?.reduce((acc, id) => {
            if (id === "NA") return acc;
            return [
              ...acc,
              {
                name: id,
                url: epmcUrl(id),
                group: "literature",
              },
            ];
          }, []) || [];
        return <PublicationsDrawer entries={literatureList} />;
      },
    },
  ];

  const request = useQuery(PHARMACOGENOMICS_QUERY, {
    variables,
  });

  return (
    <SectionItem
      definition={definition}
      entity={entity}
      request={request}
      renderDescription={() => (
        <Description
          variantId={request.data?.variant.id}
          referenceAllele={request.data?.variant.referenceAllele}
          alternateAllele={request.data?.variant.alternateAllele}
        />
      )}
      renderBody={() => (
        <OtTable
          showGlobalFilter
          dataDownloader
          dataDownloaderFileStem={`${id}-pharmacogenetics-variant`}
          sortBy="evidenceLevel"
          columns={columns}
          rows={request.data?.variant.pharmacogenomics}
          query={PHARMACOGENOMICS_QUERY.loc.source.body}
          variables={variables}
          loading={request.loading}
        />
      )}
    />
  );
}

export default Body;
