import classNames from "classnames";
import { useQuery } from "@apollo/client";
import { makeStyles } from "@mui/styles";
import {
  Link,
  SectionItem,
  Tooltip,
  LabelChip,
  PublicationsDrawer,
  OtTable,
  DirectionalityDrawer,
} from "ui";

import { epmcUrl, identifiersOrgLink, sentenceCase } from "@ot/utils";
import { definition } from ".";
import Description from "./Description";
import PHARMACOGENOMICS_QUERY from "./Pharmacogenomics.gql";
import { naLabel, PHARM_GKB_COLOR, variantConsequenceSource, DrugBodyProps, Pharmacogenomics } from "@ot/constants";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck } from "@fortawesome/free-solid-svg-icons";
import { faCircleXmark } from "@fortawesome/free-regular-svg-icons";

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
  const classes = useStyles();

  const columns = [
    {
      id: "gene",
      label: "Gene",
      renderCell: ({ target }: Pharmacogenomics) => {
        if (target) {
          return (
            <Link asyncTooltip to={`/target/${target.id}`}>
              <span>{target.approvedSymbol}</span>
            </Link>
          );
        }
        return naLabel;
      },
      filterValue: ({ target }: Pharmacogenomics) => `${target}`,
    },
    {
      id: "variantRsId",
      label: "rsID",
      enableHiding: false,
      renderCell: ({ variantRsId }: Pharmacogenomics) =>
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
      renderCell: ({ haplotypeId, haplotypeFromSourceId }: Pharmacogenomics) => {
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
      renderCell: ({ genotypeId }: Pharmacogenomics) => genotypeId || naLabel,
    },
    {
      id: "variantConsequence",
      label: "Variant Consequence",
      renderCell: ({ variantFunctionalConsequence, genotypeId }: Pharmacogenomics) => {
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
      filterValue: ({ variantFunctionalConsequence }: Pharmacogenomics) =>
        sentenceCase(variantFunctionalConsequence?.label),
    },
    {
      id: "drugResponse",
      label: "Drug Response Phenotype",
      renderCell: ({ phenotypeText, phenotypeFromSourceId, genotypeAnnotationText }: Pharmacogenomics) => {
        let phenotypeTextElement;

        if (phenotypeText) {
          phenotypeTextElement = phenotypeText;
        } else phenotypeTextElement = naLabel;

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
      filterValue: ({ phenotypeText }: Pharmacogenomics) => `${phenotypeText}`,
    },
    {
      id: "drugResponseCategory",
      label: "Drug Response Category",
      renderCell: ({ pgxCategory }: Pharmacogenomics) => pgxCategory || naLabel,
      filterValue: ({ pgxCategory }: Pharmacogenomics) => pgxCategory,
    },
    {
      id: "directionality",
      label: "Directionality",
      renderCell: ({ variantAnnotation }: Pharmacogenomics) => (
        <DirectionalityDrawer variantAnnotation={variantAnnotation} caption="Directionality" />
      ),
    },
    {
      id: "isDirectTarget",
      label: "Direct Drug Target",
      renderCell: ({ isDirectTarget }: Pharmacogenomics) => {
        const ICON_NAME = isDirectTarget ? faCircleCheck : faCircleXmark;
        return <FontAwesomeIcon icon={ICON_NAME} size="lg" className={classes.blueIcon} />;
      },
    },
    {
      id: "evidenceLevel",
      label: "Confidence Level",
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
      renderCell: ({ evidenceLevel }: Pharmacogenomics) => {
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
      filterValue: ({ evidenceLevel }: Pharmacogenomics) => `Level ${evidenceLevel}`,
    },
    {
      id: "source",
      label: "Source",
      renderCell: ({ studyId }: Pharmacogenomics) =>
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
      renderCell: ({ literature }: Pharmacogenomics) => {
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
      request={request}
      entity={entity}
      renderDescription={() => <Description name={name} />}
      renderBody={() => (
        <OtTable
          sortBy="evidenceLevel"
          showGlobalFilter
          dataDownloader
          dataDownloaderFileStem={`${chemblId}-pharmacogenomics`}
          columns={columns}
          rows={request.data?.drug.pharmacogenomics}
          query={PHARMACOGENOMICS_QUERY.loc.source.body}
          variables={variables}
          loading={request.loading}
        />
      )}
    />
  );
}

export default Body;
