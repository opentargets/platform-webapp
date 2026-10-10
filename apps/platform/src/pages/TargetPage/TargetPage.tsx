import { lazy, ReactElement, Suspense } from "react";
import {
  Link,
  LoaderFunctionArgs,
  matchPath,
  Route,
  Routes,
  useLoaderData,
  useLocation,
  useNavigation,
  useParams,
} from "react-router";
import { LoadingBackdrop, PageMeta, ScrollToTop, Box, Tab, Tabs, PROFILE_TABS_SENTINEL_ID } from "ui";
import { getUniprotIds } from "@ot/utils";

import Header, { buildHeaderMeta } from "./Header";
import NotFoundPage from "../NotFoundPage";
import TARGET_PAGE_QUERY from "./TargetPage.gql";
import { apolloClient } from "../../apolloClient";

const Profile = lazy(() => import("./Profile"));
const Associations = lazy(() => import("./TargetAssociations"));

type TargetURLParams = {
  ensgId: string;
};

export async function loader({ params }: LoaderFunctionArgs) {
  const { data } = await apolloClient.query({
    query: TARGET_PAGE_QUERY,
    variables: { ensgId: params.ensgId },
  });
  return data;
}

function TargetPage(): ReactElement {
  const location = useLocation();
  const navigation = useNavigation();
  const { ensgId } = useParams<TargetURLParams>();
  const data = useLoaderData<typeof loader>();
  const nextEnsgId = matchPath(
    "/target/:ensgId/*",
    navigation.location?.pathname ?? ""
  )?.params.ensgId;

  if (data && !data.target) {
    return <NotFoundPage />;
  }

  // Avoid overlapping profile queries during target-to-target navigation.
  if (navigation.state === "loading" && nextEnsgId && nextEnsgId !== ensgId) {
    return <LoadingBackdrop height={800} />;
  }

  const { approvedSymbol: symbol, approvedName } = data?.target || {};
  const uniprotIds = getUniprotIds(data.target.proteinIds);
  const crisprId = data?.target.dbXrefs.find(p => p.source === "ProjectScore")?.id;
  const headerMeta = buildHeaderMeta({ ensgId, uniprotIds, symbol, name: approvedName });

  return (
    <>
      <PageMeta
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
      />
      <ScrollToTop />
      <Header
        loading={false}
        ensgId={ensgId}
        uniprotIds={uniprotIds}
        symbol={symbol}
        name={approvedName}
        crisprId={crisprId}
      />

      <Box id={PROFILE_TABS_SENTINEL_ID} sx={{ borderBottom: 1, borderColor: "divider" }}>
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

      <Suspense fallback={<LoadingBackdrop height={800} />}>
        <Routes>
          <Route
            path="/"
            element={
              <Profile
                ensgId={ensgId}
                symbol={symbol}
                Icon={headerMeta.Icon}
                externalLinks={headerMeta.externalLinks}
              />
            }
          />
          <Route path="/associations" element={<Associations ensgId={ensgId} symbol={symbol} />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default TargetPage;
