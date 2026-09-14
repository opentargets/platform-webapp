import type { CSSProperties } from "react";
import { useState, useEffect } from "react";
import { scaleQuantize } from "d3";
import { Link, Legend, OtTable, useApolloClient, GridLegacy } from "ui";
import { colorRange } from "@ot/constants";

import INTERACTIONS_QUERY from "./InteractionsStringQuery.gql";

const getData = (query, ensgId, sourceDatabase, index, size, client) =>
  client.query({
    query,
    variables: {
      ensgId,
      sourceDatabase,
      index,
      size,
    },
  });

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

const id = "string";
const index = 0;
const size = 3000;
const color = scaleQuantize().domain([0, 1]).range(colorRange);

const getScoreForColumn = (evidences, evidencesId) =>
  evidences
    .filter(e => e.interactionDetectionMethodShortName === evidencesId)
    .map(e => e.evidenceScore)[0]; // TODO: the [0] is to catch a data error: remove when fixed.
const getHeatmapCell = score => (
  <span title={score || "No data"} style={{ ...colorSpanStyle, backgroundColor: color(score) }} />
);

function getColumns() {
  return [
    {
      id: "partner",
      label: <>Interactor B</>,
      renderCell: row => (
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
      exportValue: row => row.targetB?.approvedSymbol || row.intB,
      filterValue: row => `${row.targetB?.approvedSymbol} ${row.intB}`,
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
      renderCell: row => row.score.toFixed(3),
      exportValue: row => row.score.toFixed(3),
      filterValue: row => row.score.toFixed(3),
    },
    {
      id: "neighbourhood",
      label: "Neighbourhood",
      renderCell: row => getHeatmapCell(getScoreForColumn(row.evidences, "neighborhood")),
      exportValue: row => getScoreForColumn(row.evidences, "neighborhood")?.toFixed(3),
      filterValue: row => getScoreForColumn(row.evidences, "neighborhood")?.toFixed(3),
    },
    {
      id: "geneFusion",
      label: "Gene fusion",
      renderCell: row => getHeatmapCell(getScoreForColumn(row.evidences, "fusion")),
      exportValue: row => getScoreForColumn(row.evidences, "fusion")?.toFixed(3),
      filterValue: row => getScoreForColumn(row.evidences, "fusion")?.toFixed(3),
    },
    {
      id: "occurance",
      label: "Co-occurrance",
      renderCell: row => getHeatmapCell(getScoreForColumn(row.evidences, "cooccurence")),
      exportValue: row => getScoreForColumn(row.evidences, "cooccurence")?.toFixed(3),
      filterValue: row => getScoreForColumn(row.evidences, "cooccurence")?.toFixed(3),
    },
    {
      id: "expression",
      label: "Co-expression",
      renderCell: row => getHeatmapCell(getScoreForColumn(row.evidences, "coexpression")),
      exportValue: row => getScoreForColumn(row.evidences, "coexpression")?.toFixed(3),
      filterValue: row => getScoreForColumn(row.evidences, "coexpression")?.toFixed(3),
    },
    {
      id: "experiments",
      label: "Experiments",
      renderCell: row => getHeatmapCell(getScoreForColumn(row.evidences, "experimental")),
      exportValue: row => getScoreForColumn(row.evidences, "experimental")?.toFixed(3),
      filterValue: row => getScoreForColumn(row.evidences, "experimental")?.toFixed(3),
    },
    {
      id: "databases",
      label: "Databases",
      renderCell: row => getHeatmapCell(getScoreForColumn(row.evidences, "database")),
      exportValue: row => getScoreForColumn(row.evidences, "database")?.toFixed(3),
      filterValue: row => getScoreForColumn(row.evidences, "database")?.toFixed(3),
    },
    {
      id: "textMining",
      label: "Text mining",
      renderCell: row => getHeatmapCell(getScoreForColumn(row.evidences, "textmining")),
      exportValue: row => getScoreForColumn(row.evidences, "textmining")?.toFixed(3),
      filterValue: row => getScoreForColumn(row.evidences, "textmining")?.toFixed(3),
    },
    {
      id: "homology",
      label: "Homology",
      renderCell: row => getHeatmapCell(getScoreForColumn(row.evidences, "homology")),
      exportValue: row => getScoreForColumn(row.evidences, "homology")?.toFixed(3),
      filterValue: row => getScoreForColumn(row.evidences, "homology")?.toFixed(3),
    },
  ];
}

function StringTab({ ensgId, symbol }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const columns = getColumns();
  const client = useApolloClient();
  // load tab data when new tab selected (also on first load)
  useEffect(() => {
    setLoading(true);
    getData(INTERACTIONS_QUERY, ensgId, id, index, size, client).then(res => {
      if (res.data.target.interactions) {
        setLoading(false);
        setData(res.data.target.interactions.rows);
      }
    });
  }, [ensgId]);

  return (
    <GridLegacy container spacing={4}>
      <GridLegacy item xs={12}>
        {/* table 1: this is the only table and will need to be a HEATMAP */}
        <OtTable
          showGlobalFilter
          columns={columns}
          rows={data}
          dataDownloader
          dataDownloaderFileStem={`${symbol}-molecular-interactions-string`}
          fixed
          loading={loading}
        />
        <Legend url="https://string-db.org/cgi/info" />
      </GridLegacy>
    </GridLegacy>
  );
}

export default StringTab;
