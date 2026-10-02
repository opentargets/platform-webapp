import { faInfo } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useState } from "react";
import { Alert, Collapse, Tab, Tabs, Typography } from "@mui/material";
import { grey } from "@mui/material/colors";
import { SectionItem, useApolloClient, Link, useReportSectionContext } from "ui";
import { testPPPaccess } from "@ot/utils";
import { PPP_WEB_URL } from "@ot/constants";

import { definition } from ".";
import AtlasTab from "./AtlasTab";
import Description from "./Description";
import GtexTab, { getData as getGtexData } from "./GtexTab";
import SummaryTab, { getData as getSummaryData } from "./SummaryTab";

function Section({ id: ensgId, label: symbol, entity }) {
  const reportContext = useReportSectionContext();
  ensgId = reportContext?.entityId || ensgId;
  symbol = reportContext?.entityLabel || symbol;
  
  const defaultTab = "summary";
  const [showAlert, setShowAlert] = useState(true);
  const [showPPPMessage, setShowPPPMessage] = useState(false);
  const [tab, setTab] = useState(defaultTab);
  const [requestSummary, setRequestSummary] = useState({ loading: true });
  const [requestGtex, setRequestGtex] = useState({ loading: true });
  const client = useApolloClient();
  // TODO:
  // the part about requests (see below) will need rethinking / refactoring
  // SectionItem checks for data based on these requests, but only works for data coming from the target object
  // the widget displays based on the summary tab only.
  // Atlas and gTex tab should always be there is the widget is visible, hence the hack of using requestSummary for Atlas
  // the request for gTex wraps the data in a structure similar to that from the target object:
  // this can be probably be rewritten differently, but that's a wider scope than the MUI migration we're currently doing
  const [request, setRequest] = {
    summary: [requestSummary, setRequestSummary],
    // atlas: [requestSummary, setRequestSummary], // [{ loading: false, data: true }, undefined],
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
    const checkPPP = async () => {
      const canAccessPPP = await testPPPaccess();
      if (canAccessPPP) setShowPPPMessage(true);
    };

    checkPPP();
  }, []);

  useEffect(() => {
    let isCurrent = true;

    async function updateData() {
      const newRequest = await getData(ensgId, client);
      if (isCurrent) setRequest(newRequest);
    }

    if (!request.data && getData) {
      setRequest({ loading: true });
      updateData();
    }

    return () => {
      isCurrent = false;
    };
  }, [tab, ensgId, request.data, getData, setRequest]);

  return (
    <SectionItem
      definition={definition}
      entity={entity}
      request={request}
      showContentLoading={true}
      renderDescription={() => <Description symbol={symbol} />}
      renderBody={() => (
        <>
          <Collapse in={showAlert} timeout={500}>
            <Alert
              sx={{
                bgcolor: grey[100],
                color: "text.primary",
                my: 1.5,
                "& .MuiAlert-icon": { color: grey[800] },
              }}
              severity="info"
              onClose={() => setShowAlert(false)}
            >
              <Typography variant="body2">
                This widget and the accompanying data will be deprecated in favour of new data in the June 2026 release.
              </Typography>
              {showPPPMessage && (
                <Typography variant="body2" component="div" sx={{ pt: 1 }}>
                  A beta version is available for testing and feedback on the{" "}
                  <Link external to={PPP_WEB_URL}>Partner Preview Platform.</Link>
                </Typography>
              )}
            </Alert>
          </Collapse>
          <Tabs data-testid="expression-tabs" value={tab} onChange={handleChangeTab} style={{ marginBottom: "1rem" }}>
            <Tab data-testid="expression-tab-summary" value="summary" label="Summary" />
            {/* <Tab value="atlas" label="Experiments (Expression Atlas)" /> */}
            <Tab data-testid="expression-tab-gtex" value="gtex" label="Variation (GTEx)" />
          </Tabs>
          {tab === "summary" && <SummaryTab symbol={symbol} data={request.data} />}
          {/* {tab === "atlas" && <AtlasTab ensgId={ensgId} symbol={symbol} />} */}
          {tab === "gtex" && <GtexTab symbol={symbol} data={request.data} />}
        </>
      )}
    />
  );
}

export default Section;
