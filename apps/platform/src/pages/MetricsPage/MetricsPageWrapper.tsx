import { Suspense, lazy } from "react";
import { BasePage, LoadingBackdrop } from "ui";

const MetricsPage = lazy(() => import("./MetricsPage"));

function MetricsPageWrapper() {
  return (
    <BasePage title="Data Metrics" description="Platform Metrics">
      <Suspense fallback={<LoadingBackdrop />}>
        <MetricsPage />
      </Suspense>
    </BasePage>
  );
}

export default MetricsPageWrapper;
