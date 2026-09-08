/* eslint-disable */
import _ from "lodash";

import { StyledBodyCell, StyledTableRow } from "./tableStyles";

function TableRow({ columns, hover, isFixedRow, noWrap, row, style, onClick, selected }) {
  return (
    <StyledTableRow isFixedRow={isFixedRow} hover={hover} onClick={onClick} selected={selected}>
      {columns.map((column, index) => (
        <StyledBodyCell
          align={column.align ? column.align : column.numeric ? "right" : "left"}
          className={column.classes?.cell}
          numeric={column.numeric}
          sticky={column.sticky}
          noWrap={noWrap}
          component={column.sticky ? "th" : "td"}
          key={index}
          style={{ ...column.style, ...row.rowStyle, ...style }}
        >
          {column.renderCell
            ? column.renderCell(row)
            : _.get(row, column.propertyPath || column.id, "N/A")}
        </StyledBodyCell>
      ))}
    </StyledTableRow>
  );
}

export default TableRow;
