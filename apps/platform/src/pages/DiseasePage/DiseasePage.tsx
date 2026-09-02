import { lazy, ReactElement, Suspense } from "react";
import { Link, LoaderFunctionArgs, Route, Routes, useLoaderData, useLocation, useParams } from "react-router";
import { LoadingBackdrop, PageMeta, ScrollToTop, Box, Tab, Tabs, PROFILE_TABS_SENTINEL_ID } from "ui";

import Header, { buildHeaderMeta } from "./Header";
import NotFoundPage from "../NotFoundPage";

import DISEASE_PAGE_QUERY from "./DiseasePage.gql";
import { apolloClient } from "../../apolloClient";

const Associations = lazy(() => import("./DiseaseAssociations"));
const Profile = lazy(() => import("./Profile"));

type DiseaseURLParams = {
  efoId: string;
};

export async function loader({ params }: LoaderFunctionArgs) {
  const { data } = await apolloClient.query({
    query: DISEASE_PAGE_QUERY,
    variables: { efoId: params.efoId },
  });
  return data;
}

function DiseasePage(): ReactElement {
  const location = useLocation();
  const { efoId } = useParams<DiseaseURLParams>();
  const data = useLoaderData<typeof loader>();

  if (data && !data.disease) {
    return <NotFoundPage />;
  }

  const { name, dbXRefs } = data?.disease || {};
  const headerMeta = buildHeaderMeta({ efoId: efoId!, name, dbXRefs });

  return (
    <>
      <PageMeta
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
      />
      <Header loading={false} efoId={efoId} name={name} dbXRefs={dbXRefs} />
      <ScrollToTop />
      <Box id={PROFILE_TABS_SENTINEL_ID} sx={{ borderBottom: 1, borderColor: "divider" }}>
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
      <Suspense fallback={<LoadingBackdrop height={800} />}>
        <Routes>
          <Route
            path="/"
            element={
              <Profile
                efoId={efoId!}
                name={name!}
                Icon={headerMeta.Icon}
                externalLinks={headerMeta.externalLinks}
              />
            }
          />
          <Route path="/associations" element={<Associations efoId={efoId!} />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default DiseasePage;
