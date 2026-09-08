import { LoaderFunctionArgs, useLoaderData, useLocation, useParams } from "react-router";

import { PageMeta, ScrollToTop } from "ui";

import Header from "./Header";
import NotFoundPage from "../NotFoundPage";

import EVIDENCE_PAGE_QUERY from "./EvidencePageQuery.gql";
import { apolloClient } from "../../apolloClient";

import Profile from "./Profile";

export async function loader({ params }: LoaderFunctionArgs) {
  const { data } = await apolloClient.query({
    query: EVIDENCE_PAGE_QUERY,
    variables: { ensgId: params.ensgId, efoId: params.efoId },
  });
  return data;
}

function EvidencePage() {
  const location = useLocation();
  const { ensgId, efoId } = useParams<{ ensgId: string; efoId: string }>();
  const data = useLoaderData<typeof loader>();

  if (data && !(data.target && data.disease)) {
    return <NotFoundPage />;
  }

  const { approvedSymbol: symbol } = data?.target || {};
  const { name } = data?.disease || {};

  return (
    <>
      <PageMeta
        title={`Evidence for ${symbol} and ${name}`}
        description={`${symbol} is associated with ${name} through Open Targets Platform evidence that is aggregated from genetic evidence, somatic mutations, known drugs, differential expression experiments, pathways & systems biology, text mining, and animal model data sources`}
        location={location}
      />
      <Header loading={false} symbol={symbol} name={name} />
      <ScrollToTop />
      <Profile ensgId={ensgId!} efoId={efoId!} symbol={symbol!} name={name!} />
    </>
  );
}

export default EvidencePage;
