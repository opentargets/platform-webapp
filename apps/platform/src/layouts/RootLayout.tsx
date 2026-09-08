import { Outlet } from "react-router";
import { FromGeneticsModal, NavigationProgress } from "ui";
import ReportBuilder from "ui/src/components/Report/ReportBuilder";
import ReportToggleButton from "ui/src/components/Report/ReportToggleButton";

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
