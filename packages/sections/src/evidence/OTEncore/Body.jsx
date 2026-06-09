import classNames from "classnames";
import { useQuery } from "@apollo/client";
import { makeStyles } from "@mui/styles";
import { faArrowAltCircleUp, faArrowAltCircleDown } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
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
import { dataTypesMap, sectionsBaseSizeQuery } from "@ot/constants";

import ENCORE_QUERY from "./OTEncoreQuery.gql";

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
            <TooltipStyledLabel label="FDR" description={row.phenotypicConsequenceFDR} />
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
    id: "geneInteractionType",
    label: "Type of effect",
    filterValue: row => row.geneInteractionType,
  },
  {
    id: "geneticInteractionScore",
    label: "BLISS score",
    tooltip: <>We used the Bliss independence model to define synergy between gRNA pairs.</>,
    renderCell: row => row.geneticInteractionScore.toFixed(3),
    numeric: true,
  },
  {
    id: "geneticInteractionPValue",
    label: "P-value",
    renderCell: row => <ScientificNotation number={row.geneticInteractionPValue} />,
    numeric: true,
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
  {
    label: "phenotypicConsequencePValue",
    exportValue: row => row.phenotypicConsequencePValue,
  },
  {
    label: "phenotypicConsequenceFDR",
    exportValue: row => row.phenotypicConsequenceFDR,
  },
  // type of effect
  {
    label: "type of effect",
    exportValue: row => row.geneInteractionType,
  },
  {
    label: "BLISS score",
    exportValue: row => row.geneticInteractionScore.toFixed(3),
  },
  {
    label: "p value",
    exportValue: row => row.geneticInteractionPValue,
  },
  {
    label: "release version",
    exportValue: row => row.releaseVersion,
  },
];

function Body({ id, label, entity }) {
  const { ensgId, efoId } = id;
  const savedVariables = useReportQueryVariables();
  const variables = savedVariables || {
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
            sortBy="geneticInteractionPValue"
            order="asc"
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
