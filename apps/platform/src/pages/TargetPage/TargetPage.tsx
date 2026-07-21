import { ReactElement } from "react";
import { useQuery } from "@apollo/client";
import { Box, Tab, Tabs } from "@mui/material";
import { Link, Route, Routes, useLocation, useParams } from "react-router";
import { BasePage, ScrollToTop } from "ui";
import { getUniprotIds } from "@ot/utils";

import Header from "./Header";
import NotFoundPage from "../NotFoundPage";
import TARGET_PAGE_QUERY from "./TargetPage.gql";

import Profile from "./Profile";
import Associations from "./TargetAssociations";

type TargetURLParams = {
  ensgId: string;
};

function TargetPage(): ReactElement {
  const location = useLocation();
  const { ensgId } = useParams<TargetURLParams>();

  const { loading, data } = useQuery(TARGET_PAGE_QUERY, {
    variables: { ensgId },
  });

  if (data && !data.target) {
    return <NotFoundPage />;
  }

  const { approvedSymbol: symbol, approvedName } = data?.target || {};
  const uniprotIds = loading ? null : getUniprotIds(data.target.proteinIds);
  const crisprId = data?.target.dbXrefs.find(p => p.source === "ProjectScore")?.id;

  return (
    <BasePage
      title={
        location.pathname.includes("associations")
          ? `Diseases associated with ${symbol}`
          : `${symbol} profile page`
      }
      description={
        location.pathname.includes("associations")
          ? `Ranked list of diseases and phenotypes associated with ${symbol}`
          : `Annotation information for ${symbol}`
      }
      location={location}
    >
      <>
        <ScrollToTop />
        <Header
          loading={loading}
          ensgId={ensgId}
          uniprotIds={uniprotIds}
          symbol={symbol}
          name={approvedName}
          crisprId={crisprId}
        />

        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs value={location.pathname}>
            <Tab
              label={
                <Box sx={{ textTransform: "capitalize" }}>
                  <div>Associated diseases</div>
                </Box>
              }
              value={`/target/${ensgId}/associations`}
              component={Link}
              to={`/target/${ensgId}/associations`}
            />
            <Tab
              label={<Box sx={{ textTransform: "capitalize" }}>Profile</Box>}
              value={`/target/${ensgId}`}
              component={Link}
              to={`/target/${ensgId}`}
            />
          </Tabs>
        </Box>

        <Routes>
          <Route path="/" element={<Profile ensgId={ensgId} symbol={symbol} />} />
          <Route path="/associations" element={<Associations ensgId={ensgId} />} />
        </Routes>
      </>
    </BasePage>
  );
}

export default TargetPage;
