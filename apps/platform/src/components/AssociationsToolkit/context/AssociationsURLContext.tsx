import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { useStateParams } from "ui";
import { DISPLAY_MODE } from "../associationsUtils";

export interface URLContextState {
  displayedTable: string;
  setDisplayedTable: (v: string) => void;
  pinnedEntries: string[];
  setPinnedEntries: (v: string[]) => void;
  uploadedEntries: string[];
  setUploadedEntries: (v: string[]) => void;
  activeHeadersControlls: boolean;
  setActiveHeadersControlls: (open: boolean) => void;
  focusParam: string;
  setFocusParam: (v: string) => void;
}

const AssociationsURLContext = createContext<URLContextState | null>(null);

export function AssociationsURLProvider({ children }: { children: ReactNode }) {
  const [displayedTable, setDisplayedTable] = useStateParams(
    DISPLAY_MODE.ASSOCIATIONS,
    "table",
    (v: string) => v,
    (v: string) => v
  );

  const [pinnedEntries, setPinnedEntries] = useStateParams(
    [],
    "pinned",
    (arr: string[]) => arr.join(","),
    (str: string) => str.split(",")
  );

  const [uploadedEntries, setUploadedEntries] = useStateParams(
    [],
    "uploaded",
    (arr: string[]) => arr.join(","),
    (str: string) => str.split(",")
  );

  const [activeHeadersControlls, setActiveHeadersControlls] = useStateParams(
    false,
    "weights",
    (v: boolean) => (v ? "1" : ""),
    (s: string) => s === "1"
  );

  const [focusParam, setFocusParam] = useStateParams(
    "",
    "focus",
    (v: string) => v,
    (v: string) => v
  );

  const value = useMemo<URLContextState>(
    () => ({
      displayedTable,
      setDisplayedTable,
      pinnedEntries,
      setPinnedEntries,
      uploadedEntries,
      setUploadedEntries,
      activeHeadersControlls,
      setActiveHeadersControlls,
      focusParam,
      setFocusParam,
    }),
    [
      displayedTable,
      setDisplayedTable,
      pinnedEntries,
      setPinnedEntries,
      uploadedEntries,
      setUploadedEntries,
      activeHeadersControlls,
      setActiveHeadersControlls,
      focusParam,
      setFocusParam,
    ]
  );

  return <AssociationsURLContext.Provider value={value}>{children}</AssociationsURLContext.Provider>;
}

export function useAotfURLState(): URLContextState {
  const ctx = useContext(AssociationsURLContext);
  if (!ctx) throw new Error("useAotfURLState must be used within AssociationsURLProvider");
  return ctx;
}
