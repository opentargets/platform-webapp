import { useState } from "react";
import { styled, Grid } from "@mui/material";

import AggregationsTooltip from "./AssocTooltip";
import associationsColumns from "../../static_datasets/dataSourcesAssoc";
import prioritizationColumns from "../../static_datasets/prioritisationColumns";
import { groupViewColumnsBy, DISPLAY_MODE } from "../../associationsUtils";
import { GridContainer, MetricsSpacerCol } from "../layout";

const AggregationsContainer = styled(GridContainer)({
  gridColumnGap: "4px",
});

const HiddenCol = styled("div")({
  width: "var(--table-left-column-width)",
  display: "flex",
});

type AggregationButtonProps = {
  isActive: boolean;
};

const AggregationButton = styled("button", {
  shouldForwardProp: prop => prop !== "isActive",
})<AggregationButtonProps>(({ isActive }) => ({
  position: "relative",
  width: "100%",
  height: "8px",
  opacity: 0.8,
  transition: "all ease 300ms",
  backgroundColor: isActive ? "var(--primary-color)" : "var(--aggregations-border-color)",
  border: `1.5px solid ${isActive ? "var(--primary-color)" : "var(--aggregations-border-color)"}`,
  borderRadius: "2px",
  transform: isActive ? "scale(1, 1.3)" : "none",
  cursor: "pointer",
  padding: 0,
  "&:hover": {
    transform: "scale(1, 2)",
    backgroundColor: "var(--primary-color)",
    borderColor: "var(--primary-color)",
  },
}));

const associationGrouped = groupViewColumnsBy(associationsColumns, "aggregation");
const prioritizationGrouped = groupViewColumnsBy(prioritizationColumns, "aggregation");

type Dataset = Record<string, unknown[]>;

type AggregationItemProps = {
  aggregation: string;
  dataset: Dataset;
  active: string | null;
  handleAggregationClick: (aggregation: string) => void;
  setActiveHeadersControlls: (open: boolean) => void;
};

function AggregationItem({
  aggregation,
  dataset,
  active,
  handleAggregationClick,
  setActiveHeadersControlls,
}: AggregationItemProps) {
  const [hovered, setHovered] = useState(false);

  const isActive = active === aggregation || hovered;
  const colSpan = dataset[aggregation].length;

  return (
    <AggregationButton
      type="button"
      isActive={isActive}
      style={{ gridColumn: `span ${colSpan}`, gridRow: "row1-start / 2" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => {
        handleAggregationClick(aggregation);
        setActiveHeadersControlls(true);
      }}
    >
      <AggregationsTooltip title={aggregation} open={isActive}>
        <div style={{ width: "100%" }} />
      </AggregationsTooltip>
    </AggregationButton>
  );
}

type AggregationsRowProps = {
  table: string;
  active: string | null;
  columnsCount: number;
  handleAggregationClick: (aggregation: string) => void;
  setActiveHeadersControlls: (open: boolean) => void;
};

function AggregationsRow({
  table,
  active,
  columnsCount,
  handleAggregationClick,
  setActiveHeadersControlls,
}: AggregationsRowProps) {
  const dataset: Dataset =
    table === DISPLAY_MODE.ASSOCIATIONS ? associationGrouped : prioritizationGrouped;
  const aggregations = Object.keys(dataset);

  return (
    <Grid container direction="row" wrap="nowrap">
      <HiddenCol />
      <AggregationsContainer columnsCount={columnsCount}>
        {aggregations.map(aggregation => (
          <AggregationItem
            key={aggregation}
            aggregation={aggregation}
            active={active}
            dataset={dataset}
            handleAggregationClick={handleAggregationClick}
            setActiveHeadersControlls={setActiveHeadersControlls}
          />
        ))}
      </AggregationsContainer>
      {table === DISPLAY_MODE.ASSOCIATIONS && <MetricsSpacerCol />}
    </Grid>
  );
}

export default AggregationsRow;
