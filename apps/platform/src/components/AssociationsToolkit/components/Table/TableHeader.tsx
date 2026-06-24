import { useState } from "react";
import { flexRender } from "@tanstack/react-table";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowDownWideShort, faBook, faLock } from "@fortawesome/free-solid-svg-icons";
import { Box, Grid } from "@mui/material";
import { styled } from "@mui/material/styles";

import AggregationsRow from "./AggregationsRow";
import { useAotfQueryState, useAotfQueryDispatch } from "../../context/AssociationsQueryContext";
import { useAotfURLState } from "../../context/AssociationsURLContext";
import { GridContainer, NaimingHeaderZone, MetricsHeaderZone, TheaderContainer } from "../layout";

/* --- Styled header cells --- */

const NameHeaderCell = styled("div")({
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  flexGrow: 1,
});

interface RotateHeaderCellProps {
  isScore?: boolean;
}

const RotateHeaderCell = styled("div", {
  shouldForwardProp: prop => prop !== "isScore",
})<RotateHeaderCellProps>(({ isScore }) => ({
  height: "140px",
  whiteSpace: "nowrap",
  marginRight: isScore ? "10px" : 0,
  "& > div": {
    transform: "translate(0, 110px) rotate(315deg)",
    width: "24px",
    display: "flex",
    alignItems: "center",
  },
  "&:hover a": {
    color: "var(--primary-color)",
  },
}));

const DocsLink = styled("a")({
  color: "#fafafa",
  transition: "all ease-in-out 150ms",
});

/* --- Header zone layout --- */

interface HeaderZoneProps {
  id: string;
  columnsCount: number;
  children: React.ReactNode;
  [key: string]: any;
}

function HeaderZone({ id, columnsCount, children, ...props }: HeaderZoneProps) {
  if (id.includes("naiming-cols"))
    return <NaimingHeaderZone {...props}>{children}</NaimingHeaderZone>;
  if (id.includes("metrics-cols"))
    return <MetricsHeaderZone {...props}>{children}</MetricsHeaderZone>;
  return (
    <GridContainer columnsCount={columnsCount} {...props}>
      {children}
    </GridContainer>
  );
}

interface HeaderCellProps {
  header: any;
  onEnter: (header: any) => void;
  onLeave: () => void;
}

function HeaderCell({ header, onEnter, onLeave }: HeaderCellProps) {
  const inner = header.isPlaceholder ? null : (
    <Box
      sx={header.column.getCanSort() ? { cursor: "pointer", userSelect: "none" } : undefined}
      onMouseEnter={() => onEnter(header)}
      onMouseLeave={onLeave}
    >
      <div onClick={header.column.getToggleSortingHandler()}>
        {flexRender(header.column.columnDef.header, header.getContext())}
      </div>
      {header.column.columnDef.isPrivate && (
        <Box component="span" sx={{ ml: "5px" }}>
          <FontAwesomeIcon icon={faLock} />
        </Box>
      )}
      {{
        desc: (
          <Box component="span" sx={{ ml: "5px" }}>
            <FontAwesomeIcon icon={faArrowDownWideShort} />
          </Box>
        ),
      }[header.column.getIsSorted() as string] ?? null}
      {header.column.columnDef.docsLink && (
        <DocsLink rel="noreferrer" target="_blank" href={header.column.columnDef.docsLink}>
          <Box component="span" sx={{ ml: "5px" }}>
            <FontAwesomeIcon icon={faBook} />
          </Box>
        </DocsLink>
      )}
    </Box>
  );

  if (header.id === "name") return <NameHeaderCell>{inner}</NameHeaderCell>;
  if (header.id === "score") return <RotateHeaderCell isScore>{inner}</RotateHeaderCell>;
  if (header.id === "noveltyIcon") return <RotateHeaderCell sx={{ ml: 2 }}>{inner}</RotateHeaderCell>;
  return <RotateHeaderCell>{inner}</RotateHeaderCell>;
}

interface TableHeaderProps {
  table: any;
  cols: any[];
}

function TableHeader({ table, cols }: TableHeaderProps) {
  const { id } = useAotfQueryState();
  const { displayedTable, setActiveHeadersControlls } = useAotfURLState();
  const { handleAggregationClick } = useAotfQueryDispatch();
  const [activeAggregation, setActiveAggegation] = useState<string | null>(null);

  const onEnterHoverHeader = ({ id: elementId, column }: { id: string; column: any }) => {
    if (elementId === "score" || elementId === "name") return;
    setActiveAggegation(column.columnDef.aggregation);
  };

  const onLeaveHoverHeader = () => {
    if (id === "score" || id === "name") return;
    setActiveAggegation(null);
  };

  const highLevelHeaders = table.getHeaderGroups()[0].headers;

  return (
    <TheaderContainer data-testid="associations-table-header">
      <Grid container direction="row" wrap="nowrap">
        {highLevelHeaders.map((highLevelHeader: any) => (
          <HeaderZone
            id={highLevelHeader.id}
            columnsCount={cols.length}
            key={highLevelHeader.id}
          >
            {highLevelHeader.subHeaders.map((header: any) => (
              <HeaderCell
                key={header.id}
                header={header}
                onEnter={onEnterHoverHeader}
                onLeave={onLeaveHoverHeader}
              />
            ))}
          </HeaderZone>
        ))}
      </Grid>
      <AggregationsRow
        handleAggregationClick={handleAggregationClick}
        columnsCount={cols.length}
        table={displayedTable}
        active={activeAggregation}
        setActiveHeadersControlls={setActiveHeadersControlls}
      />
    </TheaderContainer>
  );
}

export default TableHeader;
