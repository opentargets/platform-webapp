import { faArrowDown, faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import {
  clinicalStageCategories,
  type IndicationsQuery,
  type IndicationsQueryVariables,
} from "@ot/constants";
import type { Row } from "@tanstack/react-table";
import type { MouseEvent } from "react";
import { Box, Link, type OtTableColumn, OtTableServer, Typography } from "ui";
import { typedDocument } from "../../utils/typedDocument";
import INDICATIONS_QUERY_DOCUMENT from "./IndicationsQuery.gql";

export const INDICATIONS_QUERY = typedDocument<IndicationsQuery, IndicationsQueryVariables>(
  INDICATIONS_QUERY_DOCUMENT
);

export type IndicationRow = NonNullable<IndicationsQuery["drug"]>["indications"]["rows"][number];

type StageCategory = { index: number; label: string };
const stageCategories: Record<string, StageCategory | undefined> = clinicalStageCategories;

const onLinkClick = (e: MouseEvent<HTMLAnchorElement>) => {
  e.stopPropagation();
};

export const INDICATIONS_PAGE_SIZE = 10;

type IndicationsTableProps = {
  chemblId: string;
  selectedRow: IndicationRow | null;
  selectRow: (row: IndicationRow | null) => void;
};

function IndicationsTable({ chemblId, selectedRow, selectRow }: IndicationsTableProps) {
  const theme = useTheme();
  const mdDown = useMediaQuery(theme.breakpoints.down("md"));

  const columns: OtTableColumn<IndicationRow>[] = [
    {
      id: "indicationCard",
      label: "",
      renderCell: (row) => {
        const { disease, maxClinicalStage, clinicalReports } = row;
        const isSelected = selectedRow?.id && row.id === selectedRow.id;
        return (
          <Box
            sx={{
              p: "0.5rem 0.5rem 0.5rem 1rem",
              borderWidth: "0 0 0 4px",
              borderStyle: "solid",
              borderRadius: 1,
              borderColor: isSelected ? "primary.main" : "background.paper",
              bgcolor: isSelected ? "#e1eff9" : "background.paper",
              cursor: "pointer",
              "&:hover": {
                bgcolor: isSelected ? "#e1eff9" : "grey.100",
                borderColor: isSelected ? "primary.main" : "grey.300",
                "& .arrow-icon": {
                  visibility: "visible",
                },
              },
            }}
          >
            {/* Top: Indication link as title */}
            <Typography
              variant="h6"
              sx={{
                fontSize: "14px",
                fontWeight: 600,
                mb: 0,
                color: "primary.main",
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
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {/* Bottom left: Max clinical stage */}
              <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5 }}>
                <Typography variant="caption">Max stage:</Typography>
                <Typography variant="caption" sx={{ fontSize: 13 }}>
                  {stageCategories[maxClinicalStage]?.label ?? maxClinicalStage}
                </Typography>
              </Box>

              {/* Bottom right: Number of records */}
              <Box sx={{ display: "flex", gap: 0.6, alignItems: "baseline" }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: 12,
                    color: "text.secondary",
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
      filterValue: (row) =>
        `${row.disease?.name ?? ""} ${stageCategories[row.maxClinicalStage]?.label ?? ""}`,
    },
  ];

  const dataDownloaderColumns: OtTableColumn<IndicationRow>[] = [
    { id: "diseaseName", label: "Disease name", exportValue: (row) => row.disease?.name },
    { id: "diseaseId", label: "Disease id", exportValue: (row) => row.disease?.id },
    { id: "maxClinicalStage", label: "Max clinical stage" },
    { id: "reportCount", label: "Report count", exportValue: (row) => row.clinicalReports?.length },
  ];

  return (
    <Box
      sx={{
        px: { sm: 0, md: 1 },
        py: 0,
        position: "relative",
        height: "100%",
        "&::after": {
          // vertical line full height of section
          content: '""',
          position: "absolute",
          right: 0,
          top: -16,
          bottom: -24,
          width: { sm: 0, md: "1px" },
          backgroundColor: "divider",
          opacity: 0.8,
        },
        "& thead": { display: "none" },
        "& tr": {
          padding: "0.15rem 0 !important",
          borderBottom: "none !important",
          ":hover": { bgcolor: "transparent" },
        },
        "& td": {
          padding: "0 !important",
          maxWidth: 0,
          borderBottom: "none !important",
          ":hover": { bgcolor: "transparent" },
        },
        "& > div > :nth-of-type(2)": (theme) => ({
          paddingTop: "0.5rem",
          marginLeft: { sm: 0, md: "-1.5rem" }, // to reach left edge
          marginRight: { sm: 0, md: "-0.5rem" }, // to not overshoot right border
          width: { sm: "100%", md: `calc(100% + ${theme.spacing(4)})` },
        }),
      }}
    >
      <OtTableServer<IndicationRow>
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
        getSelectedRows={(rowsInfo: Row<IndicationRow>[]) => {
          if (!(rowsInfo?.length > 0)) return;

          const selectedOriginalRows = rowsInfo.map((r) => r.original).filter(Boolean);
          if (!selectedOriginalRows.length) return;
          const nextRow =
            selectedOriginalRows.find((r) => r.id !== selectedRow?.id) ?? selectedOriginalRows[0];

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
