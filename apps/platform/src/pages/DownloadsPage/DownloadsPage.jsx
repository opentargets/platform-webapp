import { useEffect, useReducer, useMemo, useCallback, useState } from "react";
import { gql, useQuery } from "@apollo/client";
import { Alert, Box, Typography } from "@mui/material";
import { makeStyles } from "@mui/styles";
import { Link, OtInvalidResultFilters } from "ui";
import { getConfig } from "@ot/config";
import DownloadsCard from "./DownloadsCard";
import DownloadsFilter from "./DownloadsFilter";
import DownloadsLoading from "./DownloadsLoading";
import { createInitialState, downloadsReducer, initialState } from "./context/downloadsReducer";
import { setDownloadsData, setError, setLoading } from "./context/downloadsActions";
import { DownloadsContext } from "./context/DownloadsContext";
import DownloadsTags from "./DownloadsTags";
import { Route, Routes } from "react-router-dom";
import DownloadsDialog from "./DownloadsDialog";
import { GraphVisualization, transformRecordSetToGraph } from "./graph";
import { useGridRowsHeight } from "./hooks/useGridRowsHeight";

const config = getConfig();

const useStyles = makeStyles(theme => ({
  alert: {
    marginBottom: theme.spacing(2),
  },
}));

// QUERY
const DOWNLOADS_QUERY = gql`
  query DownloadsQuery {
    meta {
      downloads
    }
  }
`;

function DownloadsPage() {
  const { data, loading, error } = useQuery(DOWNLOADS_QUERY);
  const [state, dispatch] = useReducer(downloadsReducer, initialState, createInitialState);
  const classes = useStyles();

  // The connection-filter (clicked graph node) - plain local state, since the
  // graph and card list are now a single page rather than separate views to
  // deep-link between.
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  // Cross-pane hover: hovering a card raises its node, hovering a node raises
  // its card's border. One id, since only one pane can be hovered at a time.
  // `hoveredSource` tracks which pane started the hover so the graph's own
  // connection-highlight only reacts to a card hover, not to a canvas hover
  // echoing back through this same state.
  const [hoveredId, setHoveredId] = useState(null);
  const [hoveredSource, setHoveredSource] = useState(null);

  const handleCardHoverChange = useCallback((hovering, id) => {
    setHoveredId(hovering ? id : null);
    setHoveredSource(hovering ? "card" : null);
  }, []);

  const handleNodeHoverChange = useCallback(id => {
    setHoveredId(id);
    setHoveredSource(id ? "node" : null);
  }, []);

  // Size the graph panel to match two rows of the cards grid, rather than
  // pinning it to the viewport - measured off the grid's actual rendered
  // children since card height isn't fixed (it grows with description length).
  const { containerRef: cardsGridRef, height: twoRowsHeight } = useGridRowsHeight(2);

  const handleViewConnections = useCallback(id => {
    setSelectedNodeId(id);
  }, []);

  const handleClearConnectionFilter = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  // Graph derived from the schema: degree (for the "N connections" chip) and
  // each node's neighbour set (dataset + everything it references or is
  // referenced by), used to build the connection-filter chip and to narrow
  // the card column when a graph node is clicked.
  const { degreeById, labelById, neighborsById } = useMemo(() => {
    const recordSets = (state.schemaRows || []).filter(rs => rs["@type"] === "cr:RecordSet");
    const { nodes, edges } = transformRecordSetToGraph(recordSets);
    const degreeById = new Map(nodes.map(n => [n.data.id, n.data.degree || 0]));
    const labelById = new Map(nodes.map(n => [n.data.id, n.data.label]));
    const neighborsById = new Map(nodes.map(n => [n.data.id, new Set([n.data.id])]));
    edges.forEach(e => {
      neighborsById.get(e.data.source)?.add(e.data.target);
      neighborsById.get(e.data.target)?.add(e.data.source);
    });
    return { degreeById, labelById, neighborsById };
  }, [state.schemaRows]);

  const connectionFilter = useMemo(() => {
    if (!selectedNodeId || !neighborsById.has(selectedNodeId)) return null;
    return {
      id: selectedNodeId,
      label: labelById.get(selectedNodeId) ?? selectedNodeId,
      count: neighborsById.get(selectedNodeId).size - 1,
    };
  }, [selectedNodeId, neighborsById, labelById]);

  // Cards to display: the usual search/category filters, further narrowed to
  // the clicked node + its neighbours when a connection filter is active - with
  // the clicked node's own card moved to the front so it's the top-left item.
  const cardsToShow = useMemo(() => {
    if (!connectionFilter) return state.filteredRows;
    const neighbors = neighborsById.get(connectionFilter.id);
    const filtered = state.filteredRows.filter(row => {
      const id = String(row["@id"]).replace("-fileset", "");
      return neighbors.has(id);
    });
    const selectedIndex = filtered.findIndex(
      row => String(row["@id"]).replace("-fileset", "") === connectionFilter.id
    );
    if (selectedIndex <= 0) return filtered;
    const [selectedRow] = filtered.splice(selectedIndex, 1);
    return [selectedRow, ...filtered];
  }, [state.filteredRows, connectionFilter, neighborsById]);

  useEffect(() => {
    if (loading) {
      dispatch(setLoading(true));
    } else if (error) {
      dispatch(setError(error));
    } else if (data?.meta?.downloads) {
      dispatch(setDownloadsData(JSON.parse(data.meta.downloads)));
    }
  }, [data, loading, error]);

  if (state.loading) return <DownloadsLoading />;

  return (
    <DownloadsContext.Provider value={{ state, dispatch }}>
      <>
        <Typography variant="h4" component="h1" paragraph>
          {state.downloadsData?.name}
        </Typography>
        <Typography paragraph>{state.downloadsData?.description}</Typography>

        {config.profile.isPartnerPreview ? (
          <Alert severity="info" className={classes.alert}>
            This table provides data file paths that have been integrated into the Open Targets
            Partner Preview Platform. This includes pre-publication data generated by the consortium
            combined with{" "}
            <Link
              external
              to="https://ftp.ebi.ac.uk/pub/databases/opentargets/platform/latest/output/"
            >
              {" "}
              publicly available datasets
            </Link>
            . Please contact{" "}
            <Link to={`mailto: ${config.profile.helpdeskEmail}`} external>
              {config.profile.helpdeskEmail}
            </Link>{" "}
            to access the following datasets.
          </Alert>
        ) : null}

        <DownloadsTags />

        <DownloadsFilter
          connectionFilter={connectionFilter}
          onClearConnectionFilter={handleClearConnectionFilter}
          resultCount={cardsToShow.length}
        />

        <Box
          sx={{
            display: "grid",
            // lg covers smaller laptop screens (e.g. a 14" MacBook, ~1200-1536px)
            // where the graph gets the larger 60% share; xl+ (larger monitors)
            // reverts to cards getting the larger 60% share.
            gridTemplateColumns: {
              xs: "1fr",
              lg: "minmax(320px, 2fr) minmax(420px, 3fr)",
              xl: "minmax(420px, 1.5fr) minmax(320px, 1fr)",
            },
            gap: 3,
            alignItems: "start",
          }}
        >
          <Box
            ref={cardsGridRef}
            sx={{
              display: "grid",
              // Narrower cards column on lg (smaller laptops) only fits 2 comfortably.
              gridTemplateColumns: {
                xs: "repeat(auto-fill, minmax(280px, 1fr))",
                lg: "repeat(2, minmax(0, 1fr))",
                xl: "repeat(auto-fill, minmax(280px, 1fr))",
              },
              gap: 2,
              alignContent: "start",
            }}
          >
            {cardsToShow.length > 0 ? (
              cardsToShow.map(e => {
                const id = String(e["@id"]).replace("-fileset", "");
                return (
                  <DownloadsCard
                    key={e["@id"]}
                    data={e}
                    connections={degreeById.get(id)}
                    onViewConnections={handleViewConnections}
                    highlighted={hoveredId === id || connectionFilter?.id === id}
                    onHoverChange={hovering => handleCardHoverChange(hovering, id)}
                  />
                );
              })
            ) : (
              <OtInvalidResultFilters />
            )}
          </Box>

          <Box
            sx={{
              position: { lg: "sticky" },
              top: { lg: 72 },
              height: { xs: 420, md: twoRowsHeight ?? 420 },
            }}
          >
            <GraphVisualization
              externalHighlightId={hoveredSource === "card" ? hoveredId : null}
              onNodeHoverChange={handleNodeHoverChange}
              selectedNodeId={selectedNodeId}
              onNodeSelect={setSelectedNodeId}
              onNodeDeselect={handleClearConnectionFilter}
            />
          </Box>
        </Box>
      </>
      <Routes>
        <Route path="/:downloadsRow/:downloadsView" element={<DownloadsDialog />} />
      </Routes>
    </DownloadsContext.Provider>
  );
}

export default DownloadsPage;
