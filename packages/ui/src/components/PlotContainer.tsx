import { Typography, Paper, Grid, LinearProgress } from "@mui/material";
import { makeStyles } from "@mui/styles";
import { v1 } from "uuid";

import PlotContainerSection from "./PlotContainerSection";

const useStyles = makeStyles(() => ({
  plotContainer: {
    marginBottom: "15px",
  },
  leftContainer: {
    marginLeft: "4px",
  },
  rightContainer: {
    marginRight: "4px",
  },
}));

function PlotContainer({ loading, error, left, center, right, children }) {
  const classes = useStyles();
  return (
    <Paper className={classes.plotContainer} elevation={0}>
      {left || center || right ? (
        <PlotContainerSection>
          <Grid container justifyContent="space-between" spacing={1}>
            <Grid item className={classes.leftContainer}>
              {left}
            </Grid>
            <Grid item>{center}</Grid>
            <Grid item className={classes.rightContainer}>
              {right}
            </Grid>
          </Grid>
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
