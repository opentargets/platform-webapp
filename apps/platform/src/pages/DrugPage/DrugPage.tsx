import { PageMeta, ScrollToTop, Box, Tabs, Tab, PROFILE_TABS_SENTINEL_ID } from "ui";
import { LoaderFunctionArgs, useLoaderData, useLocation, useParams, Routes, Route, Link } from "react-router";

import Header, { buildHeaderMeta } from "./Header";
import NotFoundPage from "../NotFoundPage";
import DRUG_PAGE_QUERY from "./DrugPage.gql";
import { apolloClient } from "../../apolloClient";

import Profile from "./Profile";
import { ReactNode } from "react";

export async function loader({ params }: LoaderFunctionArgs) {
  const { data } = await apolloClient.query({
    query: DRUG_PAGE_QUERY,
    variables: { chemblId: params.chemblId },
  });
  return data;
}

function DrugPage(): ReactNode {
  const location = useLocation();
  const { chemblId } = useParams();
  const data = useLoaderData<typeof loader>();

  if (data && !data.drug) {
    return <NotFoundPage />;
  }

  const { name, crossReferences } = data?.drug || {};
  const headerMeta = buildHeaderMeta({ chemblId, name, crossReferences });

  return (
    <>
      <PageMeta
        title={`${name || chemblId} profile page`}
        description={`Annotation information for ${name || chemblId}`}
        location={location}
      />
      <Header
        loading={false}
        chemblId={chemblId}
        name={name}
        crossReferences={crossReferences}
      />
      <ScrollToTop />
      <Box id={PROFILE_TABS_SENTINEL_ID} sx={{ borderBottom: 1, borderColor: "divider" }}>
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
        <Route
          path="/"
          element={
            <Profile
              chemblId={chemblId}
              name={name}
              Icon={headerMeta.Icon}
              externalLinks={headerMeta.externalLinks}
            />
          }
        />
      </Routes>
    </>
  );
}

export default DrugPage;
