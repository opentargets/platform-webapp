import { useEffect, useRef } from "react";
import { AddToReportButton, getLiveCaptureKey, registerLiveCapture } from "ui";
import { useAotfQueryState } from "../context/AssociationsQueryContext";
import { useAotfURLState } from "../context/AssociationsURLContext";
import { AOTF_STATE_KEY, getAotfDefinition, useCaptureAotfSnapshot } from "./aotfReportSection";

/**
 * "Add to Report" for the associations table on an entity page. Adds whichever
 * view is showing (associations or prioritisation) with the current filters,
 * weights, sorting and pinned rows. Must render inside the toolkit's providers.
 */
function AotfAddToReport({ label }: { label?: string }) {
  const { id, entity } = useAotfQueryState();
  const { displayedTable } = useAotfURLState();
  const captureSnapshot = useCaptureAotfSnapshot();
  const definition = getAotfDefinition(displayedTable, entity);

  const captureRef = useRef(captureSnapshot);
  captureRef.current = captureSnapshot;

  // Lets the report inspector "Update from live page" for this entity + view
  useEffect(
    () =>
      registerLiveCapture(getLiveCaptureKey(entity, definition.id, id), () => ({
        [AOTF_STATE_KEY]: captureRef.current(),
      })),
    [entity, definition.id, id]
  );

  return (
    <AddToReportButton
      definition={definition}
      // Just enough for AddToReportButton to read entityId/entityLabel; rows are refetched
      request={{ loading: false, error: null, data: { [entity]: { id, name: label } }, variables: { id } }}
      entity={entity}
      selectedView="table"
      onCaptureState={() => ({ [AOTF_STATE_KEY]: captureSnapshot() })}
    />
  );
}

export default AotfAddToReport;
