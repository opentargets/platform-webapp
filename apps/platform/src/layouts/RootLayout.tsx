import { Outlet } from "react-router";
import { ReportBuilder, ReportToggleButton } from "report-builder";
import { FromGeneticsModal, NavigationProgress } from "ui";

function RootLayout() {
  return (
    <>
      <NavigationProgress />
      <FromGeneticsModal />
      <ReportBuilder />
      <ReportToggleButton />
      <Outlet />
    </>
  );
}

export default RootLayout;
