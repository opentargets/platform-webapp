import { Box, Collapse, Grid, Typography } from "@mui/material";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { styled } from "@mui/material/styles";

import Slider from "./SliderControl";
import Required from "./RequiredControl";
import { GridContainer, MetricsSpacerCol } from "../../layout";

import { useAotfQueryState, useAotfQueryDispatch } from "../../../context/AssociationsQueryContext";
import { useAotfURLState } from "../../../context/AssociationsURLContext";
import { Tooltip } from "ui";
import { ReactNode } from "react";

const CloseContainer = styled("div")({
  position: "absolute",
  left: "10px",
  top: "10px",
  cursor: "pointer",
  zIndex: 10,
});

const WeightsControllsContainer = styled("div")({
  backgroundColor: "var(--colums-controls-color)",
  position: "relative",
  boxSizing: "content-box",
  padding: "20px 0 15px",
});

const LabelsColumn = styled("div")({
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  textAlign: "right",
  width: "var(--table-left-column-width)",
});

const ColumnControl = styled("div")({
  width: "100%",
  display: "flex",
  flexDirection: "column",
});

const ControlContainer = styled("div")({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  height: "65px",
  "& span": {
    fontSize: "11px",
  },
});

const RequiredContainer = styled("div")({
  width: "100%",
  display: "flex",
  justifyContent: "center",
  marginTop: "0.5em",
});

type HeaderControlsProps = {
  cols: Record<string, unknown>[];
};

function getColumnObject(values: Record<string, unknown>[], id: string) {
  return values.find(val => val.id === id);
}

function HeaderControls({ cols = [] }: HeaderControlsProps): ReactNode {
  const { activeHeadersControlls, setActiveHeadersControlls } = useAotfURLState();
  const { displayedTable } = useAotfURLState();
  const { dataSourceControls: dataSourcesWeights } = useAotfQueryState();
  const { updateDataSourceControls } = useAotfQueryDispatch();

  if (displayedTable === "prioritisations") return null;

  const handleClose = () => {
    setActiveHeadersControlls(false);
  };

  function handleChangeSliderCommitted(newValue: number | number[], id: string) {
    const currentColumnValue = getColumnObject(dataSourcesWeights, id);
    updateDataSourceControls(
      id,
      newValue,
      currentColumnValue.required,
      currentColumnValue.aggregation
    );
  }

  function handleChangeRequire(newValue: boolean, id: string) {
    const currentColumnValue = getColumnObject(dataSourcesWeights, id);
    updateDataSourceControls(
      id,
      currentColumnValue.weight,
      newValue,
      currentColumnValue.aggregation
    );
  }

  function getRequiredValue(id: string) {
    const column = getColumnObject(dataSourcesWeights, id);
    if (column) return column.required;
    return false;
  }

  function getWeightValue(id: string) {
    const column = getColumnObject(dataSourcesWeights, id);
    if (column) return column.weight;
    return false;
  }

  return (
    <Collapse in={activeHeadersControlls}>
      <WeightsControllsContainer data-testid="weights-controls-container">
        <Grid container direction="row" wrap="nowrap">
          <CloseContainer onClick={handleClose} data-testid="close-weights-button">
            <FontAwesomeIcon icon={faXmark} size="lg" />
          </CloseContainer>
          <LabelsColumn>
            <Box>
              <Typography variant="subtitle2">Weight</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2">
                <Tooltip
                  title="Enabling this will return data from any of the selected sources."
                  showHelpIcon
                  style={null}
                >
                  Include
                </Tooltip>
              </Typography>
            </Box>
          </LabelsColumn>
          <GridContainer columnsCount={cols.length}>
            {cols.map(({ id }) => (
              <ColumnControl key={id}>
                <ControlContainer>
                  <Slider
                    id={id}
                    handleChangeSliderCommitted={handleChangeSliderCommitted}
                    value={getWeightValue(id)}
                  />
                </ControlContainer>
                <RequiredContainer>
                  <Required
                    id={id}
                    handleChangeRequire={handleChangeRequire}
                    checkedValue={getRequiredValue(id)}
                  />
                </RequiredContainer>
              </ColumnControl>
            ))}
          </GridContainer>
          <MetricsSpacerCol />
        </Grid>
      </WeightsControllsContainer>
    </Collapse>
  );
}

export default HeaderControls;
