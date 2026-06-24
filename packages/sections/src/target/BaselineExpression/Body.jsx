import { faInfo } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Alert, Collapse, Tab, Tabs, Typography } from "@mui/material";
import { grey } from "@mui/material/colors";
import { sentenceCase } from "@ot/utils";
import { Fragment, useEffect, useState } from "react";
import { SectionItem, useApolloClient } from "ui";

import { definition } from ".";
import Description from "./Description";
import GtexTab, { getData as getGtexData } from "./GtexTab";
import SummaryTab, { getData as getSummaryData } from "./SummaryTab";

function Section({ id: ensgId, label: symbol, entity, viewMode, expandSpecificity }) {
  const defaultTab = "summary";
  const [showAlert, setShowAlert] = useState(true);
  const [tab, setTab] = useState(defaultTab);
  const [requestSummary, setRequestSummary] = useState({ loading: true });
  const [requestGtex, setRequestGtex] = useState({ loading: true });
  const client = useApolloClient();
  const [request, setRequest] = {
    summary: [requestSummary, setRequestSummary],
    gtex: [requestGtex, setRequestGtex],
  }[tab];

  const getData = {
    summary: getSummaryData,
    gtex: getGtexData,
  }[tab];

  const handleChangeTab = (_, tabChange) => {
    setTab(tabChange);
  };

  useEffect(() => {
    async function updateData() {
      const newRequest = await getData(ensgId, client);
      setRequest(newRequest);
    }

    if (getData) {
      setRequest({ loading: true });
      updateData();
    }
  }, [tab, ensgId, getData]);

  return (
    <SectionItem
      definition={definition}
      entity={entity}
      request={request}
      showContentLoading={true}
      renderDescription={() => <Description symbol={symbol} />}
      renderBody={() => (
        <Fragment key={crypto.randomUUID()}>
          <Tabs value={tab} onChange={handleChangeTab} style={{ marginBottom: "1rem" }}>
            <Tab value="summary" label="Summary" />
            <Tab value="gtex" label="Variation (GTEx)" />
          </Tabs>
          {tab === "summary" &&
            <SummaryTab
              symbol={symbol}
              ensgId={ensgId}
              data={request.data}
              viewMode={viewMode}
              expandSpecificity={expandSpecificity}
            />
          }
          {tab === "gtex" && <GtexTab symbol={symbol} data={request.data} />}
        </Fragment>
      )}
    />
  );
}

export default Section;
