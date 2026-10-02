import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { DISPLAY_MODE } from "../associationsUtils";
import { useAotfParam } from "./AotfParamsContext";

const NO_ENTRIES: string[] = [];
const splitEntries = (str: string) => str.split(",");
const joinEntries = (arr: string[]) => arr.join(",");
const identity = (v: string) => v;

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
  const [displayedTable, setDisplayedTable] = useAotfParam<string>(
    "table",
    DISPLAY_MODE.ASSOCIATIONS,
    identity,
    identity
  );

  const [pinnedEntries, setPinnedEntries] = useAotfParam(
    "pinned",
    NO_ENTRIES,
    joinEntries,
    splitEntries
  );

  const [uploadedEntries, setUploadedEntries] = useAotfParam(
    "uploaded",
    NO_ENTRIES,
    joinEntries,
    splitEntries
  );

  const [activeHeadersControlls, setActiveHeadersControlls] = useAotfParam(
    "weights",
    false,
    (v: boolean) => (v ? "1" : ""),
    (s: string) => s === "1"
  );

  const [focusParam, setFocusParam] = useAotfParam("focus", "", identity, identity);

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
