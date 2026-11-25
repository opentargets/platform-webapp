import type { DocumentNode } from "@apollo/client";
import { useEffect, useState } from "react";
import { Box, SectionItem, type SectionRequest, useApolloClient } from "ui";
import type { WidgetDefinition } from "../../types/widget";
import { LiteratureProvider, useLiterature, useLiteratureDispatch } from "./LiteratureContext";
import { fetchSimilarEntities, literatureStateFromResponse } from "./requests";

type LiteratureProps = {
  id: string;
  name: string;
  entity: string;
  BODY_QUERY: DocumentNode;
  definition: Omit<WidgetDefinition, "isPrivate"> & { isPrivate?: boolean };
};

import Category from "./Category";
import CountInfo from "./CountInfo";
import { DateFilter } from "./DateFilter";
import Description from "./Description";
import Entities from "./Entities";
import PublicationsList from "./PublicationsList";

function LiteratureList({ id, name, entity, BODY_QUERY, definition }: LiteratureProps) {
  const [requestObj, setRequestObj] = useState<SectionRequest>({ loading: true });
  const literature = useLiterature();
  const { category, startYear, startMonth, endYear, endMonth, pageSize } = literature;
  const literatureDispatch = useLiteratureDispatch();
  const client = useApolloClient();

  useEffect(() => {
    async function startRequest() {
      const initRequest = await fetchSimilarEntities({
        client,
        id,
        query: BODY_QUERY,
        category,
        pageSize,
        startYear,
        startMonth,
        endYear,
        endMonth,
      });
      setRequestObj(initRequest);
      literatureDispatch({
        type: "stateUpdate",
        value: {
          ...literatureStateFromResponse(initRequest.data[entity]),
          id,
          query: BODY_QUERY,
          globalEntity: entity,
        },
      });
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

function Body({ definition, name, id, entity, BODY_QUERY }: LiteratureProps) {
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
