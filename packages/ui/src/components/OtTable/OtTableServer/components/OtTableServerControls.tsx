import type { DocumentNode } from "@apollo/client";
import { Box, GridLegacy } from "@mui/material";
import type { Table } from "@tanstack/react-table";
import type { ReactElement } from "react";
import DataDownloader from "../../../DataDownloader";
import OtTableColumnVisibility from "../../OtTableColumnVisibility";
import OtTableSearch from "../../OtTableSearch";
import type { OtTableColumn } from "../../types/tableTypes";

type OtTableServerControlsProps<Row extends object> = {
  table: Table<Row>;
  columns: OtTableColumn<Row>[];
  onSearch: (term: string) => void;
  showGlobalFilter: boolean;
  globalFilterPlaceholderText?: string;
  showColumnVisibilityControl: boolean;
  dataDownloader: boolean;
  dataDownloaderColumns?: OtTableColumn<Row>[];
  dataDownloaderFileStem?: string;
  /** resolves the whole dataset for the export */
  downloadRows: () => Promise<Row[]>;
  query: DocumentNode;
  /** variables shown with the query in the API playground */
  playgroundVariables: Record<string, unknown>;
  wrapControls?: boolean | Record<string, unknown>;
};

/** search box, column visibility menu and data downloader, above the table */
function OtTableServerControls<Row extends object>({
  table,
  columns,
  onSearch,
  showGlobalFilter,
  globalFilterPlaceholderText,
  showColumnVisibilityControl,
  dataDownloader,
  dataDownloaderColumns,
  dataDownloaderFileStem,
  downloadRows,
  query,
  playgroundVariables,
  wrapControls,
}: OtTableServerControlsProps<Row>): ReactElement {
  const searchControl = showGlobalFilter ? (
    <OtTableSearch setGlobalSearchTerm={onSearch} placeholderText={globalFilterPlaceholderText} />
  ) : null;

  const rightControls = (
    <>
      {showColumnVisibilityControl && <OtTableColumnVisibility table={table} />}
      {dataDownloader && (
        <DataDownloader
          columns={dataDownloaderColumns || columns}
          rows={downloadRows}
          fileStem={dataDownloaderFileStem}
          query={query.loc?.source.body}
          variables={playgroundVariables}
        />
      )}
    </>
  );

  return wrapControls ? (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        flexDirection: "row-reverse",
        justifyContent: "space-between",
        ...(typeof wrapControls === "object" ? wrapControls : {}),
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "end", gap: 1 }}>{rightControls}</Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "left",
          width: { xs: "100%", sm: "fit-content", md: "100%" },
        }}
      >
        <Box sx={{ width: "100%", maxWidth: "210px" }}>{searchControl}</Box>
      </Box>
    </Box>
  ) : (
    <GridLegacy
      container
      sx={{ display: "flex", justifyContent: "space-between", gap: { xs: 2, md: 0 } }}
    >
      <GridLegacy item sm={12} md={4}>
        {searchControl}
      </GridLegacy>
      <GridLegacy item sm={12} md={8} sx={{ display: "flex", justifyContent: "end", gap: 1 }}>
        {rightControls}
      </GridLegacy>
    </GridLegacy>
  );
}

export default OtTableServerControls;
