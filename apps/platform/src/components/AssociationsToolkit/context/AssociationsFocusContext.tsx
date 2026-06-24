import type { ReactElement, Dispatch } from "react";
import { createContext, useContext, useReducer, useEffect, useMemo, useRef } from "react";
import {
  TABLE_PREFIX,
  InteractorsSource,
  INTERACTORS_SOURCES,
  INTERACTORS_SOURCE_THRESHOLD,
} from "../associationsUtils";
import { useAotfQueryState } from "./AssociationsQueryContext";
import { useAotfURLState } from "./AssociationsURLContext";

// Types
export type FocusElementTable = "core" | "pinned" | "upload";

export type FocusElement = {
  table: FocusElementTable;
  row: string;
  interactorsRow: string | null;
  interactorsSource: InteractorsSource | null;
  interactors: boolean;
  section: null | [string, string];
  interactorsSection: null | [string, string];
  interactorsThreshold: number | null;
  noveltyPanelOpen: boolean;
};

export type FocusState = FocusElement[];

export enum FocusActionType {
  RESET = "RESET",
  SET_INTERACTORS_ON = "SET_INTERACTORS_ON",
  SET_INTERACTORS_OFF = "SET_INTERACTORS_OFF",
  SET_INTERACTORS_SECTION = "SET_INTERACTORS_SECTION",
  SET_INTERACTORS_THRESHOLD = "SET_INTERACTORS_THRESHOLD",
  CLEAR_INTERACTORS_SECTION = "CLEAR_INTERACTORS_SECTION",
  SET_FOCUS_SECTION = "SET_FOCUS_SECTION",
  CLEAR_FOCUS_CONTEXT_MENU = "CLEAR_FOCUS_CONTEXT_MENU",
  SET_FOCUS_CONTEXT_MENU = "SET_FOCUS_CONTEXT_MENU",
  SET_INTERACTORS_SOURCE = "SET_INTERACTORS_SOURCE",
  TOGGLE_NOVELTY_PANEL = "TOGGLE_NOVELTY_PANEL",
}

export type FocusAction =
  | { type: FocusActionType.RESET }
  | { type: FocusActionType.TOGGLE_NOVELTY_PANEL; focus: { row: string; table: FocusElementTable } }
  | {
      type: FocusActionType.SET_FOCUS_CONTEXT_MENU;
      focus: { row: string; table: FocusElementTable };
    }
  | {
      type: FocusActionType.CLEAR_FOCUS_CONTEXT_MENU;
      focus: { row: string; table: FocusElementTable };
    }
  | {
      type: FocusActionType.SET_FOCUS_SECTION;
      focus: { row: string; table: FocusElementTable; section: [string, string] };
    }
  | { type: FocusActionType.SET_INTERACTORS_ON; focus: { row: string; table: FocusElementTable } }
  | { type: FocusActionType.SET_INTERACTORS_OFF; focus: { row: string; table: FocusElementTable } }
  | {
      type: FocusActionType.SET_INTERACTORS_SOURCE;
      focus: { row: string; table: FocusElementTable; source: InteractorsSource };
    }
  | {
      type: FocusActionType.SET_INTERACTORS_SECTION;
      focus: {
        row: string;
        table: FocusElementTable;
        section: [string, string];
        interactorsRow: string;
      };
    }
  | {
      type: FocusActionType.SET_INTERACTORS_THRESHOLD;
      focus: {
        row: string;
        table: FocusElementTable;
        interactorsThreshold: number;
      };
    };

// Default values and context setup
const defaultFocusElement: FocusElement = {
  table: TABLE_PREFIX.CORE,
  row: "",
  section: null,
  interactors: false,
  interactorsRow: null,
  interactorsSection: null,
  interactorsSource: INTERACTORS_SOURCES.INTACT,
  interactorsThreshold: INTERACTORS_SOURCE_THRESHOLD[INTERACTORS_SOURCES.INTACT],
  noveltyPanelOpen: false,
};

const AssociationsFocusContext = createContext<FocusState>([]);
const AssociationsFocusDispatchContext = createContext<Dispatch<FocusAction>>(() => undefined);

// Helper functions for element manipulation
function findElementIndex(state: FocusState, table: FocusElementTable, row: string): number {
  return state.findIndex(element => element.table === table && element.row === row);
}

function isSameSection(current: [string, string] | null, target: [string, string]): boolean {
  return current !== null && current[0] === target[0] && current[1] === target[1];
}

function updateElementAtIndex(
  state: FocusState,
  index: number,
  updates: Partial<FocusElement>
): FocusState {
  return [...state.slice(0, index), { ...state[index], ...updates }, ...state.slice(index + 1)];
}

function removeElementAtIndex(state: FocusState, index: number): FocusState {
  return [...state.slice(0, index), ...state.slice(index + 1)];
}

/**
 * Creates a new focus element with defaults overridden by provided params
 */
function createFocusElement(params: Partial<FocusElement> = {}): FocusElement {
  return {
    ...defaultFocusElement,
    ...params,
  };
}

/**
 * Gets the current state of a focus element based on table, row, and section
 * Returns active states for different aspects of the focus element
 */
function getFocusElementState(
  state: FocusState,
  {
    table,
    row,
    section,
  }: { table: FocusElementTable; row: string; section: [string, string] | null }
) {
  let sectionActive = false;
  let rowActive = false;
  let tableActive = false;
  let interactorsActive = false;
  let hasSectionActive = false;

  // Find matching elements in state
  for (const el of state) {
    if (!tableActive && el.table === table) {
      tableActive = true;
    }

    if (el.row === row && el.table === table) {
      rowActive = true;
      interactorsActive = el.interactors;
      hasSectionActive = Array.isArray(el.section);

      // Check if section matches
      if (section && el.section && el.section[0] === section[0] && el.section[1] === section[1]) {
        sectionActive = true;
        break;
      }
    }
  }

  return { sectionActive, rowActive, tableActive, interactorsActive, hasSectionActive };
}

// Handlers for SET_FOCUS_SECTION
function updateExistingElementSection(
  state: FocusState,
  elementIndex: number,
  section: [string, string]
): FocusState {
  const element = state[elementIndex];
  const isSameSectionActive = isSameSection(element.section, section);

  if (isSameSectionActive && element.interactors) {
    // Close section but keep element for interactors
    return updateElementAtIndex(state, elementIndex, { section: null });
  }

  if (isSameSectionActive && !element.interactors) {
    // Remove element entirely
    return removeElementAtIndex(state, elementIndex);
  }

  // Update to new section, close novelty panel (replace behaviour)
  return updateElementAtIndex(state, elementIndex, {
    section,
    interactorsRow: null,
    interactorsSection: null,
    noveltyPanelOpen: false,
  });
}

function addNewElementWithSection(
  state: FocusState,
  table: FocusElementTable,
  row: string,
  section: [string, string]
): FocusState {
  return [...state, createFocusElement({ table, row, section })];
}

function resetOtherElementsInTable(
  state: FocusState,
  table: FocusElementTable,
  targetRow: string
): FocusState {
  return state.filter(element => {
    // Keep the target element
    if (element.table === table && element.row === targetRow) {
      return true;
    }

    // Handle other elements in same table
    if (element.table === table) {
      if (element.interactors) {
        // Reset but keep element
        element.section = null;
        element.interactorsSection = null;
        element.interactorsRow = null;
        return true;
      }
      // Remove if no interactors
      return false;
    }

    // Keep elements from different tables
    return true;
  });
}

function handleSetFocusSection(focusState: FocusState, action: FocusAction): FocusState {
  if (action.type !== FocusActionType.SET_FOCUS_SECTION) return focusState;

  const { table, row, section } = action.focus;
  const elementIndex = findElementIndex(focusState, table, row);

  // Step 1: Update or create the target element
  const updatedState =
    elementIndex !== -1
      ? updateExistingElementSection(focusState, elementIndex, section)
      : addNewElementWithSection(focusState, table, row, section);

  // Step 2: Reset other elements in the same table
  return resetOtherElementsInTable(updatedState, table, row);
}

// Handlers for SET_INTERACTORS_ON
function updateExistingElementInteractors(
  state: FocusState,
  table: FocusElementTable,
  row: string
): FocusState {
  return state.reduce<FocusElement[]>((acc, element) => {
    if (element.table === table && element.row === row) {
      // Turn on interactors for target element
      acc.push({ ...element, interactors: true });
    } else if (element.table === table && element.interactors && element.section) {
      // Turn off interactors but keep section
      acc.push({ ...element, interactors: false });
    } else if (element.table === table && element.interactors && !element.section) {
      // Remove elements with only interactors (no section)
      return acc;
    } else {
      // Keep all other elements unchanged
      acc.push(element);
    }
    return acc;
  }, []);
}

function handleSetInteractorsOn(focusState: FocusState, action: FocusAction): FocusState {
  if (action.type !== FocusActionType.SET_INTERACTORS_ON) return focusState;

  const { table, row } = action.focus;
  const elementIndex = findElementIndex(focusState, table, row);

  const updatedElements = updateExistingElementInteractors(focusState, table, row);

  // Add new element if it doesn't exist
  if (elementIndex === -1) {
    return [...updatedElements, createFocusElement({ table, row, interactors: true })];
  }

  return updatedElements;
}

// Handlers for SET_INTERACTORS_OFF
function removeElementsWithoutSections(
  state: FocusState,
  table: FocusElementTable,
  row: string
): FocusState {
  return state.filter(
    element => !(element.table === table && element.row === row && element.section === null)
  );
}

function updateElementsInteractorsOff(
  state: FocusState,
  table: FocusElementTable,
  row: string
): FocusState {
  return state.map(element => {
    if (element.table === table && element.row === row) {
      return {
        ...element,
        interactors: false,
        interactorsSection: null,
      };
    }
    return element;
  });
}

function handleSetInteractorsOff(focusState: FocusState, action: FocusAction): FocusState {
  if (action.type !== FocusActionType.SET_INTERACTORS_OFF) return focusState;

  const { table, row } = action.focus;

  // Remove elements with no section first
  const filteredElements = removeElementsWithoutSections(focusState, table, row);

  // Update existing elements
  return updateElementsInteractorsOff(filteredElements, table, row);
}

// Handlers for SET_INTERACTORS_SECTION
function shouldToggleInteractorsSection(
  element: FocusElement,
  interactorsRow: string,
  section: [string, string]
): boolean {
  return (
    element.interactorsRow === interactorsRow &&
    element.interactorsSection !== null &&
    element.interactorsSection[0] === section[0] &&
    element.interactorsSection[1] === section[1]
  );
}

function updateElementForInteractorsSection(
  element: FocusElement,
  interactorsRow: string,
  section: [string, string]
): FocusElement {
  if (shouldToggleInteractorsSection(element, interactorsRow, section)) {
    // Toggle off
    return {
      ...element,
      interactorsRow: null,
      interactorsSection: null,
    };
  }

  // Set new section
  return {
    ...element,
    interactorsRow,
    interactorsSection: section,
    section: null,
  };
}

function handleSetInteractorsSection(focusState: FocusState, action: FocusAction): FocusState {
  if (action.type !== FocusActionType.SET_INTERACTORS_SECTION) return focusState;

  const { table, row, interactorsRow, section } = action.focus;

  return focusState.reduce<FocusState>((acc, element) => {
    if (element.table === table && element.row === row) {
      // Update target element
      acc.push(updateElementForInteractorsSection(element, interactorsRow, section));
    } else if (element.table === table && element.interactors) {
      // Reset other interactors in same table
      acc.push({
        ...element,
        interactorsRow: null,
        interactorsSection: null,
      });
    } else if (element.table === table && element.section) {
      // Remove elements with only sections in same table
      return acc;
    } else {
      // Keep other elements unchanged
      acc.push(element);
    }
    return acc;
  }, []);
}

// Handlers for SET_INTERACTORS_SOURCE
function updateElementInteractorsSource(
  element: FocusElement,
  source: InteractorsSource
): FocusElement {
  return {
    ...element,
    interactorsSection: null,
    interactorsSource: source,
    interactorsThreshold: INTERACTORS_SOURCE_THRESHOLD[source],
  };
}

function handleSetInteractorsSource(focusState: FocusState, action: FocusAction): FocusState {
  if (action.type !== FocusActionType.SET_INTERACTORS_SOURCE) return focusState;

  const { table, row, source } = action.focus;

  return focusState.map(element => {
    if (element.table === table && element.row === row) {
      return updateElementInteractorsSource(element, source);
    }
    return element;
  });
}

// Handlers for SET_INTERACTORS_THRESHOLD
function updateElementInteractorsThreshold(element: FocusElement, threshold: number): FocusElement {
  return {
    ...element,
    interactorsThreshold: threshold,
  };
}

function handleSetInteractorsThreshold(focusState: FocusState, action: FocusAction): FocusState {
  if (action.type !== FocusActionType.SET_INTERACTORS_THRESHOLD) return focusState;

  const { table, row, interactorsThreshold } = action.focus;

  return focusState.map(element => {
    if (element.table === table && element.row === row) {
      return updateElementInteractorsThreshold(element, interactorsThreshold);
    }
    return element;
  });
}

// Handlers for context menu actions
function shouldAddContextMenuElement(
  state: FocusState,
  table: FocusElementTable,
  row: string
): boolean {
  const { rowActive } = getFocusElementState(state, { table, row, section: null });
  return !rowActive;
}

function handleSetFocusContextMenu(focusState: FocusState, action: FocusAction): FocusState {
  if (action.type !== FocusActionType.SET_FOCUS_CONTEXT_MENU) return focusState;

  const { table, row } = action.focus;

  // Skip if row is already active
  if (!shouldAddContextMenuElement(focusState, table, row)) {
    return focusState;
  }

  // Add new element
  return [...focusState, createFocusElement({ row, table })];
}

function shouldKeepContextMenuElement(
  state: FocusState,
  table: FocusElementTable,
  row: string
): boolean {
  const element = state.find(el => el.table === table && el.row === row);
  if (!element) return false;
  return !!(element.section || element.interactors || element.noveltyPanelOpen);
}

function handleClearFocusContextMenu(focusState: FocusState, action: FocusAction): FocusState {
  if (action.type !== FocusActionType.CLEAR_FOCUS_CONTEXT_MENU) return focusState;

  const { table, row } = action.focus;

  // Keep if row has section or interactors active
  if (shouldKeepContextMenuElement(focusState, table, row)) {
    return focusState;
  }

  // Remove element
  return focusState.filter(element => element.row !== row || element.table !== table);
}

function handleToggleNoveltyPanel(focusState: FocusState, action: FocusAction): FocusState {
  if (action.type !== FocusActionType.TOGGLE_NOVELTY_PANEL) return focusState;
  const { table, row } = action.focus;
  const elementIndex = findElementIndex(focusState, table, row);
  const isOpen = elementIndex !== -1 && focusState[elementIndex].noveltyPanelOpen;

  if (isOpen) {
    // Toggle off — remove element if nothing else keeps it alive
    const el = focusState[elementIndex];
    if (!el.section && !el.interactors) return removeElementAtIndex(focusState, elementIndex);
    return updateElementAtIndex(focusState, elementIndex, { noveltyPanelOpen: false });
  }

  // Toggle on — deactivate all other rows in same table (same as section click behaviour).
  // Keep rows that have interactors but reset their section/novelty; drop the rest.
  const withOthersClosed = focusState.reduce<FocusState>((acc, el) => {
    if (el.table === table && el.row !== row) {
      if (el.interactors) {
        acc.push({ ...el, section: null, interactorsSection: null, interactorsRow: null, noveltyPanelOpen: false });
      }
      // else: drop entirely
    } else {
      acc.push(el);
    }
    return acc;
  }, []);

  if (elementIndex !== -1) {
    return withOthersClosed.map(el =>
      el.table === table && el.row === row
        ? { ...el, noveltyPanelOpen: true, section: null }
        : el
    );
  }
  return [...withOthersClosed, createFocusElement({ table, row, noveltyPanelOpen: true })];
}

/**
 * Main reducer function for focus state
 * Delegates to specialized handlers for complex state transformations
 */
function focusReducer(focusState: FocusState, action: FocusAction): FocusState {
  switch (action.type) {
    case FocusActionType.SET_FOCUS_SECTION:
      return handleSetFocusSection(focusState, action);

    case FocusActionType.SET_FOCUS_CONTEXT_MENU:
      return handleSetFocusContextMenu(focusState, action);

    case FocusActionType.CLEAR_FOCUS_CONTEXT_MENU:
      return handleClearFocusContextMenu(focusState, action);

    case FocusActionType.SET_INTERACTORS_ON:
      return handleSetInteractorsOn(focusState, action);

    case FocusActionType.SET_INTERACTORS_OFF:
      return handleSetInteractorsOff(focusState, action);

    case FocusActionType.SET_INTERACTORS_SECTION:
      return handleSetInteractorsSection(focusState, action);

    case FocusActionType.SET_INTERACTORS_SOURCE:
      return handleSetInteractorsSource(focusState, action);

    case FocusActionType.SET_INTERACTORS_THRESHOLD:
      return handleSetInteractorsThreshold(focusState, action);

    case FocusActionType.TOGGLE_NOVELTY_PANEL:
      return handleToggleNoveltyPanel(focusState, action);

    case FocusActionType.RESET:
      return [];

    default:
      throw Error(`Unknown action: ${(action as any).type}`);
  }
}

// Custom hooks for accessing focus state
/**
 * Creates a selector function to get focus state for a specific element
 */
export function useFocusElementState(
  table: FocusElementTable,
  row: string,
  section: [string, string] | null = null
) {
  const focusState = useContext(AssociationsFocusContext);

  return useMemo(() => {
    return getFocusElementState(focusState, { table, row, section });
  }, [focusState, table, row, section]);
}

/**
 * Gets the focus element for a specific row if it exists
 */
export function useFocusElement(table: FocusElementTable, row: string) {
  const focusState = useContext(AssociationsFocusContext);

  return useMemo(() => {
    return focusState.find(element => element.table === table && element.row === row) || null;
  }, [focusState, table, row]);
}

// Focus URL param helpers
// Format: "table|rowId|flag1,flag2,..."
// Flags: "novelty", "interactors", "sectionId+SectionComponent"
// e.g. "core|ENSG123|novelty,interactors"
//      "core|ENSG123|clinicalTrials+ClinicalTrials,interactors"
function parseFocusParam(param: string): FocusState {
  if (!param) return [];
  const parts = param.split("|");
  if (parts.length < 3) return [];
  const [table, row, flagsStr] = parts;
  if (!table || !row || !flagsStr) return [];

  const flags = flagsStr.split(",");
  const noveltyPanelOpen = flags.includes("novelty");
  const interactors = flags.includes("interactors");
  const sectionFlag = flags.find(f => f.includes("+"));
  let section: [string, string] | null = null;
  if (sectionFlag) {
    const [s0, s1] = sectionFlag.split("+");
    if (s0 && s1) section = [s0, s1];
  }

  if (!noveltyPanelOpen && !interactors && !section) return [];
  return [createFocusElement({ table: table as FocusElementTable, row, noveltyPanelOpen, interactors, section })];
}

function serializeActiveFocus(state: FocusState): string {
  const active = state.filter(el => el.table !== TABLE_PREFIX.INTERACTORS)
    .find(el => el.noveltyPanelOpen || el.interactors || el.section);
  if (!active) return "";

  const flags: string[] = [];
  if (active.noveltyPanelOpen) flags.push("novelty");
  if (active.interactors) flags.push("interactors");
  if (active.section) flags.push(`${active.section[0]}+${active.section[1]}`);

  if (!flags.length) return "";
  return `${active.table}|${active.row}|${flags.join(",")}`;
}

/**
 * Provider component for focus state
 */
export function AssociationsFocusProvider({ children }: { children: ReactElement }): ReactElement {
  const { focusParam, setFocusParam } = useAotfURLState();
  const { id } = useAotfQueryState();
  const hasRendered = useRef(false);

  const [focusState, dispatch] = useReducer(focusReducer, focusParam, parseFocusParam);

  // Reset focus state when ID changes — skip on initial mount so URL-restored state survives
  useEffect(() => {
    if (hasRendered.current) {
      dispatch({ type: FocusActionType.RESET });
    }
    hasRendered.current = true;
  }, [id]);

  // Sync active section to URL whenever focus state changes
  useEffect(() => {
    const newParam = serializeActiveFocus(focusState);
    if (newParam !== focusParam) {
      setFocusParam(newParam);
    }
  }, [focusState]);

  return (
    <AssociationsFocusContext.Provider value={focusState}>
      <AssociationsFocusDispatchContext.Provider value={dispatch}>
        {children}
      </AssociationsFocusDispatchContext.Provider>
    </AssociationsFocusContext.Provider>
  );
}

/**
 * Hook to access the focus state
 */
export function useAssociationsFocus(): FocusState {
  return useContext(AssociationsFocusContext);
}

/**
 * Hook to access the focus dispatch function
 */
export function useAssociationsFocusDispatch(): Dispatch<FocusAction> {
  return useContext(AssociationsFocusDispatchContext);
}
