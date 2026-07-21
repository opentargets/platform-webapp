import { Suspense, lazy } from "react";
import { LoadingBackdrop } from "ui";

const VariantPage = lazy(() => import("./VariantPage"));

function VariantPageWrapper() {
  return (
    <Suspense fallback={<LoadingBackdrop />}>
      <VariantPage />
    </Suspense>
  );
}

export default VariantPageWrapper;
