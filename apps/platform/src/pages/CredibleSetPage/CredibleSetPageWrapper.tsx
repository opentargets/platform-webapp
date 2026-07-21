import { Suspense, lazy } from "react";
import { LoadingBackdrop } from "ui";

const CredibleSetPage = lazy(() => import("./CredibleSetPage"));

function CredibleSetPageWrapper() {
  return (
    <Suspense fallback={<LoadingBackdrop />}>
      <CredibleSetPage />
    </Suspense>
  );
}

export default CredibleSetPageWrapper;
