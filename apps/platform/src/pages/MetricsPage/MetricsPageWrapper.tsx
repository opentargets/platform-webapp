import { Suspense, lazy } from "react";
import { useLocation } from "react-router";
import { LoadingBackdrop, PageMeta } from "ui";

const MetricsPage = lazy(() => import("./MetricsPage"));

function MetricsPageWrapper() {
  const location = useLocation();

  return (
    <>
      <PageMeta
        title="Data Metrics"
        description="Platform metrics | Open Targets Platform"
        location={location}
      />
      <Suspense fallback={<LoadingBackdrop />}>
        <MetricsPage />
      </Suspense>
    </>
  );
}

export default MetricsPageWrapper;
