import { faArrowDown, faArrowUp } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box } from "@mui/material";
import { flexRender, type Table } from "@tanstack/react-table";
import type { ReactElement, RefObject } from "react";
import Tooltip from "../../../Tooltip";
import {
  FontAwesomeIconPadded,
  OtTableCellContainer,
  OtTableContainer,
  OtTableHeader,
  OtTableHeaderText,
  OtTD,
  OtTH,
  OtTR,
} from "../../otTableLayout";

type OtTableServerRowsProps<Row extends object> = {
  table: Table<Row>;
  verticalHeaders: boolean;
  enableRowSelection: boolean;
  /** ref and min-height that keep the body from shrinking on a shorter page */
  bodyRef: RefObject<HTMLDivElement>;
  minHeight: number;
};

/** the header and the rows of the page on display */
function OtTableServerRows<Row extends object>({
  table,
  verticalHeaders,
  enableRowSelection,
  bodyRef,
  minHeight,
}: OtTableServerRowsProps<Row>): ReactElement {
  return (
    <Box
      ref={bodyRef}
      sx={{ w: 1, overflowX: "auto", marginTop: (theme) => theme.spacing(3) }}
      style={{ minHeight }}
    >
      <OtTableContainer data-testid="ot-table">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <OtTH
                  key={header.id}
                  colSpan={header.colSpan}
                  stickyColumn={header.column.columnDef.sticky}
                >
                  {header.isPlaceholder ? null : (
                    <OtTableHeader
                      canBeSorted={header.column.getCanSort()}
                      numeric={header.column.columnDef.numeric}
                    >
                      <OtTableHeaderText
                        verticalHeader={header.column.columnDef.verticalHeader || verticalHeaders}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <Tooltip
                          style={""}
                          title={header.column.columnDef.tooltip}
                          showHelpIcon={!!header.column.columnDef.tooltip}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </Tooltip>
                        {!header.column.getIsSorted() && header.column.getCanSort() && (
                          <FontAwesomeIcon
                            size="sm"
                            icon={faArrowUp}
                            className="sortableColumn"
                          />
                        )}
                        {{
                          asc: <FontAwesomeIconPadded size="sm" icon={faArrowUp} />,
                          desc: <FontAwesomeIconPadded size="sm" icon={faArrowDown} />,
                        }[header.column.getIsSorted() as string] ?? null}
                      </OtTableHeaderText>
                    </OtTableHeader>
                  )}
                </OtTH>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <OtTR
              key={row.id}
              onClick={() => enableRowSelection && row.toggleSelected()}
              enableRowSelection={enableRowSelection}
              isSelected={row.getIsSelected()}
            >
              {row.getVisibleCells().map((cell) => (
                <OtTD key={cell.id} stickyColumn={cell.column.columnDef.sticky}>
                  <OtTableCellContainer numeric={cell.column.columnDef.numeric}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </OtTableCellContainer>
                </OtTD>
              ))}
            </OtTR>
          ))}
        </tbody>
      </OtTableContainer>
    </Box>
  );
}

export default OtTableServerRows;
