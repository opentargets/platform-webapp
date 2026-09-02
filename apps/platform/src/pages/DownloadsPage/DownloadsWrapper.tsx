import { Suspense, lazy } from "react";
import { useLocation } from "react-router-dom";
import { BasePage } from "ui";
import DownloadsLoading from "./DownloadsLoading";

const DownloadsPage = lazy(() => import("./DownloadsPage"));

function DownloadsWrapper() {
  const location = useLocation();
  return (
    <BasePage
      title="Data downloads | Open Targets Platform"
      description="Data downloads | Open Targets Platform"
      location={location}
    >
      <Suspense fallback={<DownloadsLoading />}>
        <DownloadsPage />
      </Suspense>
    </BasePage>
  );
}

export default DownloadsWrapper;
