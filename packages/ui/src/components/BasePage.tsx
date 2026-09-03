import { Helmet } from "react-helmet";
import Footer from "./Footer";
import Page from "./Page";

import NavBar from "./NavBar";
import {
  appTitle,
  appDescription,
  appCanonicalUrl,
  externalLinks,
  mainMenuItems,
  toolsMenuItems,
} from "@ot/constants";
import GlobalSearch from "./GlobalSearch/GlobalSearch";

import { ReactElement } from "react";
import { Location } from "history";

type BasePageProps = {
  children: ReactElement;
  description?: string;
  location?: Location;
  title?: string;
};

function BasePage({ title, children, description, location }: BasePageProps): ReactElement {
  const composedTitle = `${title ? `${title} | ` : ""} ${appTitle}`;

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
      <Helmet title={composedTitle}>
        <meta name="description" content={description || appDescription} />
        <link rel="canonical" href={appCanonicalUrl + (location?.pathname || "")} />
      </Helmet>
      {children}
    </Page>
  );
}

export default BasePage;
