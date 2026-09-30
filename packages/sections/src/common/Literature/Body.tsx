import { useEffect, useState } from "react";
import {
  LiteratureProvider,
  getInitialLiteratureState,
  useLiterature,
  useLiteratureDispatch,
} from "./LiteratureContext";

// Report state key for the filters (see exportAdapter's describeState)
export const LITERATURE_STATE_KEY = "literature";
const FILTER_KEYS = [
  "category",
  "selectedEntities",
  "startYear",
  "startMonth",
  "endYear",
  "endMonth",
  "pageSize",
] as const;

/** The filters that differ from the defaults, or undefined when none do */
function changedFilters(literature) {
  const defaults = getInitialLiteratureState();
  const changed = Object.fromEntries(
    FILTER_KEYS.filter(key => !isEqual(literature[key], defaults[key])).map(key => [
      key,
      literature[key],
    ])
  );
  return Object.keys(changed).length ? changed : undefined;
}
import { fetchSimilarEntities } from "./requests";
import { Box } from "@mui/material";
import { SectionItem, useApolloClient, useReportComponentState } from "ui";
import isEqual from "lodash/isEqual";
import PublicationsList from "./PublicationsList";
import Description from "./Description";
import Entities from "./Entities";
import Category from "./Category";
import CountInfo from "./CountInfo";
import { DateFilter } from "./DateFilter";
import { definition } from ".";

function LiteratureList({ id, name, entity, BODY_QUERY, definition }) {
  const [requestObj, setRequestObj] = useState({});
  const literature = useLiterature();
  const { category, startYear, startMonth, endYear, endMonth, selectedEntities, pageSize } =
    literature;
  const literatureDispatch = useLiteratureDispatch();
  const client = useApolloClient();

  // Keep the filters with the section in reports
  const saveReportState = useReportComponentState()?.saveState;
  useEffect(() => {
    saveReportState?.(LITERATURE_STATE_KEY, changedFilters(literature));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveReportState, category, startYear, startMonth, endYear, endMonth, selectedEntities, pageSize]);

  useEffect(() => {
    async function startRequest() {
      const initRequest = await fetchSimilarEntities({
        client,
        id,
        query: BODY_QUERY,
        category,
        // Non-empty when restored from a report
        entities: selectedEntities,
        startYear,
        startMonth,
        endYear,
        endMonth,
      });
      setRequestObj(initRequest);
      const data = initRequest.data[entity];
      const update = {
        entities: data.similarEntities,
        litsIds: data.literatureOcurrences?.rows?.map(({ pmid }) => pmid),
        litsCount: data.literatureOcurrences?.filteredCount,
        earliestPubYear: data.literatureOcurrences?.earliestPubYear,
        cursor: data.literatureOcurrences?.cursor,
        id,
        query: BODY_QUERY,
        globalEntity: entity,
      };
      literatureDispatch({ type: "stateUpdate", value: update });
    }
    startRequest();
  }, []);

  return (
    <SectionItem
      definition={definition}
      request={requestObj}
      entity={entity}
      renderDescription={() => <Description name={name} />}
      showContentLoading={true}
      renderBody={() => (
        <>
          <Box display="flex" sx={{ justifyContent: "space-between" }}>
            <Box display="flex" sx={{ flexDirection: "column" }}>
              <Category />
              <DateFilter />
            </Box>
            <CountInfo />
          </Box>
          <Entities id={id} name={name} />
          <PublicationsList hideSearch />
        </>
      )}
    />
  );
}

function Body({ definition, name, id, entity, BODY_QUERY }) {
  // Filters saved in a report (read once, at mount)
  const reportState = useReportComponentState();
  const [savedFilters] = useState(() => reportState?.getState(LITERATURE_STATE_KEY));

  return (
    <LiteratureProvider initialState={savedFilters}>
      <LiteratureList
        id={id}
        name={name}
        entity={entity}
        BODY_QUERY={BODY_QUERY}
        definition={definition}
      />
    </LiteratureProvider>
  );
}

export default Body;
