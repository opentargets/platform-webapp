import { useQuery } from "@apollo/client";
import { ReactElement } from "react";
import { useLocation, useParams, Link } from "react-router";
import { Box, Tabs, Tab } from "@mui/material";
import { BasePage, ScrollToTop } from "ui";
import Header from "./Header";
import NotFoundPage from "../NotFoundPage";
import VARIANT_PAGE_QUERY from "./VariantPage.gql";
import Profile from "./Profile";

function VariantPage(): ReactElement {
  const location = useLocation();
  const { varId } = useParams() as { varId: string };

  const { loading, data } = useQuery(VARIANT_PAGE_QUERY, {
    variables: { variantId: varId },
  });

  if (data && !data.variant) {
    return <NotFoundPage />;
  }

  return (
    <BasePage
      title={`${varId} profile page`}
      description={`Annotation information for ${varId}`}
      location={location}
    >
      <>
        <Header loading={loading} variantId={varId} variantPageData={data?.variant} />
        <ScrollToTop />

        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs value={location.pathname}>
            <Tab
              label={<Box sx={{ textTransform: "capitalize" }}>Profile</Box>}
              value={`/variant/${varId}`}
              component={Link}
              to={`/variant/${varId}`}
            />
          </Tabs>
        </Box>
        <Profile varId={varId} />
      </>
    </BasePage>
  );
}

export default VariantPage;
