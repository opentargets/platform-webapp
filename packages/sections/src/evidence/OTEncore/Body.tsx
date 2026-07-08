import classNames from "classnames";
import { useQuery } from "@apollo/client";
import { makeStyles } from "@mui/styles";
import { faArrowAltCircleUp, faArrowAltCircleDown } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, Chip } from "@mui/material";
import { v1 } from "uuid";
import {
  Link,
  SectionItem,
  Tooltip,
  TooltipStyledLabel,
  ChipList,
  OtTable,
  ScientificNotation,
} from "ui";

import { definition } from ".";
import Description from "./Description";
import { dataTypesMap, sectionsBaseSizeQuery, EvidenceBodyProps} from "@ot/constants";

import ENCORE_QUERY from "./OTEncoreQuery.gql";

export const methodDisplayNameMapping = {
  CTG: "CellTiterGlo",
  CellTox: "CellTox",
  Confluence: "Cell Confluence",
};

const useStyles = makeStyles(theme => ({
  primaryColor: {
    color: theme.palette.primary.main,
    cursor: "pointer",
  },
  grey: {
    color: theme.palette.grey[300],
  },
  circleUp: {
    marginRight: "10px",
  },
  hsWhite: {
    backgroundColor: "#ffffff !important",
    color: `${theme.palette.grey[600]} !important`,
    border: `1px solid ${theme.palette.grey[600]} !important`,
  },
}));

const getColumns = classes => [
  {
    id: "disease",
    label: "Reported disease",
    renderCell: row => (
      <Link asyncTooltip to={`/disease/${row.disease.id}`}>
        {row.disease.name}
      </Link>
    ),
    filterValue: row => `${row.disease.name}, ${row.disease.id}`,
  },
  {
    id: "target",
    label: "Library gene",
    renderCell: row => <Link to={`/target/${row.target.id}`}>{row.target.approvedSymbol}</Link>,
    filterValue: row => `${row.target.approvedSymbol}, ${row.target.id}`,
  },
  {
    id: "interactingTargetFromSourceId",
    label: "Anchor gene",
    enableHiding: false,
    sortable: true,
  },
  {
    id: "cellType",
    label: "Cell line",
    renderCell: row =>
      row.diseaseCellLines.map(diseaseCellLine => (
        <Link
          external
          to={`https://cellmodelpassports.sanger.ac.uk/passports/${diseaseCellLine.id}`}
          key={diseaseCellLine.id}
        >
          {diseaseCellLine.name}
        </Link>
      )),
  },
  {
    id: "biomarkerList",
    label: "Cell line biomarkers",
    renderCell: row => (
      <ChipList
        small
        items={row.biomarkerList.map(bm => ({
          label: bm.name,
          tooltip: bm.description,
          customClass: classes.hsWhite,
        }))}
      />
    ),
  },
  {
    id: "releaseVersion",
    label: "Release version",
  },
  {
    id: "phenotypicConsequenceLogFoldChange",
    label: "Cell count logFC",
    tooltip: (
      <>When a negative log fold change is measured, it means there is an excess of cell death.</>
    ),
    renderCell: row => (
      <Tooltip
        title={
          <>
            <TooltipStyledLabel
              label="Log-fold change"
              description={row.phenotypicConsequenceLogFoldChange}
            />
            <TooltipStyledLabel label="P-value" description={row.phenotypicConsequencePValue} />
          </>
        }
      >
        <span>
          <FontAwesomeIcon
            icon={faArrowAltCircleUp}
            size="lg"
            className={classNames(
              row.phenotypicConsequenceLogFoldChange >= 0 ? classes.primaryColor : classes.grey,
              classes.circleUp
            )}
          />
          <FontAwesomeIcon
            icon={faArrowAltCircleDown}
            size="lg"
            className={
              row.phenotypicConsequenceLogFoldChange < 0 ? classes.primaryColor : classes.grey
            }
          />
        </span>
      </Tooltip>
    ),
  },
  {
    id: "geneticInteractionType",
    label: "Type of effect",
    filterValue: row => row.geneticInteractionType,
  },
  {
    id: "geneticInteractionScore",
    label: "HSA z-score",
    tooltip: <>We used z-normalised HSA to represent synergy between gene pairs.</>,
    renderCell: row => row.geneticInteractionScore.toFixed(3),
    numeric: true,
  },
  {
    id: "validationLabAssessment",
    label: "Validation Lab Assessment",
    sortable: true,
    comparator: (a, b) => {
      const getScore = o => {
        return (o.validationReadouts ?? [])
          .map(({ isValidated }) => isValidated ? 1 : 0.1)
          .reduce((a, b) => a + b, 0);
      }
      return getScore(a) - getScore(b);
    },
    filterValue: ({ validationReadouts = [] }) => {
      return validationReadouts.map(({ readoutMethodName }) => {
        return methodDisplayNameMapping[readoutMethodName];
      }).join();
    },
    renderCell: ({ validationReadouts }) => {
      if (!validationReadouts?.length) return "not screened";
      const sortedReadouts = validationReadouts.toSorted((a, b) => {
        return methodDisplayNameMapping[a.readoutMethodName].localeCompare(
          methodDisplayNameMapping[b.readoutMethodName]);
      });
      return (
        <>
          {sortedReadouts.map(({ readoutMethodName, screen, isValidated }) => (
            <Box sx={{ my: theme => theme.spacing(0.3) }} key={v1()}>
              <Tooltip title={`Screen: ${screen}`}>
                <Chip
                  label={methodDisplayNameMapping[readoutMethodName]}
                  size="small"
                  color={isValidated ? "primary" : "default"}
                />
              </Tooltip>
            </Box>
          ))}
        </>
      );
    },
  },
];

const exportColumns = [
  {
    label: "disease",
    exportValue: row => row.disease.name,
  },
  {
    label: "disease id",
    exportValue: row => row.disease.id,
  },
  // genes
  {
    label: "library gene",
    exportValue: row => row.target.approvedSymbol,
  },
  {
    label: "libarary gene id",
    exportValue: row => row.target.id,
  },
  {
    label: "anchor gene",
    exportValue: row => row.interactingTargetFromSourceId,
  },
  // cell lines and biomarkers
  {
    label: "cell line",
    exportValue: row =>
      row.diseaseCellLines.map(diseaseCellLine => diseaseCellLine.name).join(", "),
  },
  {
    label: "cell line id",
    exportValue: row => row.diseaseCellLines.map(diseaseCellLine => diseaseCellLine.id).join(", "),
  },
  {
    label: "cell line biomarkers",
    exportValue: row => row.biomarkerList.map(bm => bm.name).join(","),
  },
  // cell count logFC and values in tooltip
  {
    label: "direction of effect",
    exportValue: row => (row.phenotypicConsequenceLogFoldChange >= 0 ? "up" : "down"),
  },
  {
    label: "phenotypicConsequenceLogFoldChange",
    exportValue: row => row.phenotypicConsequenceLogFoldChange,
  },
  // type of effect
  {
    label: "type of effect",
    exportValue: row => row.geneticInteractionType,
  },
  {
    label: "HSA z-score",
    exportValue: row => row.geneticInteractionScore.toFixed(3),
  },
  {
    label: "release version",
    exportValue: row => row.releaseVersion,
  },
  {
    label: "validation lab assessment",
    exportValue: row => row.validationReadouts.map(row => {
      return `${methodDisplayNameMapping[row.readoutMethodName]}: ${row.isValidated}`;
    }).join(", "),
  }
];

type Props = EvidenceBodyProps;
  entity: string;
  label: { symbol: string; name: string };
};

function Body({ id, label, entity }: Props) {
  const { ensgId, efoId } = id;
  const variables = {
    ensemblId: ensgId,
    efoId,
    size: sectionsBaseSizeQuery,
  };

  const request = useQuery(ENCORE_QUERY, {
    variables,
  });
  const classes = useStyles();

  return (
    <SectionItem
      definition={definition}
      chipText={dataTypesMap.ot_partner}
      request={request}
      entity={entity}
      renderDescription={() => <Description symbol={label.symbol} name={label.name} />}
      renderBody={() => {
        return (
          <OtTable
            columns={getColumns(classes)}
            rows={request.data?.disease.otEncoreSummary.rows}
            dataDownloader
            dataDownloaderColumns={exportColumns}
            dataDownloaderFileStem={`${ensgId}-${efoId}-otencore`}
            showGlobalFilter
            sortBy="validationLabAssessment"
            order="desc"
            fixed
            noWrap={false}
            noWrapHeader={false}
            query={ENCORE_QUERY.loc.source.body}
            variables={variables}
            loading={request.loading}
          />
        );
      }}
    />
  );
}

export default Body;
