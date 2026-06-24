import FileSaver from "file-saver";
import { useState, useMemo, useEffect, useReducer } from "react";
import {
  Button,
  Grid,
  Typography,
  Snackbar,
  Slide,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ListItemText,
  Box,
  FormHelperText,
  ListItemIcon,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { makeStyles } from "@mui/styles";
import { faCaretDown, faFileDownload } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { CopyUrlButton, useAPIMetadata, useApolloClient, useBatchDownloader } from "ui";
import { getConfig } from "@ot/config";
import { useAotfQueryState } from "../../context/AssociationsQueryContext";
import { useAotfURLState } from "../../context/AssociationsURLContext";
import { useAotfData } from "../../context/AssociationsDataContext";
import OriginalDataSources from "../../static_datasets/dataSourcesAssoc";
import prioritizationCols from "../../static_datasets/prioritisationColumns";
import {
  getRowsQuerySelector,
  getExportedColumns,
  getExportedPrioritisationColumns,
  createBlob,
  getFilteredColumnArray,
} from "@ot/utils";

const config = getConfig();

const { isPartnerPreview } = config.profile;

const dataSources = OriginalDataSources.filter(e => {
  if (isPartnerPreview && e.isPrivate) return e;
  else if (!e.isPrivate) return e;
  return undefined;
});

const StyledMenuItem = styled(MenuItem)({
  "&>.MuiListItemIcon-root>svg": {
    fontSize: "1rem",
  },
});

const BorderAccordion = styled(Accordion)(({ theme }) => ({
  boxShadow: "none",
  border: `1px solid ${theme.palette.primary.light}`,
  borderRadius: `${theme.spacing(1)} !important`,
}));

const styles = makeStyles(theme => ({
  messageProgress: {
    marginRight: "1rem",
    color: "white !important",
  },
  snackbarContentMessage: {
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "center",
    padding: ".75rem 1rem",
    width: "100%",
  },
  snackbarContentRoot: {
    padding: 0,
  },
}));

const allAssociationsAggregation = [...new Set(dataSources.map(e => e.aggregation))];
const allPrioritizationAggregation = [...new Set(prioritizationCols.map(e => e.aggregation))];

interface DownloaderState {
  associationAggregationSelectValue: string[];
  prioritisationAggregationSelectValue: string[];
  selectedAssociationAggregationColumnObjectValue: any[];
  selectedPrioritisationAggregationColumnObjectValue: any[];
}

const initialState: DownloaderState = {
  associationAggregationSelectValue: allAssociationsAggregation,
  prioritisationAggregationSelectValue: allPrioritizationAggregation,
  selectedAssociationAggregationColumnObjectValue: [...dataSources],
  selectedPrioritisationAggregationColumnObjectValue: [...prioritizationCols],
};

type DownloaderAction =
  | { type: "UPDATE_ASSOCIATION_COLUMNS"; payload: string[] }
  | { type: "UPDATE_PRIORITISATION_COLUMNS"; payload: string[] };

const reducer = (state: DownloaderState = initialState, action: DownloaderAction): DownloaderState => {
  switch (action.type) {
    case "UPDATE_ASSOCIATION_COLUMNS":
      return {
        ...state,
        associationAggregationSelectValue: action.payload,
        selectedAssociationAggregationColumnObjectValue: getFilteredColumnArray(
          action.payload,
          state.selectedAssociationAggregationColumnObjectValue
        ),
      };
    case "UPDATE_PRIORITISATION_COLUMNS":
      return {
        ...state,
        prioritisationAggregationSelectValue: action.payload,
        selectedPrioritisationAggregationColumnObjectValue: getFilteredColumnArray(
          action.payload,
          state.selectedPrioritisationAggregationColumnObjectValue
        ),
      };
    default:
      return state;
  }
};

const actions = {
  UPDATE_ASSOCIATION_COLUMNS: (payload: string[]): DownloaderAction => ({
    type: "UPDATE_ASSOCIATION_COLUMNS",
    payload,
  }),
  UPDATE_PRIORITISATION_COLUMNS: (payload: string[]): DownloaderAction => ({
    type: "UPDATE_PRIORITISATION_COLUMNS",
    payload,
  }),
};

const DOWNLOAD_CHUNCK_SIZE = 300;

function DataDownloader() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { version } = useAPIMetadata();
  const classes = styles();
  const {
    id,
    query,
    sorting,
    enableIndirect,
    entity,
    entityToGet,
    modifiedSourcesDataControls,
    dataSourceControls: dataSourcesWeights,
    entitySearch,
  } = useAotfQueryState();
  const { pinnedEntries } = useAotfURLState();
  const { pinnedData } = useAotfData();
  const fileStem = `OT-${id}-associated-${entityToGet}s`;
  const [onlyPinnedCheckBox, setOnlyPinnedCheckBox] = useState(false);
  const [weightControlCheckBox, setWeightControlCheckBox] = useState(modifiedSourcesDataControls);
  const [onlyTargetData, setOnlyTargetData] = useState(false);
  const client = useApolloClient();

  const [downloading, setDownloading] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const columns = useMemo(
    () =>
      getExportedColumns(
        entityToGet,
        state.selectedAssociationAggregationColumnObjectValue,
        state.selectedPrioritisationAggregationColumnObjectValue,
        pinnedData
      ),
    [
      entityToGet,
      state.selectedAssociationAggregationColumnObjectValue,
      state.selectedPrioritisationAggregationColumnObjectValue,
      pinnedData,
    ]
  );

  const prioritisationColumns = useMemo(
    () =>
      getExportedPrioritisationColumns(
        state.selectedPrioritisationAggregationColumnObjectValue,
        pinnedData,
        entityToGet
      ),
    [state.selectedPrioritisationAggregationColumnObjectValue, pinnedData, entityToGet]
  );

  const queryResponseSelector = useMemo(() => getRowsQuerySelector(entityToGet), [entityToGet]);

  const allAssociationsVariable = {
    id,
    sortBy: sorting[0].id,
    enableIndirect,
    entitySearch,
    datasources: dataSourcesWeights.map(el => ({
      id: el.id,
      weight: el.weight,
      propagate: el.propagate,
      required: el.required,
    })),
  };

  const pinnedAssociationsVariable = {
    ...allAssociationsVariable,
    rowsFilter: pinnedEntries,
  };

  const getOnlyPinnedData = useBatchDownloader(
    query,
    pinnedAssociationsVariable,
    queryResponseSelector,
    "rows",
    "count",
    DOWNLOAD_CHUNCK_SIZE
  );

  const getAllAssociations = useBatchDownloader(
    query,
    allAssociationsVariable,
    queryResponseSelector,
    "rows",
    "count",
    DOWNLOAD_CHUNCK_SIZE
  );

  const open = Boolean(anchorEl);
  const popoverId = open ? "downloader-popover" : undefined;

  const downloadData = async (
    format: string,
    dataColumns: any[],
    rows: any,
    dataFileStem: string
  ) => {
    let allRows = rows;
    if (typeof rows === "function") {
      setDownloading(true);
      allRows = await rows();
      setDownloading(false);
    }
    if (!allRows || allRows.length === 0) return;
    const blob = createBlob(format)(dataColumns, allRows);
    const d = new Date().toLocaleDateString();
    FileSaver.saveAs(blob, `${dataFileStem}-${d}-v${version.year}_${version.month}.${format}`, {
      autoBOM: false,
    });
  };

  const handleClickBTN = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClosePopover = () => {
    setAnchorEl(null);
  };

  const handleClickDownloadJSON = async () => {
    const data = onlyPinnedCheckBox ? getOnlyPinnedData : getAllAssociations;
    const columnToGet = onlyTargetData ? prioritisationColumns : columns;
    downloadData("json", columnToGet, data, fileStem);
  };

  const handleClickDownloadTSV = async () => {
    const data = onlyPinnedCheckBox ? getOnlyPinnedData : getAllAssociations;
    const columnToGet = onlyTargetData ? prioritisationColumns : columns;
    downloadData("tsv", columnToGet, data, fileStem);
  };

  useEffect(() => {
    setWeightControlCheckBox(modifiedSourcesDataControls);
  }, [modifiedSourcesDataControls]);

  return (
    <>
      <StyledMenuItem onClick={handleClickBTN}>
        <ListItemIcon>
          <FontAwesomeIcon icon={faFileDownload} />
        </ListItemIcon>
        <ListItemText>Download data</ListItemText>
      </StyledMenuItem>
      <Dialog
        onClose={handleClosePopover}
        open={open}
        sx={{
          ".MuiDialog-paper": {
            width: "70%",
            maxWidth: "800px !important",
            borderRadius: theme => theme.spacing(1),
          },
        }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between" }}>
          Export: {fileStem} data{" "}
          <CopyUrlButton tooltipTitle="Copy URL. Data sources controls not included" />
        </DialogTitle>
        <DialogContent>
          <Typography
            sx={{ m: theme => `${theme.spacing(1)} 0 ${theme.spacing(4)} 0` }}
            variant="subtitle2"
            gutterBottom
          >
            By default, clicking on the download tabs from this view (JSON or TSV) will export the
            entire association table. Please expand the advanced options to customise the export
            parameters.
          </Typography>
          <BorderAccordion>
            <AccordionSummary expandIcon={<FontAwesomeIcon icon={faCaretDown} size="lg" />}>
              <Typography variant="body1">Advanced export options:</Typography>
            </AccordionSummary>
            <Divider />
            <AccordionDetails>
              <FormGroup>
                <FormControl size="small" sx={{ m: 1, maxWidth: "100%" }}>
                  <InputLabel id="select-association-small-label">
                    Select associations data type
                  </InputLabel>
                  <Select
                    disabled={downloading || onlyTargetData}
                    multiple
                    labelId="select-association-small-label"
                    value={state.associationAggregationSelectValue}
                    label="Select associations data type"
                    renderValue={selected => selected.join(", ")}
                    onChange={e => {
                      dispatch(
                        actions.UPDATE_ASSOCIATION_COLUMNS(
                          e.target.value.length ? String(e.target.value).split(",") : []
                        )
                      );
                    }}
                  >
                    {allAssociationsAggregation.map(ds => (
                      <MenuItem key={ds} value={ds}>
                        <Checkbox
                          checked={state.associationAggregationSelectValue.indexOf(ds) > -1}
                        />
                        <ListItemText primary={ds} />
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>
                    Selected {state.associationAggregationSelectValue.length} of{" "}
                    {allAssociationsAggregation.length}
                  </FormHelperText>
                </FormControl>

                {entity === "disease" && (
                  <FormControl size="small" sx={{ m: 1, maxWidth: "100%" }}>
                    <InputLabel id="select-prioritization-small-label">
                      Select prioritisation data type
                    </InputLabel>
                    <Select
                      disabled={downloading}
                      multiple
                      labelId="select-prioritization-small-label"
                      value={state.prioritisationAggregationSelectValue}
                      label="Select prioritisation data type"
                      renderValue={selected => selected.join(", ")}
                      onChange={e => {
                        dispatch(
                          actions.UPDATE_PRIORITISATION_COLUMNS(
                            e.target.value.length ? String(e.target.value).split(",") : []
                          )
                        );
                      }}
                    >
                      {allPrioritizationAggregation.map(ds => (
                        <MenuItem key={ds} value={ds}>
                          <Checkbox
                            checked={state.prioritisationAggregationSelectValue.indexOf(ds) > -1}
                          />
                          <ListItemText primary={ds} />
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>
                      Selected {state.prioritisationAggregationSelectValue.length} of{" "}
                      {allPrioritizationAggregation.length}
                    </FormHelperText>
                  </FormControl>
                )}

                <FormControlLabel
                  sx={{ pl: 1 }}
                  control={
                    <Checkbox
                      checked={weightControlCheckBox}
                      disabled={!modifiedSourcesDataControls || downloading}
                      onChange={e => setWeightControlCheckBox(e.target.checked)}
                    />
                  }
                  label="Include custom controls"
                />
                <FormControlLabel
                  sx={{ pl: 1 }}
                  control={
                    <Checkbox
                      disabled={pinnedEntries.length <= 0 || downloading}
                      checked={onlyPinnedCheckBox}
                      onChange={e => setOnlyPinnedCheckBox(e.target.checked)}
                    />
                  }
                  label={`Only pinned${isPartnerPreview ? " / uploaded " : " "}rows`}
                />

                {entity === "disease" && (
                  <FormControlLabel
                    sx={{ pl: 1 }}
                    control={
                      <Checkbox
                        disabled={
                          downloading || state.prioritisationAggregationSelectValue.length <= 0
                        }
                        checked={onlyTargetData}
                        onChange={e => setOnlyTargetData(e.target.checked)}
                      />
                    }
                    label="Only prioritisation data"
                  />
                )}
              </FormGroup>
            </AccordionDetails>
          </BorderAccordion>

          <Box
            sx={{
              mt: 4,
              display: "flex",
              flexWrap: "nowrap",
              alignItems: "center",
              gap: 3,
            }}
          >
            <Box>
              <Typography>Download data as:</Typography>
            </Box>
            <Box>
              <Grid container alignItems="center" spacing={3}>
                <Grid item>
                  <Button variant="outlined" onClick={handleClickDownloadJSON} size="small">
                    JSON
                  </Button>
                </Grid>
                <Grid item>
                  <Button variant="outlined" onClick={handleClickDownloadTSV} size="small">
                    TSV
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
      <Snackbar
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        open={downloading}
        TransitionComponent={Slide}
        ContentProps={{
          classes: {
            root: classes.snackbarContentRoot,
            message: classes.snackbarContentMessage,
          },
        }}
        message={
          <>
            <CircularProgress className={classes.messageProgress} />
            Preparing the data. This may take several minutes...
          </>
        }
      />
    </>
  );
}

export default DataDownloader;
