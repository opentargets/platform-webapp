import { useQuery } from "@apollo/client";
import { BasePage, ScrollToTop } from "ui";
import { Box, Tabs, Tab } from "@mui/material";
import { useLocation, useParams, Routes, Route, Link } from "react-router";

import Header from "./Header";
import NotFoundPage from "../NotFoundPage";
import DRUG_PAGE_QUERY from "./DrugPage.gql";

import Profile from "./Profile";
import { ReactNode } from "react";


function DrugPage(): ReactNode {
  const location = useLocation();
  const { chemblId } = useParams();

  const { loading, data } = useQuery(DRUG_PAGE_QUERY, {
    variables: { chemblId: chemblId! },
  });

  if (data && !data.drug) {
    return <NotFoundPage />;
  }

  const { name, crossReferences } = data?.drug || {};

  return (
    <BasePage
      title={`${name || chemblId} profile page`}
      description={`Annotation information for ${name || chemblId}`}
      location={location}
    >
      <>
        <Header
          loading={loading}
          chemblId={chemblId}
          name={name}
          crossReferences={crossReferences}
        />
        <ScrollToTop />
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs value={location.pathname}>
            <Tab
              label={<Box sx={{ textTransform: "capitalize" }}>Profile</Box>}
              value={`/drug/${chemblId}`}
              component={Link}
              to={`/drug/${chemblId}`}
            />
          </Tabs>
        </Box>
        <Routes>
          <Route path="/" element={<Profile chemblId={chemblId} name={name} />} />
        </Routes>
      </>
    </BasePage>
  );
}

export default DrugPage;
