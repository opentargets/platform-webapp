import { useEffect, useState } from "react";
import { LiteratureProvider, useLiterature, useLiteratureDispatch } from "./LiteratureContext";
import { fetchSimilarEntities } from "./requests";
import { Box } from "@mui/material";
import { SectionItem, useApolloClient } from "ui";
import PublicationsList from "./PublicationsList";
import Description from "./Description";
import Entities from "./Entities";
import Category from "./Category";
import CountInfo from "./CountInfo";
import { DateFilter } from "./DateFilter";

function LiteratureList({ id, name, entity, BODY_QUERY, definition }) {
  const [requestObj, setRequestObj] = useState({});
  const literature = useLiterature();
  const { category, startYear, startMonth, endYear, endMonth } = literature;
  const literatureDispatch = useLiteratureDispatch();
  const client = useApolloClient();

  useEffect(() => {
    async function startRequest() {
      const initRequest = await fetchSimilarEntities({
        client,
        id,
        query: BODY_QUERY,
        category,
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
  return (
    <LiteratureProvider>
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
