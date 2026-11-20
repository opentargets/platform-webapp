import {
  colorRange,
  InteractionSourceDatabase,
  type TargetInteractionsStringQuery,
  type TargetInteractionsStringQueryVariables,
} from "@ot/constants";
import { scaleQuantize } from "d3";
import type { CSSProperties } from "react";
import { GridLegacy, Legend, Link, type OtTableColumn, OtTableServer } from "ui";
import { typedDocument } from "../../utils/typedDocument";
import INTERACTIONS_QUERY_DOCUMENT from "./InteractionsStringQuery.gql";

const INTERACTIONS_QUERY = typedDocument<
  TargetInteractionsStringQuery,
  TargetInteractionsStringQueryVariables
>(INTERACTIONS_QUERY_DOCUMENT);

type StringInteractionRow = NonNullable<
  TargetInteractionsStringQuery["target"]
>["interactions"]["rows"][number];

// NOTE: OtTable doesn't read a `classes` prop at all (checked its full
// implementation - no such prop, at the table level or per-column), so most of
// this file's old makeStyles output (root, table, sortLabel, innerLabel,
// nameHeaderCell, headerCell, overallCell, cell, nameCell) was already dead:
// silently ignored. Only colorSpan and nameContainer were ever actually
// applied, since those render directly on <span> elements this component
// owns rather than being passed through OtTable's (nonexistent) classes prop.
const colorSpanStyle: CSSProperties = {
  display: "block",
  height: "20px",
  border: "1px solid #eeefef",
};
const nameContainerStyle: CSSProperties = {
  display: "block",
  textAlign: "end",
  textOverflow: "ellipsis",
  overflow: "hidden",
};

const id = InteractionSourceDatabase.String;
const PAGE_SIZE = 10;
const color = scaleQuantize<string>().domain([0, 1]).range(colorRange);

type StringEvidence = StringInteractionRow["evidences"][number];

const getScoreForColumn = (evidences: StringEvidence[], evidencesId: string) =>
  evidences
    .filter((e) => e.interactionDetectionMethodShortName === evidencesId)
    .map((e) => e.evidenceScore)[0]; // TODO: the [0] is to catch a data error: remove when fixed.
const getHeatmapCell = (score: number | null | undefined) => (
  <span
    title={score == null ? "No data" : String(score)}
    style={{ ...colorSpanStyle, backgroundColor: score == null ? undefined : color(score) }}
  />
);

function getColumns(): OtTableColumn<StringInteractionRow>[] {
  return [
    {
      id: "partner",
      label: <>Interactor B</>,
      renderCell: (row) => (
        <span style={nameContainerStyle}>
          {row.targetB ? (
            <Link asyncTooltip to={`/target/${row.targetB.id}`}>
              {row.targetB.approvedSymbol}
            </Link>
          ) : (
            <Link to={`http://uniprot.org/uniprot/${row.intB}`} external>
              {row.intB}
            </Link>
          )}
        </span>
      ),
      exportValue: (row) => row.targetB?.approvedSymbol || row.intB,
      filterValue: (row) => `${row.targetB?.approvedSymbol} ${row.intB}`,
    },
    {
      id: "overallScore",
      label: (
        <>
          Overall
          <br />
          interaction score
        </>
      ),
      renderCell: (row) => row.score?.toFixed(3) ?? "",
      exportValue: (row) => row.score?.toFixed(3) ?? "",
      filterValue: (row) => row.score?.toFixed(3) ?? "",
    },
    {
      id: "neighbourhood",
      label: "Neighbourhood",
      renderCell: (row) => getHeatmapCell(getScoreForColumn(row.evidences, "neighborhood")),
      exportValue: (row) => getScoreForColumn(row.evidences, "neighborhood")?.toFixed(3),
      filterValue: (row) => getScoreForColumn(row.evidences, "neighborhood")?.toFixed(3),
    },
    {
      id: "geneFusion",
      label: "Gene fusion",
      renderCell: (row) => getHeatmapCell(getScoreForColumn(row.evidences, "fusion")),
      exportValue: (row) => getScoreForColumn(row.evidences, "fusion")?.toFixed(3),
      filterValue: (row) => getScoreForColumn(row.evidences, "fusion")?.toFixed(3),
    },
    {
      id: "occurance",
      label: "Co-occurrance",
      renderCell: (row) => getHeatmapCell(getScoreForColumn(row.evidences, "cooccurence")),
      exportValue: (row) => getScoreForColumn(row.evidences, "cooccurence")?.toFixed(3),
      filterValue: (row) => getScoreForColumn(row.evidences, "cooccurence")?.toFixed(3),
    },
    {
      id: "expression",
      label: "Co-expression",
      renderCell: (row) => getHeatmapCell(getScoreForColumn(row.evidences, "coexpression")),
      exportValue: (row) => getScoreForColumn(row.evidences, "coexpression")?.toFixed(3),
      filterValue: (row) => getScoreForColumn(row.evidences, "coexpression")?.toFixed(3),
    },
    {
      id: "experiments",
      label: "Experiments",
      renderCell: (row) => getHeatmapCell(getScoreForColumn(row.evidences, "experimental")),
      exportValue: (row) => getScoreForColumn(row.evidences, "experimental")?.toFixed(3),
      filterValue: (row) => getScoreForColumn(row.evidences, "experimental")?.toFixed(3),
    },
    {
      id: "databases",
      label: "Databases",
      renderCell: (row) => getHeatmapCell(getScoreForColumn(row.evidences, "database")),
      exportValue: (row) => getScoreForColumn(row.evidences, "database")?.toFixed(3),
      filterValue: (row) => getScoreForColumn(row.evidences, "database")?.toFixed(3),
    },
    {
      id: "textMining",
      label: "Text mining",
      renderCell: (row) => getHeatmapCell(getScoreForColumn(row.evidences, "textmining")),
      exportValue: (row) => getScoreForColumn(row.evidences, "textmining")?.toFixed(3),
      filterValue: (row) => getScoreForColumn(row.evidences, "textmining")?.toFixed(3),
    },
    {
      id: "homology",
      label: "Homology",
      renderCell: (row) => getHeatmapCell(getScoreForColumn(row.evidences, "homology")),
      exportValue: (row) => getScoreForColumn(row.evidences, "homology")?.toFixed(3),
      filterValue: (row) => getScoreForColumn(row.evidences, "homology")?.toFixed(3),
    },
  ];
}

function StringTab({ ensgId, symbol }: { ensgId: string; symbol: string }) {
  const columns = getColumns();

  return (
    <GridLegacy container spacing={4}>
      <GridLegacy item xs={12}>
        {/* table 1: this is the only table and will need to be a HEATMAP */}
        <OtTableServer<StringInteractionRow>
          columns={columns}
          query={INTERACTIONS_QUERY}
          variables={{ ensgId, sourceDatabase: id }}
          dataPath="target.interactions"
          pageSize={PAGE_SIZE}
          dataDownloader
          dataDownloaderFileStem={`${symbol}-molecular-interactions-string`}
        />
        <Legend url="https://string-db.org/cgi/info" />
      </GridLegacy>
    </GridLegacy>
  );
}

export default StringTab;
