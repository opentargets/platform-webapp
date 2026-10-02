import { useEffect } from "react";
import { useExportTableSink } from "ui";
import { isPartnerPreview, DISPLAY_MODE } from "../associationsUtils";
import { useAotfData } from "../context/AssociationsDataContext";
import { useAotfQueryState } from "../context/AssociationsQueryContext";
import { useAotfURLState } from "../context/AssociationsURLContext";
import dataSourcesCols from "../static_datasets/dataSourcesAssoc";
import prioritizationCols from "../static_datasets/prioritisationColumns";

const SINK_KEY = "aotf";

/**
 * Publishes the rows shown (pinned, uploaded, then the current page) to the
 * export RenderHost as plain values. Outside an export render the sink is null
 * and this does nothing.
 */
function AotfExportTable(): null {
  const sink = useExportTableSink();
  const { entity } = useAotfQueryState();
  const { displayedTable } = useAotfURLState();
  const { data, loading, pinnedData, pinnedLoading, uploadedData, uploadedLoading } =
    useAotfData();

  useEffect(() => {
    if (!sink) return;
    if (loading || pinnedLoading || uploadedLoading) {
      sink(SINK_KEY, { loading: true });
      return;
    }

    const isAssociations = displayedTable === DISPLAY_MODE.ASSOCIATIONS;
    const dataProp = isAssociations ? "dataSources" : "prioritisations";
    const valueCols = (isAssociations ? dataSourcesCols : prioritizationCols).filter(
      (c: any) => !(c.isPrivate && c.isPrivate !== isPartnerPreview)
    );
    const nameKey = entity === "disease" ? "targetSymbol" : "diseaseName";
    const grouped = pinnedData.length > 0 || uploadedData.length > 0;

    const groups: [string, any[]][] = [
      ["Pinned", pinnedData],
      ["Uploaded", uploadedData],
      ["All", data],
    ];
    const rows = groups.flatMap(([group, groupRows]) =>
      groupRows.map(row => ({
        ...(grouped && { group }),
        name: row[nameKey],
        score: row.score,
        ...Object.fromEntries(valueCols.map(c => [c.id, row[dataProp]?.[c.id] ?? ""])),
      }))
    );

    sink(SINK_KEY, {
      loading: false,
      table: {
        columns: [
          ...(grouped ? [{ key: "group", label: "Group" }] : []),
          { key: "name", label: entity === "disease" ? "Target" : "Disease" },
          { key: "score", label: "Association score" },
          ...valueCols.map(c => ({ key: c.id, label: c.label })),
        ],
        rows,
        totalRows: rows.length,
      },
    });
  }, [
    sink,
    entity,
    displayedTable,
    data,
    loading,
    pinnedData,
    pinnedLoading,
    uploadedData,
    uploadedLoading,
  ]);

  useEffect(() => () => sink?.(SINK_KEY, null), [sink]);

  return null;
}

export default AotfExportTable;
