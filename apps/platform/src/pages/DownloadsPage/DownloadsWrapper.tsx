import { Suspense, lazy } from "react";
import { useLocation } from "react-router";
import { PageMeta } from "ui";
import DownloadsLoading from "./DownloadsLoading";

const DownloadsPage = lazy(() => import("./DownloadsPage"));

function DownloadsWrapper() {
  const location = useLocation();
  return (
    <>
      <PageMeta
        title="Data downloads | Open Targets Platform"
        description="Data downloads | Open Targets Platform"
        location={location}
      />
      <Suspense fallback={<DownloadsLoading />}>
        <DownloadsPage />
      </Suspense>
    </>
  );
}

export default DownloadsWrapper;
