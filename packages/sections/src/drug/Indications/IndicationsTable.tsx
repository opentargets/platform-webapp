import { Link, OtTableServer, Box, Typography } from "ui";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { clinicalStageCategories } from "@ot/constants";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faArrowDown } from "@fortawesome/free-solid-svg-icons";
import INDICATIONS_QUERY from "./IndicationsQuery.gql";

const onLinkClick = (e: any) => {
  e.stopPropagation();
};

export const INDICATIONS_PAGE_SIZE = 10;

function IndicationsTable({
  chemblId,
  selectedRow,
  selectRow,
}: any) {
  const theme = useTheme();
  const mdDown = useMediaQuery(theme.breakpoints.down("md"));

  const columns = [
    {
      id: "indicationCard",
      label: "",
      renderCell: (row: any) => {
        const {
          disease,
          maxClinicalStage,
          clinicalReports,
        } = row;
        const isSelected = selectedRow?.id && row.id === selectedRow.id;       
        return (
          <Box 
            sx={{ 
              p: "0.5rem 0.5rem 0.5rem 1rem",
              borderWidth: "0 0 0 4px",
              borderStyle: "solid",
              borderRadius: 1,
              borderColor: isSelected ? "primary.main" : "background.paper",
              bgcolor: isSelected ? '#e1eff9' : 'background.paper',
              cursor: 'pointer',
              '&:hover': {
                bgcolor: isSelected ? '#e1eff9' : 'grey.100',
                borderColor: isSelected ? "primary.main" : "grey.300",
                "& .arrow-icon": {
                  visibility: "visible",
                },
              }
            }}
          >
            {/* Top: Indication link as title */}
            <Typography
              variant="h6"
              sx={{
                fontSize: "14px",
                fontWeight: 600,
                mb: 0,
                color: 'primary.main',
                minWidth: 0,
                pr: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              <Link asyncTooltip to={`/disease/${disease?.id}`} onClick={onLinkClick}>
                {disease.name}
              </Link>
            </Typography>

            {/* Bottom section with max phase and record count */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {/* Bottom left: Max clinical stage */}
              <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5 }}>
                <Typography variant="caption">
                  Max stage:
                </Typography>
                <Typography variant="caption" sx={{ fontSize: 13 }}>
                  {(clinicalStageCategories as any)[maxClinicalStage]?.label ?? maxClinicalStage}
                </Typography>
              </Box>

              {/* Bottom right: Number of records */}
              <Box sx={{ display: "flex", gap: 0.6, alignItems: "baseline" }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: 12,
                    color: 'text.secondary'
                  }}
                >
                  {clinicalReports.length} {clinicalReports.length > 1 ? "reports" : "report"}
                </Typography>
                <Box
                  className="arrow-icon"
                  sx={{
                    fontSize: "11px",
                    color: "grey.600",
                    visibility: isSelected ? "visible" : "hidden",
                  }}
                >
                  <FontAwesomeIcon icon={mdDown ? faArrowDown : faArrowRight} />
                </Box>
              </Box>
            </Box>
          </Box>
        );
      },
      filterValue: (row: any) => {
        return `${row.disease?.name ?? ""} ${(clinicalStageCategories as any)[row.maxClinicalStage]?.label ?? ""}`
      }
    },
  ];

  const dataDownloaderColumns = [
    { id: "diseaseName", label: "Disease name", exportValue: (row: any) => row.disease?.name },
    { id: "diseaseId", label: "Disease id", exportValue: (row: any) => row.disease?.id },
    { id: "maxClinicalStage", label: "Max clinical stage" },
    { id: "reportCount", label: "Report count", exportValue: (row: any) => row.clinicalReports?.length },
  ];

  return (
    <Box
      sx={{
        px: { sm: 0, md: 1 },
        py: 0,  
        position: 'relative',
        height: "100%",
        "&::after": {  // vertical line full height of section
          content: '""',
          position: 'absolute',
          right: 0,
          top: -16,  
          bottom: -24,  
          width: { sm: 0, md: '1px' },
          backgroundColor: 'divider',  
          opacity: 0.8,  
        },
        "& thead": { display: 'none' },
        "& tr": {
          padding: "0.15rem 0 !important",
          borderBottom: "none !important",
          ":hover": { bgcolor: "transparent" },
        },
        "& td": {
          padding: "0 !important",
          maxWidth: 0,  
          borderBottom: "none !important",
          ":hover": {bgcolor: "transparent"}
        },
        "& > div > :nth-of-type(2)": theme => ({
          paddingTop: "0.5rem",
          marginLeft: { sm: 0, md: "-1.5rem" },  // to reach left edge
          marginRight: { sm: 0, md: "-0.5rem" },  // to not overshoot right border
          width: { sm: "100%", md: `calc(100% + ${theme.spacing(4)})` },
        }),
      }}
    >
      <OtTableServer
        columns={columns}
        query={INDICATIONS_QUERY}
        variables={{ chemblId }}
        dataPath="drug.indications"
        pageSize={INDICATIONS_PAGE_SIZE}
        dataDownloader
        dataDownloaderFileStem="clinical-indications"
        dataDownloaderColumns={dataDownloaderColumns}
        showColumnVisibilityControl={false}
        globalFilterPlaceholderText="Search..."
        getSelectedRows={(rowsInfo: any[]) => {
          if (!(rowsInfo?.length > 0)) return;

          const selectedOriginalRows = rowsInfo.map(r => r.original).filter(Boolean);
          if (!selectedOriginalRows.length) return;
          const nextRow =
            selectedOriginalRows.find(r => r.id !== selectedRow?.id) ??
            selectedOriginalRows[0];

          if (!nextRow?.id) return;

          if (nextRow.id !== selectedRow?.id) {
            selectRow(nextRow);
          }
        }}
        showRowsPerPageControl={false}
        wrapControls={{ rowGap: 4, pr: { sm: 0, md: 1 }, ml: { sm: 0, md: -1 } }}
      />
    </Box>
  );
}

export default IndicationsTable;
