import { ReactElement } from "react";
import { useQuery } from "@apollo/client";
import { Box, Tab, Tabs } from "@mui/material";
import { Link, Route, Routes, useLocation, useParams } from "react-router";
import { BasePage, ScrollToTop } from "ui";

import Header from "./Header";
import NotFoundPage from "../NotFoundPage";

import DISEASE_PAGE_QUERY from "./DiseasePage.gql";
import Associations from "./DiseaseAssociations";
import Profile from "./Profile";

type DiseaseURLParams = {
  efoId: string;
};

function DiseasePage(): ReactElement {
  const location = useLocation();
  const { efoId } = useParams<DiseaseURLParams>();
  const { loading, data } = useQuery(DISEASE_PAGE_QUERY, {
    variables: { efoId: efoId! },

  });

  if (data && !data.disease) {
    return <NotFoundPage />;
  }

  const { name, dbXRefs } = data?.disease || {};

  return (
    <BasePage
      title={
        location.pathname.includes("associations")
          ? `Targets associated with ${name}`
          : `${name} profile page`
      }
      description={
        location.pathname.includes("associations")
          ? `Ranked list of targets associated with ${name}`
          : `Annotation information for ${name}`
      }
      location={location}
    >
      <>
        <Header loading={loading} efoId={efoId} name={name} dbXRefs={dbXRefs} />
        <ScrollToTop />
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs value={location.pathname}>
            <Tab
              label={<Box sx={{ textTransform: "capitalize" }}>Associated targets</Box>}
              value={`/disease/${efoId}/associations`}
              component={Link}
              to={`/disease/${efoId}/associations`}
            />
            <Tab
              label={<Box sx={{ textTransform: "capitalize" }}>Profile</Box>}
              value={`/disease/${efoId}`}
              component={Link}
              to={`/disease/${efoId}`}
            />
          </Tabs>
        </Box>
        <Routes>
          <Route path="/" element={<Profile efoId={efoId!} name={name!} />} />
          <Route path="/associations" element={<Associations efoId={efoId!} />} />
        </Routes>
      </>
    </BasePage>
  );
}

export default DiseasePage;
