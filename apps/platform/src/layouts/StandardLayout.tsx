import { Outlet } from "react-router";
import { Page, NavBar, Footer, GlobalSearch } from "ui";
import { externalLinks, mainMenuItems } from "@ot/constants";

function StandardLayout() {
  return (
    <Page
      header={<NavBar name="Platform" search={<GlobalSearch />} items={mainMenuItems} />}
      footer={<Footer externalLinks={externalLinks} />}
    >
      <Outlet />
    </Page>
  );
}

export default StandardLayout;
