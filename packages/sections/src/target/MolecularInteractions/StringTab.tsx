import { useState, useEffect } from "react";
import { makeStyles } from "@mui/styles";
import { Grid } from "@mui/material";
import { scaleQuantize } from "d3";
import { Link, Legend, OtTable, useApolloClient } from "ui";
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

const useStyles = makeStyles({
  root: {
    overflow: "visible",
    padding: "2rem 3rem 0 0 !important",
  },
  table: {
    tableLayout: "fixed !important",
  },
  sortLabel: {
    top: "8px",
  },
  innerLabel: {
    position: "absolute",
    display: "inline-block",
    transformOrigin: "-20px 20px",
    bottom: 0,
    transform: "rotate(315deg)",
    marginBottom: "5px",
  },
  nameHeaderCell: {
    width: "15%",
    borderBottom: "0 !important",
    height: "140px !important",
    verticalAlign: "bottom !important",
    textAlign: "end !important",
    padding: "1rem 0.5rem !important",
    paddingBottom: ".4rem",
  },
  headerCell: {
    position: "relative",
    borderBottom: "0 !important",
    height: "140px !important",
    whiteSpace: "nowrap",
    textAlign: "center !important",
    verticalAlign: "bottom !important",
    padding: "1rem 0.5rem !important",
  },
  overallCell: {
    border: "0 !important",
    textAlign: "center !important",
    paddingTop: "1px !important",
    paddingBottom: "1px !important",
    paddingLeft: "1px !important",
    paddingRight: "10px !important",
  },
  cell: {
    border: "0 !important",
    height: "20px !important",
    textAlign: "center !important",
    padding: "1px 1px !important",
    "&:last-child": {
      paddingRight: 0,
    },
  },
  colorSpan: {
    display: "block",
    height: "20px",
    border: "1px solid #eeefef",
  },
  nameCell: {
    border: "0 !important",
    // width: '20%',
    padding: "0 0.5rem 0 0 !important",
    "&:first-child": {
      paddingLeft: "0 !important",
    },
  },
  nameContainer: {
    display: "block",
    textAlign: "end !important",
    textOverflow: "ellipsis",
    overflow: "hidden",
  },
});

const id = "string";
const index = 0;
const size = 3000;
const color = scaleQuantize().domain([0, 1]).range(colorRange);

const getScoreForColumn = (evidences, evidencesId) =>
  evidences
    .filter(e => e.interactionDetectionMethodShortName === evidencesId)
    .map(e => e.evidenceScore)[0]; // TODO: the [0] is to catch a data error: remove when fixed.
const getHeatmapCell = (score, classes) => (
  <span
    className={classes.colorSpan}
    title={score || "No data"}
    style={{ backgroundColor: color(score) }}
  />
);

function getColumns(classes) {
  return [
    {
      id: "partner",
      label: <>Interactor B</>,
      classes: {
        headerCell: classes.nameHeaderCell,
        cell: classes.nameCell,
      },
      renderCell: row => (
        <span className={classes.nameContainer}>
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
      classes: {
        headerCell: classes.headerCell,
        cell: classes.cell,
        sortLabel: classes.sortLabel,
        innerLabel: classes.innerLabel,
      },
      renderCell: row => row.score.toFixed(3),
      exportValue: row => row.score.toFixed(3),
      filterValue: row => row.score.toFixed(3),
    },
    {
      id: "neighbourhood",
      label: "Neighbourhood",
      classes: {
        headerCell: classes.headerCell,
        cell: classes.cell,
        sortLabel: classes.sortLabel,
        innerLabel: classes.innerLabel,
      },
      renderCell: row => getHeatmapCell(getScoreForColumn(row.evidences, "neighborhood"), classes),
      exportValue: row => getScoreForColumn(row.evidences, "neighborhood")?.toFixed(3),
      filterValue: row => getScoreForColumn(row.evidences, "neighborhood")?.toFixed(3),
    },
    {
      id: "geneFusion",
      label: "Gene fusion",
      classes: {
        headerCell: classes.headerCell,
        cell: classes.cell,
        sortLabel: classes.sortLabel,
        innerLabel: classes.innerLabel,
      },
      renderCell: row => getHeatmapCell(getScoreForColumn(row.evidences, "fusion"), classes),
      exportValue: row => getScoreForColumn(row.evidences, "fusion")?.toFixed(3),
      filterValue: row => getScoreForColumn(row.evidences, "fusion")?.toFixed(3),
    },
    {
      id: "occurance",
      label: "Co-occurrance",
      classes: {
        headerCell: classes.headerCell,
        cell: classes.cell,
        sortLabel: classes.sortLabel,
        innerLabel: classes.innerLabel,
      },
      renderCell: row => getHeatmapCell(getScoreForColumn(row.evidences, "cooccurence"), classes),
      exportValue: row => getScoreForColumn(row.evidences, "cooccurence")?.toFixed(3),
      filterValue: row => getScoreForColumn(row.evidences, "cooccurence")?.toFixed(3),
    },
    {
      id: "expression",
      label: "Co-expression",
      classes: {
        headerCell: classes.headerCell,
        cell: classes.cell,
        sortLabel: classes.sortLabel,
        innerLabel: classes.innerLabel,
      },
      renderCell: row => getHeatmapCell(getScoreForColumn(row.evidences, "coexpression"), classes),
      exportValue: row => getScoreForColumn(row.evidences, "coexpression")?.toFixed(3),
      filterValue: row => getScoreForColumn(row.evidences, "coexpression")?.toFixed(3),
    },
    {
      id: "experiments",
      label: "Experiments",
      classes: {
        headerCell: classes.headerCell,
        cell: classes.cell,
        sortLabel: classes.sortLabel,
        innerLabel: classes.innerLabel,
      },
      renderCell: row => getHeatmapCell(getScoreForColumn(row.evidences, "experimental"), classes),
      exportValue: row => getScoreForColumn(row.evidences, "experimental")?.toFixed(3),
      filterValue: row => getScoreForColumn(row.evidences, "experimental")?.toFixed(3),
    },
    {
      id: "databases",
      label: "Databases",
      classes: {
        headerCell: classes.headerCell,
        cell: classes.cell,
        sortLabel: classes.sortLabel,
        innerLabel: classes.innerLabel,
      },
      renderCell: row => getHeatmapCell(getScoreForColumn(row.evidences, "database"), classes),
      exportValue: row => getScoreForColumn(row.evidences, "database")?.toFixed(3),
      filterValue: row => getScoreForColumn(row.evidences, "database")?.toFixed(3),
    },
    {
      id: "textMining",
      label: "Text mining",
      classes: {
        headerCell: classes.headerCell,
        cell: classes.cell,
        sortLabel: classes.sortLabel,
        innerLabel: classes.innerLabel,
      },
      renderCell: row => getHeatmapCell(getScoreForColumn(row.evidences, "textmining"), classes),
      exportValue: row => getScoreForColumn(row.evidences, "textmining")?.toFixed(3),
      filterValue: row => getScoreForColumn(row.evidences, "textmining")?.toFixed(3),
    },
    {
      id: "homology",
      label: "Homology",
      classes: {
        headerCell: classes.headerCell,
        cell: classes.cell,
        sortLabel: classes.sortLabel,
        innerLabel: classes.innerLabel,
      },
      renderCell: row => getHeatmapCell(getScoreForColumn(row.evidences, "homology"), classes),
      exportValue: row => getScoreForColumn(row.evidences, "homology")?.toFixed(3),
      filterValue: row => getScoreForColumn(row.evidences, "homology")?.toFixed(3),
    },
  ];
}

function StringTab({ ensgId, symbol }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const classes = useStyles();
  const columns = getColumns(classes);
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
    <Grid container spacing={4}>
      <Grid item xs={12}>
        {/* table 1: this is the only table and will need to be a HEATMAP */}
        <OtTable
          showGlobalFilter
          columns={columns}
          rows={data}
          dataDownloader
          dataDownloaderFileStem={`${symbol}-molecular-interactions-string`}
          fixed
          classes={{ root: classes.root, table: classes.table }}
          loading={loading}
        />
        <Legend url="https://string-db.org/cgi/info" />
      </Grid>
    </Grid>
  );
}

export default StringTab;
