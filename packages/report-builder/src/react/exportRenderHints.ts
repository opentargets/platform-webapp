import { createContext, useContext } from "react";
import type { ExportRenderHints } from "../core";

export type { ExportRenderHints };

/**
 * Only provided by the export RenderHost. Lets a widget adapt its figure to the export
 * target (e.g. the associations table draws only its top rows on a slide). Outside an
 * export render this is null.
 */
export const ExportRenderHintsContext = createContext<ExportRenderHints | null>(null);

export const useExportRenderHints = () => useContext(ExportRenderHintsContext);
