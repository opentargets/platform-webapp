import { useEffect } from "react";
import { TablePagination } from "@mui/material";
import { styled } from "@mui/material/styles";
import { useAotfQueryState } from "../../context/AssociationsQueryContext";
import { useAotfURLState } from "../../context/AssociationsURLContext";
import { useAotfData } from "../../context/AssociationsDataContext";
import TableCell from "./TableCell";
import { getLegend } from "../../associationsUtils";

const TableFooterContainer = styled("div")({
  position: "sticky",
  borderTop: "1px solid var(--table-footer-border-color)",
  bottom: 0,
  backgroundColor: " #fafafa",
  padding: "10px",
  display: "flex",
  justifyContent: "space-between",
  zIndex: 100,
  marginTop: 12,
});

const LegendContainer = styled("div")({
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
});

interface TableFooterProps {
  table: any;
  coreOpen: boolean;
}

function TableFooter({ table, coreOpen }: TableFooterProps) {
  const { pagination } = useAotfQueryState();
  const { displayedTable } = useAotfURLState();
  const { count, loading } = useAotfData();

  useEffect(() => {
    const legend = getLegend(displayedTable === "associations");
    const container = document.getElementById("legend");
    if (container && legend) {
      container.innerHTML = "";
      container.appendChild(legend);
    }
  }, [displayedTable]);

  return (
    <TableFooterContainer data-testid="pagination-container">
      <div style={{ display: "flex", alignItems: " flex-start" }}>
        <LegendContainer id="legend" />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            marginLeft: "10px",
          }}
        >
          <span
            style={{
              fontWeight: "bold",
              fontSize: "10px",
              marginBottom: "3px",
            }}
          >
            No data
          </span>
          <TableCell />
        </div>
      </div>
      <div style={{ display: "flex" }}>
        {coreOpen && (
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 200, 500]}
            component="div"
            count={count}
            rowsPerPage={table.getState().pagination.pageSize}
            page={pagination.pageIndex}
            labelRowsPerPage="Associations per page"
            slotProps={{
              select: {
                "data-testid": "page-size-selector",
              },
            }}
            backIconButtonProps={{
              disableFocusRipple: true,
              "data-testid": "previous-page-button",
            }}
            nextIconButtonProps={{
              disableFocusRipple: true,
              "data-testid": "next-page-button",
            }}
            onPageChange={(e, index) => {
              if (!loading) {
                table.setPageIndex(index);
              }
            }}
            onRowsPerPageChange={e => {
              if (!loading) {
                table.setPageSize(Number(e.target.value));
              }
            }}
          />
        )}
      </div>
    </TableFooterContainer>
  );
}

export default TableFooter;
