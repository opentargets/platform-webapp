import {
  faCheck,
  faChevronDown,
  faChevronLeft,
  faClipboard,
  faFileImport,
  faPlay,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListSubheader,
  Snackbar,
  Step,
  StepLabel,
  Stepper,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button, Link, Tooltip, useApolloClient } from "ui";
import { v1 } from "uuid";
import * as XLSX from "xlsx";

import { useAotfQueryState } from "../../../context/AssociationsQueryContext";
import { useAotfURLState } from "../../../context/AssociationsURLContext";
import NestedItem from "./NestedItem";
import ValidationQuery from "./ValidationQuery.gql";

const BorderAccordion = styled(Accordion)(({ theme }) => ({
  boxShadow: "none",
  border: `1px solid ${theme.palette.primary.light}`,
  borderRadius: `${theme.spacing(1)} !important`,
}));

const StyledContainer = styled("div")`
  .dropzone {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
    border-width: 2px;
    border-radius: 2px;
    border-color: #eeeeee;
    border-style: dashed;
    background-color: #fafafa;
    color: #bdbdbd;
    outline: none;
    transition: border 0.24s ease-in-out;
    margin-bottom: 16px;
    cursor: pointer;
  }
  .dropzone:focus {
    border-color: #3489ca;
  }
`;

const SuggestionBlockHeader = styled("div")`
  background-color: #cccccc;
  border-radius: 8px 8px 0px 0px;
  border-width: 2px;
  border-style: solid;
  border-color: #cccccc;
  padding: 5px;
  padding-left: 20px;
`;

const SuggestionContainer = styled("div")`
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  padding-left: 20px;
  padding-top: 10px;
  padding-bottom: 10px;
  border-width: 2px;
  border-color: #eeeeee;
  border-style: solid;
  border-radius: 0px 0px 8px 8px;
  background-color: #fafafa;
  border-top: none;
`;

const steps = ["Add a file", "Entity validation"];

const getEntityToUploadLabel: Record<string, string> = {
  target: "targets",
  disease: "diseases",
};

const getValidationResults = async (entity: string[], queryTerms: string[], client: any) =>
  client.query({
    query: ValidationQuery,
    variables: { entity, queryTerms },
  });

interface Hit {
  id: string;
  name?: string;
  checked: boolean;
}

interface QueryTermResult {
  term: string;
  hits: Hit[];
}

function formatQueryTermsResults(queryResult: any): QueryTermResult[] {
  const sortedResult = [...queryResult.data.mapIds.mappings].sort(
    (a: any, b: any) => (a.hits.length < b.hits.length ? 1 : -1)
  );
  return sortedResult.map((qT: any) => ({
    ...qT,
    hits: [...qT.hits.map((e: any) => ({ ...e, checked: true }))],
  }));
}

const uploadSuggestions: Record<string, string[]> = {
  target: ["ENSG00000232810", "interleukin 6", "TP53", "ENSG00000105329", "P15692", "CD4"],
  disease: ["MONDO_0003847", "neoplasm", "MONDO_0004992", "MONDO_0007256", "infection", "OBI_1110021"],
};

interface FileExampleProps {
  entity?: string;
  runAction: (terms: string[]) => void;
}

const FileExample = ({ entity = "target", runAction }: FileExampleProps) => {
  const examples = uploadSuggestions[entity];

  const [open, setExpanded] = useState(false);
  const [fileType, setFileType] = useState("text");

  const handleFileTypeChange = (_event: any, newFileType: string) => {
    setFileType(newFileType);
  };

  function handleClickRun() {
    runAction(examples);
    setExpanded(false);
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(JSON.stringify(examples));
  }

  return (
    <Box sx={{ mb: 6 }}>
      <BorderAccordion expanded={open} onChange={() => setExpanded(!open)}>
        <AccordionSummary
          aria-controls="panel1a-content"
          id="panel1a-header"
          expandIcon={<FontAwesomeIcon icon={faChevronDown} />}
        >
          <Typography>Example format</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box>
            <code>
              <SuggestionBlockHeader>
                <Typography variant="monoText" display="inline">
                  File type:
                </Typography>
                <ToggleButtonGroup
                  color="primary"
                  value={fileType}
                  exclusive
                  onChange={handleFileTypeChange}
                  aria-label="File Example"
                  sx={{ ml: 2, background: "white" }}
                >
                  <ToggleButton value="text">.txt</ToggleButton>
                  <ToggleButton value="spreadsheet">.csv /.tsv /.xlsx</ToggleButton>
                  <ToggleButton value="json">.json</ToggleButton>
                </ToggleButtonGroup>
              </SuggestionBlockHeader>
              <SuggestionContainer>
                <Box sx={{ position: "absolute", right: 10, display: "flex", gap: 1 }}>
                  <Tooltip placement="bottom" title="Run this sample">
                    <Button onClick={() => handleClickRun()}>
                      <FontAwesomeIcon icon={faPlay} />
                    </Button>
                  </Tooltip>
                  <Tooltip placement="bottom" title="Copy to clipboard">
                    <Button onClick={() => copyToClipboard()}>
                      <FontAwesomeIcon icon={faClipboard} />
                    </Button>
                  </Tooltip>
                </Box>
                <Box>
                  {fileType === "json" && (
                    <>
                      [
                      {examples.map(ex => (
                        <Typography key={v1()} variant="monoText" display="block" gutterBottom>
                          {`"${ex}",`}
                        </Typography>
                      ))}
                      ]
                    </>
                  )}
                  {fileType === "text" &&
                    examples.map(ex => (
                      <Typography key={v1()} variant="monoText" display="block" gutterBottom>
                        {ex}
                      </Typography>
                    ))}
                  {fileType === "spreadsheet" && (
                    <table style={{ border: "1px solid black", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ border: "1px solid black", borderCollapse: "collapse" }}>
                          <th>id</th>
                        </tr>
                      </thead>
                      <tbody>
                        {examples.map(ex => (
                          <tr
                            key={v1()}
                            style={{ border: "1px solid black", borderCollapse: "collapse" }}
                          >
                            <td>
                              <Typography variant="monoText" display="block" gutterBottom>
                                {ex}
                              </Typography>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </Box>
              </SuggestionContainer>
            </code>
          </Box>
        </AccordionDetails>
      </BorderAccordion>
    </Box>
  );
};

function DataUploader() {
  const [activeStep, setActiveStep] = useState(0);
  const [queryTermsResults, setQueryTermsResults] = useState<QueryTermResult[] | null>(null);
  const { entityToGet } = useAotfQueryState();
  const { uploadedEntries, setUploadedEntries } = useAotfURLState();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [openErrorSnackbar, setOpenErrorSnackbar] = useState(false);
  const client = useApolloClient();

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      "text/html": [".txt"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".csv",
        ".tsv",
        ".xlsx",
      ],
      "application/JSON": [".json"],
    },
    onDrop: async ([file]) => {
      const reader = new FileReader();
      const fileType = getFileType(file.name);

      if (fileType === "spreadsheet") reader.readAsBinaryString(file);
      else if (fileType === "text") reader.readAsText(file);
      else if (fileType === "json") reader.readAsText(file);
      else setOpenErrorSnackbar(true);

      reader.onload = async e => {
        let contents: string[];
        if (fileType === "spreadsheet") contents = getDataFromSpreadsheet(e);
        else if (fileType === "text") contents = getDataFromTextFile(e);
        else if (fileType === "json") contents = JSON.parse((e.target as FileReader).result as string);
        else {
          setOpenErrorSnackbar(true);
          return;
        }

        const result = await getValidationResults([entityToGet], contents, client);
        setQueryTermsResults(formatQueryTermsResults(result));
        setActiveStep(1);
      };
    },
  });

  function getDataFromSpreadsheet(file: ProgressEvent<FileReader>): string[] {
    const wb = XLSX.read(file.target!.result, { type: "binary", bookVBA: true });
    const wsname = wb.SheetNames[0];
    const ws = wb.Sheets[wsname];
    const data: any[] = XLSX.utils.sheet_to_json(ws);

    if (!Object.hasOwn(data[0], "id")) {
      setOpenErrorSnackbar(true);
      console.error(
        "Please ensure the uploaded file is in the correct format (see allowed file types and example format)"
      );
    }

    return data.map(item => item["id"]);
  }

  function getDataFromTextFile(file: ProgressEvent<FileReader>): string[] {
    const contents = file.target!.result as string;
    return contents.split("\n");
  }

  function getFileType(fileName: string): string {
    const ext = fileName.split(".").pop();
    switch (ext) {
      case "csv":
      case "tsv":
      case "xlsx":
        return "spreadsheet";
      case "txt":
        return "text";
      case "json":
        return "json";
      default:
        return ext ?? "";
    }
  }

  const handleRunExample = async (terms: string[]) => {
    const result = await getValidationResults([entityToGet], terms, client);
    setQueryTermsResults(formatQueryTermsResults(result));
    setActiveStep(1);
  };

  const entityToUploadLabel = getEntityToUploadLabel[entityToGet];

  const handlePinElements = () => {
    setActiveStep(prev => prev + 1);
    const allHits: string[] = [];
    for (const termResult of queryTermsResults ?? []) {
      for (const hit of termResult.hits) {
        if (hit.checked) allHits.push(hit.id);
      }
    }
    setUploadedEntries([...uploadedEntries, ...allHits]);
    handleClosePopover();
  };

  const handleBack = () => {
    if (activeStep < 1) handleClosePopover();
    else setActiveStep(prev => prev - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
  };

  const open = Boolean(anchorEl);
  const popoverId = open ? "downloader-popover" : undefined;

  const handleClickBTN = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClosePopover = () => {
    setAnchorEl(null);
    setQueryTermsResults(null);
    handleReset();
  };

  function handleParentChange(term: string) {
    setQueryTermsResults(prev =>
      prev!.map(hitItem => {
        if (hitItem.term !== term) return hitItem;
        const allChecked = hitItem.hits.every(el => el.checked);
        return {
          ...hitItem,
          hits: hitItem.hits.map(el => ({ ...el, checked: !allChecked })),
        };
      })
    );
  }

  function handleChangeChildCheckbox(hitId: string) {
    setQueryTermsResults(prev =>
      prev!.map(hitItem => ({
        ...hitItem,
        hits: hitItem.hits.map(el =>
          el.id === hitId ? { ...el, checked: !el.checked } : el
        ),
      }))
    );
  }

  return (
    <div>
      <Button
        aria-describedby={popoverId}
        onClick={handleClickBTN}
        disableElevation
        sx={{ height: 1, maxHeight: "45px" }}
        aria-label="Upload list of entities"
      >
        <Box component="span" sx={{ mr: 1 }}>
          <FontAwesomeIcon icon={faFileImport} size="lg" />
        </Box>
        {`Upload ${entityToUploadLabel}`}
      </Button>
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
        <DialogTitle>{`Upload list of ${entityToUploadLabel}`}</DialogTitle>
        <DialogContent sx={{ pb: 0, overflowY: "scroll" }} dividers>
          <Typography
            sx={{ m: theme => `${theme.spacing(1)} 0 ${theme.spacing(4)} 0` }}
            variant="subtitle2"
            gutterBottom
          >
            Please upload a file here (allowed file formats - .txt / .csv / .tsv / .xlsx / .json)
            containing your custom list of targets/diseases. The file should contain a single{" "}
            {entityToGet} in every row. You will be able to visualise all the potential matches upon
            validation of your input.
            <br />
            <Link
              to="https://platform-docs.opentargets.org/web-interface/associations-on-the-fly#upload-functionality"
              external
            >
              Read more details here.
            </Link>
          </Typography>
          {activeStep === 0 && <FileExample entity={entityToGet} runAction={handleRunExample} />}
          <Box sx={{ m: theme => `${theme.spacing(1)} 0 ${theme.spacing(4)} 0` }}>
            <Stepper activeStep={activeStep}>
              {steps.map(label => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>

          {activeStep === 0 && (
            <StyledContainer>
              <div {...getRootProps({ className: "dropzone" })}>
                <input {...getInputProps()} />
                <p>Drag and drop a file here, or click to select file (see example format).</p>
              </div>
            </StyledContainer>
          )}
          {activeStep === 1 && queryTermsResults && (
            <Box>
              <Box sx={{ overflowY: "scroll" }}>
                <List
                  sx={{ width: "100%", maxWidth: 1, bgcolor: "background.paper" }}
                  aria-labelledby="nested-list-subheader"
                  subheader={
                    <ListSubheader sx={{ px: 1.5 }} component="div" id="nested-list-subheader">
                      Validation mappings ( Upload count: {queryTermsResults.length})
                    </ListSubheader>
                  }
                >
                  {queryTermsResults.map(({ term, hits }) => (
                    <NestedItem
                      key={v1()}
                      hits={hits}
                      term={term}
                      handleParentChange={handleParentChange}
                      handleChangeChildCheckbox={handleChangeChildCheckbox}
                    >
                      {`${term} (${hits.length} hits)`}
                    </NestedItem>
                  ))}
                </List>
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Box sx={{ display: "flex", justifyContent: "space-between", mx: 2, my: 1, width: 1 }}>
            <Button
              aria-describedby={popoverId}
              variant="outlined"
              disableElevation
              startIcon={<FontAwesomeIcon icon={faChevronLeft} size="lg" />}
              onClick={handleBack}
            >
              Back
            </Button>
            {activeStep === 1 && (
              <Button
                aria-describedby={popoverId}
                variant="outlined"
                disableElevation
                startIcon={<FontAwesomeIcon icon={faCheck} size="lg" />}
                onClick={handlePinElements}
              >
                Upload hits
              </Button>
            )}
          </Box>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={openErrorSnackbar}
        autoHideDuration={10000}
        onClose={() => setOpenErrorSnackbar(false)}
        message={
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            Please ensure the uploaded file has id in column header (see example format)
            <IconButton sx={{ color: "white" }} onClick={() => setOpenErrorSnackbar(false)}>
              <FontAwesomeIcon icon={faXmark} />
            </IconButton>
          </Box>
        }
      />
    </div>
  );
}

export default DataUploader;
