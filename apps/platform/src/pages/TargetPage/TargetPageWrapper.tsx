import { Suspense, lazy } from "react";
import { LoadingBackdrop } from "ui";

const TargetPage = lazy(() => import("./TargetPage"));

function TargetPageWrapper() {
  return (
    <Suspense fallback={<LoadingBackdrop />}>
      <TargetPage />
    </Suspense>
  );
}

export default TargetPageWrapper;
