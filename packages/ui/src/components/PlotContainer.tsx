import { Typography, Paper, GridLegacy, LinearProgress } from "@mui/material";
import { v1 } from "uuid";

import PlotContainerSection from "./PlotContainerSection";

function PlotContainer({ loading, error, left, center, right, children }) {
  return (
    <Paper sx={{ mb: "15px" }} elevation={0}>
      {left || center || right ? (
        <PlotContainerSection>
          <GridLegacy container justifyContent="space-between" spacing={1}>
            <GridLegacy item sx={{ ml: "4px" }}>
              {left}
            </GridLegacy>
            <GridLegacy item>{center}</GridLegacy>
            <GridLegacy item sx={{ mr: "4px" }}>
              {right}
            </GridLegacy>
          </GridLegacy>
        </PlotContainerSection>
      ) : null}
      {loading ? <LinearProgress /> : null}
      {error ? (
        <PlotContainerSection>
          <div>
            <Typography variant="subtitle1" color="error">
              {error.graphQLErrors.map(({ message }, i) => (
                <span key={v1()}>{message}</span>
              ))}
            </Typography>
          </div>
        </PlotContainerSection>
      ) : null}
      {children}
    </Paper>
  );
}

export default PlotContainer;
