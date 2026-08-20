import { Outlet } from "react-router";
import { FromGeneticsModal, NavigationProgress } from "ui";

function RootLayout() {
  return (
    <>
      <NavigationProgress />
      <FromGeneticsModal />
      <Outlet />
    </>
  );
}

export default RootLayout;
