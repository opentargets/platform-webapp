import { ReactElement } from "react";
import { LoaderFunctionArgs, useLoaderData, useLocation, useParams, Link } from "react-router";
import { PageMeta, ScrollToTop, Box, Tabs, Tab } from "ui";
import Header from "./Header";
import NotFoundPage from "../NotFoundPage";
import CREDIBLE_SET_PAGE_QUERY from "./CredibleSetPage.gql";
import Profile from "./Profile";
import { apolloClient } from "../../apolloClient";

export async function loader({ params }: LoaderFunctionArgs) {
  const { data } = await apolloClient.query({
    query: CREDIBLE_SET_PAGE_QUERY,
    variables: { studyLocusId: params.studyLocusId },
  });
  return data;
}

function CredibleSetPage(): ReactElement {
  const location = useLocation();
  const { studyLocusId } = useParams() as { studyLocusId: string };
  const data = useLoaderData<typeof loader>();

  if (data && !data?.credibleSet) {
    return <NotFoundPage />;
  }

  const { id: studyId } = data?.credibleSet?.study || {};
  const { id: variantId, referenceAllele, alternateAllele } = data?.credibleSet?.variant || {};

  return (
    <>
      <PageMeta
        title={
          variantId && studyId ? `Credible set around ${variantId} for ${studyId}` : studyLocusId
        }
        description={`Annotation information for credible set ${studyLocusId}`}
        location={location}
      />
      <Header
        loading={false}
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
  );
}

export default CredibleSetPage;
