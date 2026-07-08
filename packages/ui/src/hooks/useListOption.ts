import { useNavigate } from "react-router-dom";
import {
  addSearchToLocalStorage,
  getSelectedEntityFilter,
  TOTAL_ENTITIES,
} from "../components/GlobalSearch/utils/searchUtils";

const navigatetoBuiltPath = (navigate, path) => {
  // Defer navigation to the next frame to allow React to complete state updates
  // and dialog unmounting before the route transition happens. This prevents
  // batching conflicts that cause the page to freeze when transitioning from
  // a heavy page (e.g., disease page with GWAS widget) to another.
  requestAnimationFrame(() => {
    navigate(path);
  });
};

function useListOption() {
  const navigate = useNavigate();

  const entitiesWitAssociations = ["disease", "target"];

  const openListItem = (option, filterState) => {
    if (!option) return;

    const activeSearchEntities = getSelectedEntityFilter(filterState);

    const newOption = { ...option };
    newOption.type = "recent";
    addSearchToLocalStorage(newOption);

    if (newOption.entity === "search") {
      navigateToSearchResultsPage({ navigate, newOption, activeSearchEntities });
    } else {
      navigatetoBuiltPath(navigate, `/${newOption.entity}/${newOption.id}${
        entitiesWitAssociations.indexOf(newOption.entity) > -1 ? "/associations" : ""
      }`);
    }
  };

  return [openListItem];
}

function navigateToSearchResultsPage({ navigate, newOption, activeSearchEntities = [] }) {
  // Use requestAnimationFrame same as navigatetoBuiltPath to prevent freeze
  const path = activeSearchEntities.length === TOTAL_ENTITIES || activeSearchEntities.length === 0
    ? `/search?q=${newOption.name}&page=1`
    : `/search?q=${newOption.name}&page=1&entities=${activeSearchEntities.join()}`;
  
  requestAnimationFrame(() => {
    navigate(path);
  });
}

export default useListOption;
