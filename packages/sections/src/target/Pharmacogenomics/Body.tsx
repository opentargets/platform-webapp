import { useQuery } from "@apollo/client";
import classNames from "classnames";
import { makeStyles } from "@mui/styles";
import {
  SectionItem,
  Link,
  Tooltip,
  LabelChip,
  PublicationsDrawer,
  OtTable,
  DirectionalityDrawer,
} from "ui";

import { epmcUrl, identifiersOrgLink, sentenceCase } from "@ot/utils";
import { naLabel, PHARM_GKB_COLOR, variantConsequenceSource, TargetBodyProps} from "@ot/constants";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck } from "@fortawesome/free-solid-svg-icons";
import { faCircleXmark } from "@fortawesome/free-regular-svg-icons";
import { Box } from "@mui/material";

import { definition } from ".";
import Description from "./Description";
import PHARMACOGENOMICS_QUERY from "./Pharmacogenomics.gql";

const useStyles = makeStyles(theme => ({
  level: {
    color: "white",
    padding: theme.spacing(0.5),
    borderRadius: theme.spacing(0.5),
  },
  green: {
    background: PHARM_GKB_COLOR.green,
  },
  red: {
    background: PHARM_GKB_COLOR.red,
  },
  yellow: {
    background: PHARM_GKB_COLOR.yellow,
  },
  blue: {
    background: theme.palette.primary.main,
  },
  blueIcon: {
    color: theme.palette.primary.main,
  },
}));

const getLevelElementClassName = level => {
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

function getColumns(classes) {
  return [
    {
      id: "variantRsId",
      label: "rsID",
      enableHiding: false,
      renderCell: ({ variantRsId }) =>
        variantRsId ? (
          <Link
            external
            to={`http://www.ensembl.org/Homo_sapiens/Variation/Explore?v=${variantRsId}`}
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
      renderCell: ({ genotypeId }) => genotypeId || naLabel,
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
                value={sentenceCase(variantFunctionalConsequence.label)}
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
        `${sentenceCase(variantFunctionalConsequence?.label)}`,
    },
    {
      id: "drug",
      label: "Drug(s)",
      renderCell: ({ drugs }) => {
        if (!drugs || drugs.length <= 0) return naLabel;

        return drugs.map((el, index) => {
          if (el.drugId)
            return (
              <Box sx={{ display: "inline" }} key={index}>
                {index > 0 && <Box sx={{ pr: 0.5, display: "inline " }}>,</Box>}
                <Link asyncTooltip to={`/drug/${el.drugId}`}>
                  {el.drugFromSource || el.drugId}
                </Link>
              </Box>
            );
          else return el.drugFromSource || el.drugId;
        });
      },
      filterValue: ({ drugId, drugFromSource }) => `${drugFromSource} ${drugId}`,
    },
    {
      id: "drugResponse",
      label: "Drug Response Phenotype",
      renderCell: ({ phenotypeText = naLabel, phenotypeFromSourceId, genotypeAnnotationText }) => {
        let phenotypeTextElement;

        if (phenotypeText) {
          phenotypeTextElement = phenotypeText;
        } else phenotypeTextElement = naLabel;

        if (phenotypeFromSourceId)
          phenotypeTextElement = (
            <Link to={`/disease/${phenotypeFromSourceId}`}>{phenotypeTextElement}</Link>
          );

        if (genotypeAnnotationText)
          phenotypeTextElement = (
            <Tooltip title={genotypeAnnotationText} showHelpIcon>
              {phenotypeTextElement}
            </Tooltip>
          );

        return phenotypeTextElement;
      },
      filterValue: ({ phenotypeText }) => `${phenotypeText}`,
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
        return <FontAwesomeIcon icon={ICON_NAME} size="lg" className={classes.blueIcon} />;
      },
    },
    {
      id: "evidenceLevel",
      label: "Confidence Level",
      comparator: (a, b) => (b.evidenceLevel < a.evidenceLevel ? 1 : -1),
      sortable: true,
      tooltip: (
        <>
          As defined by
          <Link external to={`https://www.pharmgkb.org/page/clinAnnLevels`}>
            {" "}
            PharmGKB ClinAnn Levels
          </Link>
        </>
      ),
      renderCell: ({ evidenceLevel }) => {
        if (evidenceLevel) {
          const levelClass = getLevelElementClassName(evidenceLevel);
          return (
            <span className={classNames(classes.level, classes[levelClass])}>
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
}

type Props = TargetBodyProps;

function Body({ id: ensemblId, label: symbol, entity }: Props) {
  const classes = useStyles();
  const columns = getColumns(classes);
  const variables = { ensemblId };
  const request = useQuery(PHARMACOGENOMICS_QUERY, {
    variables,
  });

  return (
    <SectionItem
      definition={definition}
      entity={entity}
      request={request}
      renderDescription={() => <Description symbol={symbol} />}
      renderBody={() => (
        <OtTable
          showGlobalFilter
          dataDownloader
          dataDownloaderFileStem={`${ensemblId}-pharmacogenomics-${entity}`}
          sortBy="evidenceLevel"
          columns={columns}
          rows={request.data?.target.pharmacogenomics}
          query={PHARMACOGENOMICS_QUERY.loc.source.body}
          variables={variables}
          loading={request.loading}
        />
      )}
    />
  );
}

export default Body;
