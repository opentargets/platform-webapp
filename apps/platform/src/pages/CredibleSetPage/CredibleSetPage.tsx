import { ReactElement } from "react";
import { LoaderFunctionArgs, useLoaderData, useLocation, useParams, Link } from "react-router";
import { PageMeta, ScrollToTop, Box, Tabs, Tab, PROFILE_TABS_SENTINEL_ID } from "ui";
import Header, { buildHeaderMeta } from "./Header";
import NotFoundPage from "../NotFoundPage";
import CREDIBLE_SET_PAGE_QUERY from "./CredibleSetPage.gql";
import Profile from "./Profile";
import { apolloClient } from "../../apolloClient";

export async function loader({ params }: LoaderFunctionArgs) {
  const { data } = await apolloClient.query({
    query: CREDIBLE_SET_PAGE_QUERY,
    variables: { credibleSetId: params.credibleSetId },
  });
  return data;
}

function CredibleSetPage(): ReactElement {
  const location = useLocation();
  const { credibleSetId } = useParams() as { credibleSetId: string };
  const data = useLoaderData<typeof loader>();

  if (data && !data?.credibleSet) {
    return <NotFoundPage />;
  }

  const { id: studyId } = data?.credibleSet?.study || {};
  const { variantId, referenceAllele, alternateAllele } = data?.credibleSet?.leadVariant || {};
  const headerMeta = buildHeaderMeta({
    variantId: variantId ?? "",
    referenceAllele: referenceAllele ?? "",
    alternateAllele: alternateAllele ?? "",
    studyId: studyId ?? "",
  });

  return (
    <>
      <PageMeta
        title={
          variantId && studyId ? `Credible set around ${variantId} for ${studyId}` : credibleSetId
        }
        description={`Annotation information for credible set ${credibleSetId}`}
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
      <Box id={PROFILE_TABS_SENTINEL_ID} sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs value={location.pathname}>
          <Tab
            label={<Box sx={{ textTransform: "capitalize" }}>Profile</Box>}
            value={location.pathname}
            component={Link}
            to={`/credible-set/${credibleSetId}`}
          />
        </Tabs>
      </Box>
      {variantId && (
        <Profile
          credibleSetId={credibleSetId}
          variantId={variantId}
          Icon={headerMeta.Icon}
          externalLinks={headerMeta.externalLinks}
        />
      )}
    </>
  );
}

export default CredibleSetPage;
