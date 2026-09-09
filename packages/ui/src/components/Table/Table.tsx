/* eslint-disable */

import { GridLegacy, TableRow as MUITableRow, TableBody, TablePagination } from "@mui/material";
import { useState } from "react";

import DataDownloader from "../DataDownloader";
import GlobalFilter from "./GlobalFilter";
import TableHeader from "./TableHeader";
import TableRow from "./TableRow";
import {
  StyledDownloaderGrid,
  StyledEmptyRowCell,
  StyledFilterGrid,
  StyledMuiTable,
  StyledPaginationPlaceholder,
  StyledProgress,
  StyledTableContainer,
} from "./tableStyles";

const Table = ({
  containerSx,
  tableSx,
  sortBy,
  order,
  page,
  columns,
  rows,
  rowCount = rows.length,
  fixed = false,
  headerGroups = [],
  loading,
  onGlobalFilterChange = () => {},
  onSortBy = () => {},
  onRowsPerPageChange = () => {},
  onPageChange = () => {},
  pageSize = 10,
  dataDownloader = false,
  dataDownloaderFileStem = "data",
  dataDownloaderRows,
  dataDownloaderColumns,
  hover = false,
  noWrap = true,
  noWrapHeader = true,
  showGlobalFilter,
  showPagination = true,
  globalFilter,
  rowsPerPageOptions = [],
  ActionsComponent,
  onRowClick = () => {},
  rowIsSelectable = false,
  query,
  variables,
}) => {
  const emptyRows = pageSize - rows.length;
  const [selectedRow, setSelectedRow] = useState(0);

  const handleGlobalFilterChange = (newGlobalFilter) => {
    if (newGlobalFilter !== globalFilter) {
      onGlobalFilterChange(newGlobalFilter);
    }
  };

  const handleSort = (_, sortBy) => {
    onSortBy(sortBy);
  };

  const handleChangeRowsPerPage = (event) => {
    onRowsPerPageChange(Number(event.target.value));
  };
  const handleChangePage = (_, page) => {
    // reset the selected;
    // TODO: maybe should be handled in individual implementation
    setSelectedRow(0);
    onPageChange(page);
  };
  const handleClick = (event, row, i) => {
    setSelectedRow(i);
    onRowClick(row, i);
  };

  return (
    <GridLegacy container direction="column">
      <GridLegacy item container>
        <StyledFilterGrid item xs={12} md={4} lg={4}>
          {showGlobalFilter && <GlobalFilter onGlobalFilterChange={handleGlobalFilterChange} />}
        </StyledFilterGrid>
        <StyledDownloaderGrid
          item
          xs={12}
          md={8}
          lg={8}
          sx={{ display: "flex", justifyContent: "end", gap: 1 }}
        >
          {dataDownloader && (
            <DataDownloader
              columns={dataDownloaderColumns || columns}
              rows={dataDownloaderRows}
              fileStem={dataDownloaderFileStem}
              query={query}
              variables={variables}
            />
          )}
        </StyledDownloaderGrid>
      </GridLegacy>
      <StyledTableContainer sx={containerSx}>
        <StyledMuiTable fixed={fixed} sx={tableSx}>
          <TableHeader
            columns={columns}
            headerGroups={headerGroups}
            noWrapHeader={noWrapHeader}
            order={order}
            sortBy={sortBy}
            onRequestSort={handleSort}
          />
          <TableBody>
            {rows.map((row, i) => (
              <TableRow
                columns={columns}
                hover={hover}
                isFixedRow={row.isFixedRow}
                key={i}
                row={row}
                noWrap={noWrap}
                onClick={(event) => handleClick(event, row, i)}
                selected={rowIsSelectable && selectedRow === i}
              />
            ))}
            {page > 0 && noWrap && emptyRows > 0 && (
              <MUITableRow style={{ height: `${1.6875 * emptyRows}rem` }}>
                <StyledEmptyRowCell colSpan={columns.length}>
                  {!rows.length && "No data"}
                </StyledEmptyRowCell>
              </MUITableRow>
            )}
          </TableBody>
        </StyledMuiTable>
      </StyledTableContainer>
      <GridLegacy item container justifyContent="center">
        {loading && <StyledProgress size={22} />}
      </GridLegacy>
      <GridLegacy item container justifyContent="flex-end">
        {showPagination ? (
          <TablePagination
            ActionsComponent={ActionsComponent}
            backIconButtonProps={{ disabled: loading || page === 0 }}
            nextIconButtonProps={{
              disabled: loading || page >= rowCount / pageSize - 1,
            }}
            component="div"
            count={rowCount}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            page={page}
            rowsPerPage={pageSize}
            rowsPerPageOptions={rowsPerPageOptions}
            SelectProps={{
              native: true,
              inputProps: {
                "aria-label": "Rows per page select dropdown",
              },
            }}
          />
        ) : (
          <StyledPaginationPlaceholder />
        )}
      </GridLegacy>
    </GridLegacy>
  );
};

export default Table;
