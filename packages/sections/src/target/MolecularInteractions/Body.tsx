import type { ApolloClient } from "@apollo/client";
import type {
  TargetBodyProps,
  TargetInteractionsStatsQuery,
  TargetInteractionsStatsQueryVariables,
} from "@ot/constants";
import type { SyntheticEvent } from "react";
import { useEffect, useState } from "react";
import { SectionItem, Tab, Tabs, Typography, useApolloClient, usePlatformApi } from "ui";
import { typedDocument } from "../../utils/typedDocument";
import { definition } from ".";
import Description from "./Description";
import IntactTab from "./IntactTab";
import INTERACTIONS_STATS_QUERY_DOCUMENT from "./InteractionsStats.gql";
import ReactomeTab from "./ReactomeTab";
import SignorTab from "./SignorTab";
import StringTab from "./StringTab";

const INTERACTIONS_STATS_QUERY = typedDocument<
  TargetInteractionsStatsQuery,
  TargetInteractionsStatsQueryVariables
>(INTERACTIONS_STATS_QUERY_DOCUMENT);

type SourceId = "intact" | "signor" | "reactome" | "string";

const getSummaryCounts = (ensgId: string, client: ApolloClient<object>) =>
  client.query({
    query: INTERACTIONS_STATS_QUERY,
    variables: {
      ensgId,
    },
  });

const sources: { label: string; id: SourceId; countDescription: string }[] = [
  {
    label: "IntAct",
    id: "intact",
    countDescription: "molecular interactions",
  },
  {
    label: "Signor",
    id: "signor",
    countDescription: "directional, causal interactions",
  },
  {
    label: "Reactome",
    id: "reactome",
    countDescription: "pathway-based interactions",
  },
  {
    label: "String",
    id: "string",
    countDescription: "functional interactions",
  },
];

type Props = TargetBodyProps;

function Body({ label: symbol, id, entity }: Props) {
  const request = usePlatformApi();
  const [source, setSource] = useState<SourceId>(sources[0].id); // must initialize to valid value for tabs to work
  const [counts, setCounts] = useState<Partial<Record<SourceId, number>>>({});
  const client = useApolloClient();

  const onTabChange = (_event: SyntheticEvent, tabId: SourceId) => {
    setSource(tabId);
  };

  // load tabs summary counts
  useEffect(() => {
    getSummaryCounts(id, client)
      .then((res) => {
        const target = res.data.target;
        const nextCounts: Partial<Record<SourceId, number>> = {};
        for (const s of sources) nextCounts[s.id] = target?.[s.id]?.count ?? 0;
        setCounts(nextCounts);
        // find first source (tab) with data and set that as the initially selected tab
        const initialTab = sources.find((s) => (nextCounts[s.id] ?? 0) > 0);
        if (initialTab) {
          setSource(initialTab.id);
        }
      })
      .catch((error: Error) => {
        console.error(error.message);
      });
  }, [id]);

  return (
    <SectionItem
      entity={entity}
      definition={definition}
      request={request}
      renderDescription={() => <Description symbol={symbol} />}
      showContentLoading={true}
      renderBody={() => (
        <>
          {/* Interaction Resource */}
          <Tabs
            data-testid="interactions-tabs"
            value={source}
            onChange={onTabChange}
            aria-label="simple tabs example"
          >
            {sources.map((s) => (
              <Tab
                data-testid={`interactions-tab-${s.id}`}
                label={
                  <>
                    <Typography variant="body1">{s.label}</Typography>
                    <Typography variant="body2" gutterBottom>
                      {counts[s.id]} {s.countDescription}
                    </Typography>
                  </>
                }
                value={s.id}
                key={s.id}
                disabled={counts[s.id] === 0}
              />
            ))}
          </Tabs>

          <div style={{ marginTop: "50px" }}>
            {/* intact stuff */}
            {source === "intact" && (counts[source] ?? 0) > 0 && (
              <div data-testid="interactions-content-intact">
                <IntactTab ensgId={id} symbol={symbol} />
              </div>
            )}

            {/* signor stuff */}
            {source === "signor" && (counts[source] ?? 0) > 0 && (
              <div data-testid="interactions-content-signor">
                <SignorTab ensgId={id} symbol={symbol} />
              </div>
            )}

            {/* reactome stuff */}
            {source === "reactome" && (counts[source] ?? 0) > 0 && (
              <div data-testid="interactions-content-reactome">
                <ReactomeTab ensgId={id} symbol={symbol} />
              </div>
            )}

            {/* string stuff */}
            {source === "string" && (counts[source] ?? 0) > 0 && (
              <div data-testid="interactions-content-string">
                <StringTab ensgId={id} symbol={symbol} />
              </div>
            )}
          </div>
        </>
      )}
    />
  );
}

export default Body;
