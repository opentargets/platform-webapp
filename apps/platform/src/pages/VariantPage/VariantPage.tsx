import { ReactElement } from "react";
import { LoaderFunctionArgs, useLoaderData, useLocation, useParams, Link } from "react-router";
import { PageMeta, ScrollToTop, Box, Tabs, Tab } from "ui";
import Header from "./Header";
import NotFoundPage from "../NotFoundPage";
import VARIANT_PAGE_QUERY from "./VariantPage.gql";
import Profile from "./Profile";
import { apolloClient } from "../../apolloClient";

export async function loader({ params }: LoaderFunctionArgs) {
  const { data } = await apolloClient.query({
    query: VARIANT_PAGE_QUERY,
    variables: { variantId: params.varId },
  });
  return data;
}

function VariantPage(): ReactElement {
  const location = useLocation();
  const { varId } = useParams() as { varId: string };
  const data = useLoaderData<typeof loader>();

  if (data && !data.variant) {
    return <NotFoundPage />;
  }

  return (
    <>
      <PageMeta
        title={`${varId} profile page`}
        description={`Annotation information for ${varId}`}
        location={location}
      />
      <Header loading={false} variantId={varId} variantPageData={data?.variant} />
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
  );
}

export default VariantPage;
