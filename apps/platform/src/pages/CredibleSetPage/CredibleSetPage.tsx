import { ReactElement } from "react";
import { useLocation, useParams, Link } from "react-router";
import { useQuery } from "@apollo/client";
import { Box, Tabs, Tab } from "@mui/material";
import { BasePage, ScrollToTop } from "ui";
import Header from "./Header";
import NotFoundPage from "../NotFoundPage";
import CREDIBLE_SET_PAGE_QUERY from "./CredibleSetPage.gql";
import Profile from "./Profile";

function CredibleSetPage(): ReactElement {
  const location = useLocation();
  const { studyLocusId } = useParams() as { studyLocusId: string };

  const { loading, data } = useQuery(CREDIBLE_SET_PAGE_QUERY, {
    variables: { studyLocusId },
  });

  if (data && !data?.credibleSet) {
    return <NotFoundPage />;
  }

  const { id: studyId } = data?.credibleSet?.study || {};
  const { id: variantId, referenceAllele, alternateAllele } = data?.credibleSet?.variant || {};

  return (
    <BasePage
      title={
        variantId && studyId ? `Credible set around ${variantId} for ${studyId}` : studyLocusId
      }
      description={`Annotation information for credible set ${studyLocusId}`}
      location={location}
    >
      <>
        <Header
          loading={loading}
          studyId={studyId ?? ""}
          variantId={variantId ?? ""}
          referenceAllele={referenceAllele ?? ""}
          alternateAllele={alternateAllele ?? ""}
        />
        <ScrollToTop />
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs value={location.pathname}>
            <Tab
              label={<Box sx={{ textTransform: "capitalize" }}>Profile</Box>}
              value={location.pathname}
              component={Link}
              to={`/credible-set/${studyLocusId}`}
            />
          </Tabs>
        </Box>
        {variantId && <Profile studyLocusId={studyLocusId} variantId={variantId} />}
      </>
    </BasePage>
  );
}

export default CredibleSetPage;
