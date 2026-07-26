import { useApolloClient } from "@apollo/client";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Box,
  ButtonBase,
  Chip,
  CircularProgress,
  Drawer,
  IconButton,
  Paper,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { clinicalReportsSourcesInfo, clinicalStageCategories, stopReasonMap } from "@ot/constants";
import { sentenceCase } from "@ot/utils";
import { useEffect, useState } from "react";
import useDelayedFlag from "../../hooks/useDelayedFlag";
import Link from "../Link";
import LongText from "../LongText";
import { PublicationsList } from "../PublicationsDrawer";
import Tooltip from "../Tooltip";
import RECORD_DETAIL_QUERY from "./RecordDetailQuery.gql";

const StyledButtonBase = styled(ButtonBase)(({ theme }) => ({
  color: `${theme.palette.primary.main} !important`,
}));

const StyledBody = styled(Box)({
  overflowY: "overlay",
});

const StyledDrawer = styled(Drawer)(({ theme }) => ({
  "& .MuiBackdrop-root": {
    opacity: "0 !important",
  },
  "& .MuiDrawer-paper": {
    backgroundColor: theme.palette.grey[300],
    maxWidth: "100%",
  },
}));

const StyledPaperTitle = styled(Paper)({
  borderBottom: "1px solid #ccc",
  padding: "1rem",
});

const StyledTitleCaption = styled(Typography)(({ theme }) => ({
  color: theme.palette.grey[700],
  fontSize: "1.2rem",
  fontWeight: "bold",
}));

const getDetails = (client, query, clinicalReportId) =>
  client.query({
    query,
    variables: {
      clinicalReportId,
    },
  });

function FieldLabel({ minWidth = 65, children }) {
  return (
    <Typography variant="caption" sx={{ fontWeight: 400, minWidth, mr: 0.5 }}>
      {children}
    </Typography>
  );
}

function FieldRow({ label, children }: any) {
  if (!children) return null;
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "baseline",
        my: 1,
      }}
    >
      <FieldLabel minWidth={70}>{label}</FieldLabel>
      <Box sx={{ flex: 1 }}>{children}</Box>
    </Box>
  );
}

function dedupOnId(rows: any, propertyName: any) {
  return [
    ...new Map(
      (rows || []).filter((d: any) => d[propertyName]?.id).map((d: any) => [d[propertyName].id, d])
    ).values(),
  ];
}

function formatType(s: any) {
  return sentenceCase(s.replace(/_+/g, " "));
}

const tooltipStyle: any = {
  tooltipIcon: {
    verticalAlign: "baseline",
    top: -6,
    lineHeight: 1,
    fontSize: "0.75em",
    position: "relative",
  },
};

const tooltipSlotProps: any = {
  popper: {
    modifiers: [
      {
        name: "offset",
        options: { offset: [0, -6] },
      },
    ],
  },
};

function RecordDetails({ recordId, recordDetailQuery = RECORD_DETAIL_QUERY }) {
  const client = useApolloClient();
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const showLoading = useDelayedFlag(loading, 250);

  useEffect(() => {
    if (!recordId) return;
    const fetchDetails = async () => {
      setLoading(true);
      setDetails(null);
      const res = await getDetails(client, recordDetailQuery, recordId);
      setDetails(res.data.clinicalReport);
      setLoading(false);
    };
    fetchDetails();
  }, [client, recordId, recordDetailQuery]);

  if (showLoading) {
    return (
      <Box my={8} display="flex" justifyContent="center" alignItems="center" flexDirection="column">
        <CircularProgress size={60} />
        <Typography mt={6}>Loading clinical report details</Typography>
      </Box>
    );
  }

  if (!details) return null;

  const {
    title,
    type,
    trialStudyType,
    trialPrimaryPurpose,
    source,
    countries,
    clinicalStage,
    phaseFromSource,
    trialOverallStatus,
    trialWhyStopped,
    trialStopReasonCategories,
    trialStartDate,
    url,
    trialDescription,
    trialLiterature,
    diseases,
    drugs,
    hasExpertReview,
  } = details;

  const sourceInfo = clinicalReportsSourcesInfo[source];
  const dedupedDiseases: any = dedupOnId(diseases, "disease");
  const dedupedDrugs: any = dedupOnId(drugs, "drug");

  return (
    <>
      <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 0.75 }}>
        {title || `[${sentenceCase(type)}]`}
      </Typography>

      <Link to={url}>
        <Typography variant="caption" component="div" sx={{ mb: 2 }}>
          {url}
        </Typography>
      </Link>

      <FieldRow label="Source">
        <Box
          sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2 }}
        >
          {sourceInfo ? (
            <Link to={sourceInfo.url}>
              <Typography variant="body2">
                {sourceInfo.name} {sourceInfo.name !== source && `(${source})`}
              </Typography>
            </Link>
          ) : (
            <Typography variant="body2">{source}</Typography>
          )}
          {hasExpertReview && (
            <Chip
              label={<Typography variant="caption">Expert review</Typography>}
              variant="outlined"
              size="small"
            />
          )}
        </Box>
      </FieldRow>

      {countries?.length > 0 && (
        <FieldRow label="Status">
          <Typography variant="body2">{countries.join(", ")}</Typography>
        </FieldRow>
      )}

      {(type || trialStudyType) && (
        <FieldRow label="Type">
          <Typography variant="body2">
            {type && formatType(type)}
            {type && trialStudyType && " - "}
            {trialStudyType && formatType(trialStudyType)}
          </Typography>
        </FieldRow>
      )}

      {trialPrimaryPurpose && (
        <FieldRow label="Purpose">
          <Typography variant="body2">{formatType(trialPrimaryPurpose)}</Typography>
        </FieldRow>
      )}

      {trialStartDate && (
        <FieldRow label="Start">
          <Typography variant="body2">{trialStartDate}</Typography>
        </FieldRow>
      )}

      <FieldRow label="Stage">
        {phaseFromSource ? (
          <Tooltip
            showHelpIcon
            style={tooltipStyle}
            slotProps={tooltipSlotProps}
            title={<Typography variant="caption">Phase from source: {phaseFromSource}</Typography>}
          >
            <Typography component="span" variant="body2">
              {(clinicalStageCategories as any)[clinicalStage].label}
            </Typography>
          </Tooltip>
        ) : (
          <Typography variant="body2">
            {(clinicalStageCategories as any)[clinicalStage].label}
          </Typography>
        )}
      </FieldRow>

      {trialOverallStatus && (
        <FieldRow label="Status">
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Box sx={{ display: "flex", alignItems: "baseline", gap: 1.5 }}>
              <Typography variant="body2">{formatType(trialOverallStatus)}</Typography>
              {trialStopReasonCategories?.length > 0 && (
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {trialStopReasonCategories.map((category) => (
                    <Chip
                      key={category}
                      sx={{}}
                      label={stopReasonMap(category)}
                      variant="outlined"
                      size="small"
                    />
                  ))}
                </Box>
              )}
            </Box>
            {trialWhyStopped && (
              <LongText variant="body2" lineLimit={2} displayText="...show more">
                <Box sx={{ whiteSpace: "pre-wrap", tabSize: 4, fontSize: "13px" }}>
                  {trialWhyStopped}
                </Box>
              </LongText>
            )}
          </Box>
        </FieldRow>
      )}

      {dedupedDiseases.length > 0 && (
        <FieldRow label="Diseases">
          <LongText variant="body2" lineLimit={3} displayText="...show more">
            <Box component="span" sx={{ fontSize: 14 }}>
              {dedupedDiseases.map((d: any, index: any) => (
                <span key={index}>
                  {index > 0 ? ", " : ""}
                  {d.disease?.id ? (
                    <Tooltip
                      showHelpIcon
                      style={tooltipStyle}
                      slotProps={tooltipSlotProps}
                      title={
                        <Typography variant="caption" sx={{ whiteSpace: "pre-wrap", tabSize: 4 }}>
                          Disease from source: {d.diseaseFromSource}
                        </Typography>
                      }
                    >
                      <Link asyncTooltip to={`/disease/${d.disease.id}`}>
                        {d.disease.name}
                      </Link>
                    </Tooltip>
                  ) : (
                    d.diseaseFromSource
                  )}
                </span>
              ))}
            </Box>
          </LongText>
        </FieldRow>
      )}

      {dedupedDrugs.length > 0 && (
        <FieldRow label="Drugs">
          <LongText variant="body2" lineLimit={3} displayText="...show more">
            <Box component="span" sx={{ fontSize: 14 }}>
              {dedupedDrugs.map((d, index) => (
                <span key={index}>
                  {index > 0 ? ", " : ""}
                  {d.drug?.id ? (
                    <Tooltip
                      showHelpIcon
                      style={tooltipStyle}
                      slotProps={tooltipSlotProps}
                      title={
                        <Typography variant="caption" sx={{ whiteSpace: "pre-wrap", tabSize: 4 }}>
                          Drug from source: {d.drugFromSource}
                        </Typography>
                      }
                    >
                      <Link asyncTooltip to={`/drug/${d.drug.id}`}>
                        {d.drug.name}
                      </Link>
                    </Tooltip>
                  ) : (
                    d.drugFromSource
                  )}
                </span>
              ))}
            </Box>
          </LongText>
        </FieldRow>
      )}

      {trialDescription && (
        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", tabSize: 4, mt: 2.5, mb: 3.5 }}>
          {trialDescription}
        </Typography>
      )}

      {trialLiterature && trialLiterature.length > 0 && (
        <Box>
          <Typography variant="subtitle2">Literature</Typography>
          <Box sx={{ mt: -5 }}>
            <PublicationsList
              entriesIds={trialLiterature}
              hideSearch
              name={undefined}
              symbol={undefined}
              showRowsPerPageControl={false}
              showPaginationAlways={false}
            />
          </Box>
        </Box>
      )}
    </>
  );
}

function ClinicalRecordDrawer({ recordId, recordDetailQuery, children }: any) {
  const [open, setOpen] = useState(false);

  const toggleDrawer = (event: any) => {
    if (event.type === "keydown" && (event.key === "Tab" || event.key === "Shift")) {
      return;
    }
    setOpen(true);
  };

  const closeDrawer = () => {
    setOpen(false);
  };

  return (
    <>
      <StyledButtonBase
        disableRipple
        onClick={toggleDrawer}
        sx={{ maxWidth: "100%", overflow: "hidden", display: "block" }}
      >
        {children}
      </StyledButtonBase>

      <StyledDrawer anchor="right" open={open} onClose={closeDrawer}>
        <StyledPaperTitle elevation={0}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <StyledTitleCaption>Report</StyledTitleCaption>
            <IconButton onClick={closeDrawer}>
              <FontAwesomeIcon icon={faXmark} />
            </IconButton>
          </Box>
        </StyledPaperTitle>

        <StyledBody width={700} maxWidth="100%">
          {open && (
            <Box mt={2} mb={3} mx={3} p={3} pb={6} bgcolor="white">
              <RecordDetails recordId={recordId} recordDetailQuery={recordDetailQuery} />
            </Box>
          )}
        </StyledBody>
      </StyledDrawer>
    </>
  );
}

export default ClinicalRecordDrawer;
