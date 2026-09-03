import { Outlet } from "react-router";
import { Page, NavBar, Footer, GlobalSearch } from "ui";
import { externalLinks, mainMenuItems, toolsMenuItems } from "@ot/constants";

function StandardLayout() {
  return (
    <Page
      header={
        <NavBar
          name="Platform"
          search={<GlobalSearch />}
          items={mainMenuItems}
          tools={toolsMenuItems}
        />
      }
      footer={<Footer externalLinks={externalLinks} />}
    >
      <Outlet />
    </Page>
  );
}

export default StandardLayout;
