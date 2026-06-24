import { Fragment } from "react";
import { flexRender } from "@tanstack/react-table";
import { Fade, Box, Typography } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilterCircleXmark } from "@fortawesome/free-solid-svg-icons";
import { grey } from "@mui/material/colors";

import { useAotfQueryState } from "../../context/AssociationsQueryContext";
import { useAotfURLState } from "../../context/AssociationsURLContext";
import { useAssociationsFocus } from "../../context/AssociationsFocusContext";

import { SectionRender, SectionRendererWrapper } from "./SectionRender";
import { NoveltyInlinePanel } from "./NoveltyInlinePanel";
import RowInteractorsWrapper from "./RowInteractors/RowInteractorsWrapper";
import RowInteractorsTable from "./RowInteractors/RowInteractorsTable";
import {
  RowContainer,
  RowsContainer,
  TableBodyContent,
  NaimingBodyZone,
  EntityBodyZone,
  MetricsBodyZone,
} from "../layout";
import { rowNameProperty, TABLE_PREFIX } from "../../associationsUtils";

interface BodyZoneProps {
  id: string;
  columnsCount: number;
  children: React.ReactNode;
  [key: string]: any;
}

function BodyZone({ id, columnsCount, children, ...props }: BodyZoneProps) {
  if (id.includes("naiming-cols")) return <NaimingBodyZone {...props}>{children}</NaimingBodyZone>;
  if (id.includes("metrics-cols")) return <MetricsBodyZone {...props}>{children}</MetricsBodyZone>;
  return (
    <EntityBodyZone columnsCount={columnsCount} {...props}>
      {children}
    </EntityBodyZone>
  );
}

function getIsRowActive(
  prefix: string,
  row: any,
  focusState: any[] = [],
  parentRow: string,
  parentTable: string
): boolean {
  if (prefix === TABLE_PREFIX.INTERACTORS) {
    return focusState.some(
      entry =>
        entry.row === parentRow &&
        entry.table === parentTable &&
        entry.interactorsRow === row.id &&
        entry.interactorsSection !== null
    );
  }

  return focusState.some(
    entry =>
      entry.row === row.id &&
      entry.table === prefix &&
      (entry.section !== null || entry.interactors)
  );
}

function getFocusSection(
  prefix: string,
  row: any,
  focusState: any[],
  parentRow: string,
  parentTable: string
): string[] | undefined {
  if (prefix === TABLE_PREFIX.INTERACTORS) {
    return focusState.find(
      entry =>
        entry.row === parentRow &&
        entry.table === parentTable &&
        entry.interactorsRow === row.id &&
        entry.interactorsSection !== null
    )?.interactorsSection;
  }

  return focusState.find(
    entry => entry.row === row.id && entry.table === prefix && entry.section !== null
  )?.section;
}

function EmptyMessage() {
  return (
    <Box
      sx={{
        width: "auto",
        px: 5,
        py: 6,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Box
        sx={{
          borderRadius: "50%",
          backgroundColor: grey[300],
          display: "flex",
          width: "100px",
          height: "100px",
          justifyContent: "center",
          alignItems: "center",
          mb: 2,
        }}
      >
        <FontAwesomeIcon size="3x" icon={faFilterCircleXmark} />
      </Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        No results found
      </Typography>
      <Typography variant="body1">
        Try adjust your search or filter to find what you looking for.
      </Typography>
    </Box>
  );
}

const borderStyle = `1px solid ${grey[400]}`;

interface TableBodyProps {
  core: any;
  cols: any[];
  noInteractors?: boolean;
}

function TableBody({ core, cols, noInteractors }: TableBodyProps) {
  const { id, entity, entityToGet } = useAotfQueryState();
  const { displayedTable } = useAotfURLState();

  const focusState = useAssociationsFocus();

  const { rows } = core.getRowModel();
  const { prefix, parentTable, parentRow } = core.getState();

  if (prefix === TABLE_PREFIX.PINNING && rows.length < 1) return <></>;

  if (prefix === TABLE_PREFIX.INTERACTORS || prefix === TABLE_PREFIX.CORE)
    if (rows.length < 1) return <EmptyMessage />;

  const nameProperty = rowNameProperty[entity];
  const highLevelHeaders = core.getHeaderGroups()[0].headers;

  return (
    <Fade in>
      <div>
        <TableBodyContent prefix={prefix}>
          <RowsContainer>
            {rows.map((row: any, index: number) => (
              <Fragment key={row.id}>
                <RowContainer
                  data-testid={`table-row-${prefix.toLowerCase()}-${index}`}
                  interactors={prefix === TABLE_PREFIX.INTERACTORS}
                  rowExpanded={
                    focusState.filter((e: any) => e.row === row.id && e.table === prefix).length > 0
                  }
                >
                  {highLevelHeaders.map((columnGroup: any) => (
                    <BodyZone
                      id={columnGroup.id}
                      columnsCount={cols.length}
                      key={columnGroup.id}
                    >
                      {columnGroup.subHeaders.map((column: any) => {
                        const cell = row.getVisibleCells().find((el: any) => el.column.id === column.id);
                        return (
                          <div key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </div>
                        );
                      })}
                    </BodyZone>
                  ))}
                </RowContainer>

                {(() => {
                  const noveltyEntry = focusState.find(
                    (e: any) => e.row === row.id && e.table === prefix && e.noveltyPanelOpen
                  );
                  const isNoveltyOpen = !!noveltyEntry;
                  const isSectionActive = getIsRowActive(prefix, row, focusState, parentRow, parentTable);
                  const showExpansion = isNoveltyOpen || isSectionActive;

                  return (
                    <Box
                      sx={{
                        position: "relative",
                        overflow: "hidden",
                        borderBottom: prefix === TABLE_PREFIX.INTERACTORS ? null : borderStyle,
                        borderLeft: prefix === TABLE_PREFIX.INTERACTORS ? null : borderStyle,
                        borderRight: prefix === TABLE_PREFIX.INTERACTORS ? null : borderStyle,
                        marginBottom: 1,
                        display: showExpansion ? "block" : "none",
                      }}
                    >
                      {isNoveltyOpen ? (
                        <>
                          <NoveltyInlinePanel rowId={row.id} />
                          {!noInteractors && (
                            <RowInteractorsWrapper rowId={row.id} parentTable={prefix}>
                              <RowInteractorsTable
                                row={row}
                                columns={core._getColumnDefs()}
                                nameProperty={nameProperty}
                                parentTable={prefix}
                              />
                            </RowInteractorsWrapper>
                          )}
                        </>
                      ) : (
                        <>
                          <SectionRendererWrapper
                            section={getFocusSection(prefix, row, focusState, parentRow, parentTable)}
                          >
                            <section>
                              <SectionRender
                                id={id}
                                entity={entity}
                                table={prefix}
                                row={row}
                                entityToGet={entityToGet}
                                nameProperty={nameProperty}
                                displayedTable={displayedTable}
                                cols={cols}
                                section={getFocusSection(prefix, row, focusState, parentRow, parentTable)}
                              />
                            </section>
                          </SectionRendererWrapper>
                          {!noInteractors && (
                            <RowInteractorsWrapper rowId={row.id} parentTable={prefix}>
                              <RowInteractorsTable
                                row={row}
                                columns={core._getColumnDefs()}
                                nameProperty={nameProperty}
                                parentTable={prefix}
                              />
                            </RowInteractorsWrapper>
                          )}
                        </>
                      )}
                    </Box>
                  );
                })()}
              </Fragment>
            ))}
          </RowsContainer>
        </TableBodyContent>
      </div>
    </Fade>
  );
}

export default TableBody;
