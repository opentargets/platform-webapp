import { useState } from "react";
import { useQuery } from "@apollo/client";
import { Typography } from "@mui/material";
import { makeStyles } from "@mui/styles";
import _ from "lodash";
import { Link, SectionItem, PaginationActionsComplete, Table, useBatchDownloader } from "ui";

import { definition } from ".";
import Description from "./Description";

import ADVERSE_EVENTS_QUERY from "./AdverseEventsQuery.gql";

const useStyles = makeStyles(theme => ({
  levelBarContainer: {
    display: "flex",
    alignItems: "center",
  },
  levelBar: {
    backgroundColor: theme.palette.primary.main,
    borderRight: `1px solid ${theme.palette.primary.main}`,
    height: "10px",
    marginRight: "5px",
  },
}));

const getColumns = (critVal, maxLlr, classes) => [
  {
    id: "name",
    label: "Adverse event (MedDRA)",
    renderCell: d =>
      d.meddraCode ? (
        <Link to={`https://identifiers.org/meddra:${d.meddraCode}`} external>
          <Typography variant="body2" noWrap display="block" title={_.upperFirst(d.name)}>
            {_.upperFirst(d.name)}
          </Typography>
        </Link>
      ) : (
        _.upperFirst(d.name)
      ),
    width: "30%",
  },
  {
    id: "count",
    label: "Number of reported events",
    numeric: true,
    width: "25%",
  },
  {
    id: "llr",
    label: `Log likelihood ratio (CV = ${critVal.toFixed(2)})`,
    renderCell: d => {
      const w = ((d.logLR / maxLlr) * 85).toFixed(2); // scale to max 85% of the width to allows space for label
      return (
        <div className={classes.levelBarContainer}>
          <div
            className={classes.levelBar}
            style={{
              width: `${w}%`,
            }}
          />
          <div>{d.logLR.toFixed(2)}</div>
        </div>
      );
    },
    exportValue: d => d.logLR.toFixed(2),
    width: "45%",
  },
];

type Props = {
  id: string;
  entity: string;
  label: string;
};

function Body({ id: chemblId, label: name, entity }: Props) {
  const classes = useStyles();
  const variables = { chemblId };
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const { loading, error, data, fetchMore } = useQuery(ADVERSE_EVENTS_QUERY, {
    variables,
  });

  // TODO: fetchMore doesn't seem to use gql/apollo caching
  // but a new query causes flickering when rendering the table
  function getData(newPage, size) {
    fetchMore({
      variables: {
        index: newPage,
        size,
      },
      updateQuery: (prev, { fetchMoreResult }) => fetchMoreResult,
    });
  }

  const handlePageChange = newPage => {
    setPage(newPage);
    getData(newPage, pageSize);
  };

  function handleRowsPerPageChange(newSize) {
    setPageSize(newSize);
    setPage(0);
    getData(0, newSize);
  }

  const getAllAdverseEvents = useBatchDownloader(
    ADVERSE_EVENTS_QUERY,
    variables,
    "data.drug.adverseEvents"
  );

  return (
    <SectionItem
      definition={definition}
      request={{ loading, error, data }}
      entity={entity}
      showContentLoading={true}
      renderDescription={() => <Description name={name} />}
      renderBody={() => {
        // TODO: Change GraphQL schema to have a maxLlr field instead of having
        // to get the first item of adverse events to get the largest llr since
        // items are sorted in decreasing llr order.
        const maxLlr = data?.drug.maxLlr.rows[0].logLR;
        const { criticalValue, rows, count } = data?.drug.adverseEvents;

        return (
          <Table
            dataDownloader
            dataDownloaderRows={getAllAdverseEvents}
            dataDownloaderFileStem={`${name}-adverse-events`}
            loading={loading}
            columns={getColumns(criticalValue, maxLlr, classes)}
            rows={rows}
            rowCount={count}
            page={page}
            onPageChange={handlePageChange}
            ActionsComponent={PaginationActionsComplete}
            fixed
            pageSize={pageSize}
            rowsPerPageOptions={[10, 25, 50, 100]}
            onRowsPerPageChange={newSize => handleRowsPerPageChange(newSize)}
            query={ADVERSE_EVENTS_QUERY.loc.source.body}
            variables={variables}
          />
        );
      }}
    />
  );
}

export default Body;
