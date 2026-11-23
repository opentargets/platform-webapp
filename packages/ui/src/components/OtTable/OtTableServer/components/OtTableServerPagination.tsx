import {
  faAngleLeft,
  faAngleRight,
  faBackwardStep,
  faForwardStep,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, CircularProgress, IconButton, NativeSelect } from "@mui/material";
import type { PaginationState, Table } from "@tanstack/react-table";
import type { ReactElement } from "react";
import { getCurrentPagePosition } from "../../utils/tableUtils";

type OtTableServerPaginationProps<Row extends object> = {
  table: Table<Row>;
  pagination: PaginationState;
  rowCount: number;
  loading: boolean;
  initialLoading: boolean;
  pageSizeOptions: number[];
  showRowsPerPageControl: boolean;
  showPaginationAlways: boolean;
  onPageSizeChange: (pageSize: number) => void;
};

/** loading indicator, rows-per-page select and the page controls */
function OtTableServerPagination<Row extends object>({
  table,
  pagination,
  rowCount,
  loading,
  initialLoading,
  pageSizeOptions,
  showRowsPerPageControl,
  showPaginationAlways,
  onPageSizeChange,
}: OtTableServerPaginationProps<Row>): ReactElement {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "end",
        alignItems: "center",
        padding: (theme) => `${theme.spacing(2)} 0 `,
      }}
    >
      {loading && !initialLoading && (
        <CircularProgress sx={{ mx: (theme) => theme.spacing(2) }} size={25} />
      )}
      {showRowsPerPageControl && (
        <div>
          <label htmlFor="paginationSelect">Rows per page:</label>
          <NativeSelect
            id="paginationSelect"
            disableUnderline
            disabled={loading}
            sx={{ pl: (theme) => theme.spacing(2) }}
            value={pagination.pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </NativeSelect>
        </div>
      )}

      {(showPaginationAlways || table.getPageCount() > 1) && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: (theme) => theme.spacing(3),
            marginLeft: (theme) => theme.spacing(3),
          }}
        >
          <div>
            <span>
              {getCurrentPagePosition(pagination.pageIndex, pagination.pageSize, rowCount)}
            </span>
          </div>
          <div className="paginationAction">
            <IconButton
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage() || loading}
              aria-label="First Page"
              data-testid="pagination-first-button"
            >
              <FontAwesomeIcon size="2xs" icon={faBackwardStep} />
            </IconButton>
            <IconButton
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage() || loading}
              aria-label="Previous Page"
              data-testid="pagination-previous-button"
            >
              <FontAwesomeIcon size="2xs" icon={faAngleLeft} />
            </IconButton>
            <IconButton
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage() || loading}
              aria-label="Next Page"
              data-testid="pagination-next-button"
            >
              <FontAwesomeIcon size="2xs" icon={faAngleRight} />
            </IconButton>
            <IconButton
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage() || loading}
              aria-label="Last Page"
              data-testid="pagination-last-button"
            >
              <FontAwesomeIcon size="2xs" icon={faForwardStep} />
            </IconButton>
          </div>
        </Box>
      )}
    </Box>
  );
}

export default OtTableServerPagination;
