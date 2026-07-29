import { createContext, useContext, useMemo, type ReactNode } from "react";
import useStateParams from "../../hooks/useStateParams";
import { CATEGORIES, type Category } from "./categoryConfig";

export type CategoryFilter = Category | "All";

type SummaryCategoryContextValue = {
  activeCategory: CategoryFilter;
  setActiveCategory: (category: CategoryFilter) => void;
};

const SummaryCategoryContext = createContext<SummaryCategoryContextValue | undefined>(undefined);

function deserializeCategory(value: string): CategoryFilter {
  return (CATEGORIES as readonly string[]).includes(value) ? (value as Category) : "All";
}

// URL-synced so the current category filter is shareable/deep-linkable and
// survives back/forward navigation, matching the pattern used elsewhere in
// the app (see AssociationsURLContext) rather than a plain useState that
// resets on remount.
function SummaryCategoryProvider({ children }: { children: ReactNode }) {
  const [activeCategory, setActiveCategory] = useStateParams<CategoryFilter>(
    "All",
    "category",
    value => value,
    deserializeCategory
  );

  const value = useMemo(() => ({ activeCategory, setActiveCategory }), [activeCategory]);

  return (
    <SummaryCategoryContext.Provider value={value}>{children}</SummaryCategoryContext.Provider>
  );
}

function useSummaryCategory(): SummaryCategoryContextValue {
  const context = useContext(SummaryCategoryContext);
  if (!context) {
    throw new Error("useSummaryCategory must be used within a SummaryCategoryProvider");
  }
  return context;
}

export { SummaryCategoryProvider, useSummaryCategory };
