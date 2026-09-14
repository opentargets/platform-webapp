import type { DocumentNode } from "@apollo/client";
import { getSuggestedSearch } from "@ot/utils";
import { createContext, useContext, useEffect, useState } from "react";
import useDebounce from "../../hooks/useDebounce";

const searchSuggestions = getSuggestedSearch();

/**********************************
 * GLOBAL SEARCH CONTEXT/PROVIDER *
 **********************************/
type GlobalSearchProviderProps = {
  children: React.ReactNode;
  searchQuery: DocumentNode;
  searchPlaceholder: string;
};

type EntityFilterState = {
  drug: boolean;
  disease: boolean;
  target: boolean;
  study: boolean;
  variant: boolean;
};

export const defaultEntityFilterState = {
  target: false,
  variant: false,
  study: false,
  disease: false,
  drug: false,
};

export const SearchContext = createContext<{
  searchQuery: any;
  searchPlaceholder: string;
  open: boolean;
  setOpen: (arg: boolean) => void;
  searchSuggestions: Array<any>;
  filterState: EntityFilterState;
  setFilterState: (arg) => void;
  allSearchResults: Array<any>;
  setAllSearchResults: (arg) => void;
}>({
  searchQuery: "",
  searchPlaceholder: "Search...",
  open: false,
  setOpen: () => undefined,
  searchSuggestions: [],
  filterState: defaultEntityFilterState,
  setFilterState: () => undefined,
  allSearchResults: [],
  setAllSearchResults: () => undefined,
});

export function SearchProvider({
  children,
  searchQuery,
  searchPlaceholder = "Search...",
}: GlobalSearchProviderProps) {
  const [open, setOpen] = useState(false);
  const [filterState, setFilterState] = useState(defaultEntityFilterState);
  const [allSearchResults, setAllSearchResults] = useState([]);

  return (
    <SearchContext.Provider
      value={{
        searchQuery,
        searchPlaceholder,
        open,
        setOpen,
        searchSuggestions,
        filterState,
        setFilterState,
        allSearchResults,
        setAllSearchResults,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

/**
 * Hook to access and interact with the search state
 * @returns Search context values and methods
 */
export function useSearchState() {
  const context = useContext(SearchContext);

  if (context === undefined) {
    throw new Error("useSearch must be used within a SearchProvider");
  }

  return context;
}

/*********************************
 * SEARCH INPUT CONTEXT/PROVIDER *
 *********************************/
type SearchInputProviderProps = {
  children: React.ReactNode;
  setValue: (arg: string) => void;
};

export const SearchInputContext = createContext<{
  inputValue: string;
  setInputValue: (arg: string) => void;
}>({
  inputValue: "",
  setInputValue: () => {},
});

export function SearchInputProvider({ children, setValue }: SearchInputProviderProps) {
  const [inputValue, setInputValue] = useState("");

  const debouncedInputValue = useDebounce(inputValue, 300);

  useEffect(() => {
    setValue(debouncedInputValue);
  }, [debouncedInputValue]);

  return (
    <SearchInputContext.Provider
      value={{
        inputValue,
        setInputValue,
      }}
    >
      {children}
    </SearchInputContext.Provider>
  );
}
