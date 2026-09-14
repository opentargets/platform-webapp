import { Box, CircularProgress, Typography } from "@mui/material";
import { clinicalReportsSourcesInfo, defaultRowsPerPageOptions } from "@ot/constants";
import { sentenceCase } from "@ot/utils";
import { sum } from "d3";
import { useEffect, useState } from "react";
import { Link, Tooltip } from "ui";
import useDelayedFlag from "../../hooks/useDelayedFlag";
import OtTable from "../OtTable/OtTable";
import ClinicalRecordDrawer from "./ClinicalRecordDrawer";
import CLINICAL_RECORDS_QUERY from "./ClinicalRecordsQuery.gql";
import RECORD_DETAIL_QUERY from "./RecordDetailQuery.gql";
import StageFilter from "./StageFilter";

function RecordsCards({ records: recordsProp, loading, maxClinicalStage, selectedEntity }) {
  const records = recordsProp || {};
  const [selectedStage, setSelectedStage] = useState(null);

  useEffect(() => {
    if (!maxClinicalStage) return;
    let initStage = maxClinicalStage;
    if (maxClinicalStage === "APPROVAL" && !records.APPROVAL) {
      initStage = records.PHASE_4 ? "PHASE_4" : "WITHDRAWAL";
    }
    setSelectedStage(initStage);
  }, [maxClinicalStage, records]);

  const showLoading = useDelayedFlag(loading);

  const nRecords = sum(
    Object.keys(records).map((k) => (records as any)[k]),
    (row: any) => row.length
  );

  const columns = [
    {
      id: "trial",
      label: !loading && (
        <StageFilter
          records={records}
          setSelectedStage={setSelectedStage}
          selectedStage={selectedStage}
          maxStage={maxClinicalStage}
        />
      ),
      renderCell: (record) => {
        const { source, trialStartDate, type, trialOverallStatus, title } = record;
        const sourceInfo = clinicalReportsSourcesInfo[source];

        const displayTitle = (
          <Link to="#" onClick={(e) => e.preventDefault()}>
            <Typography
              variant={"body1"}
              noWrap
              sx={{
                minWidth: 0,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {title || `[${sentenceCase(type)}]`}
            </Typography>
          </Link>
        );

        return (
          <Box sx={{ mb: 0.5, overflow: "hidden" }}>
            <Box
              sx={{
                display: "inline-block",
                maxWidth: "100%",
                overflow: "hidden",
                verticalAlign: "top",
              }}
            >
              <ClinicalRecordDrawer recordId={record.id} recordDetailQuery={RECORD_DETAIL_QUERY}>
                {displayTitle}
              </ClinicalRecordDrawer>
            </Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box
                  sx={{
                    display: "flex",
                    minWidth: "170px",
                    alignItems: "baseline",
                    gap: 0.5,
                  }}
                >
                  <Typography variant="caption">Source:</Typography>
                  <Typography variant="caption" sx={{ fontSize: 13 }}>
                    {source}
                    {sourceInfo?.name !== source && (
                      <Tooltip
                        showHelpIcon
                        title={
                          <Typography variant="caption" sx={{ fontSize: 12 }}>
                            {sourceInfo.name}
                          </Typography>
                        }
                      />
                    )}
                  </Typography>
                </Box>
                {trialOverallStatus && (
                  <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5 }}>
                    <Typography variant="caption">Status:</Typography>
                    <Typography variant="caption" sx={{ fontSize: 13 }}>
                      {trialOverallStatus?.toLowerCase()}
                    </Typography>
                  </Box>
                )}
              </Box>
              {trialStartDate && (
                <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5 }}>
                  <Typography variant="caption">Start:</Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: 13,
                      fontVariant: "common-ligatures tabular-nums",
                      letterSpacing: "-0.05em",
                    }}
                  >
                    {trialStartDate.slice(0, 4)}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        );
      },
      sortable: false,
    },
  ];

  const dataDownloaderColoumns = [
    { id: "id" },
    { id: "title" },
    { id: "clinicalStage" },
    { id: "source" },
    { id: "trialOverallStatus" },
    { id: "trialStartDate" },
  ];

  if (showLoading) {
    return (
      <Box
        my={10}
        display="flex"
        justifyContent="center"
        alignItems="center"
        flexDirection="column"
      >
        <CircularProgress size={60} />
        <Typography mt={6}>Loading clinical reports</Typography>
      </Box>
    );
  }

  if (!selectedStage || (loading && !showLoading)) return null;

  const rows = records[selectedStage]?.toSorted((a: any, b: any) => {
    return new Date(b.trialStartDate).getTime() - new Date(a.trialStartDate).getTime();
  });
  if (!rows) return null;
  const allRows = ([] as any[]).concat(...Object.keys(records).map((k) => (records as any)[k]));

  return (
    <>
      <Box
        sx={{
          position: "relative",
          mr: { md: 0, lg: 4, xl: 6 },
          "& th": {
            position: "relative !important",
            padding: "0 !important",
            height: "140px",
          },
          "& tr": {
            padding: "0.15rem 0 !important",
            ":hover": { bgcolor: "transparent" },
          },
          "& td": {
            padding: "0.35rem 0 0.05rem !important",
            maxWidth: 0,
            ":hover": { bgcolor: "transparent" },
          },
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{
            position: "absolute",
            top: 5,
            left: 0,
            width: "calc(100% - 240px)",
            overflow: "hidden",
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 2,
            textOverflow: "ellipsis",
          }}
        >
          {nRecords} {nRecords > 1 ? "reports" : "report"} for{" "}
          <Link asyncTooltip to={`/${selectedEntity.entityType}/${selectedEntity.id}`}>
            {selectedEntity.name}
          </Link>
        </Typography>
        <OtTable
          columns={columns}
          rows={rows}
          query={CLINICAL_RECORDS_QUERY.loc?.source?.body}
          variables={{ clinicalReportsIds: allRows.map(({ id }) => id) }}
          dataDownloader
          dataDownloaderFileStem="clinical-records"
          dataDownloaderColumns={dataDownloaderColoumns}
          dataDownloaderRows={allRows}
          rowsPerPageOptions={defaultRowsPerPageOptions}
          showGlobalFilter={false}
          showColumnVisibilityControl={false}
          showRowsPerPageControl={false}
          wrapControls={{ mr: { md: 0, lg: -4, xl: -6 } }}
        />
      </Box>
    </>
  );
}

export default RecordsCards;
