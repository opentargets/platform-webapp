import { Helmet } from "react-helmet";
import { appTitle, appDescription, appCanonicalUrl } from "@ot/constants";
import { Location } from "history";

type PageMetaProps = {
  description?: string;
  location?: Location;
  title?: string;
};

function PageMeta({ title, description, location }: PageMetaProps) {
  const composedTitle = `${title ? `${title} | ` : ""} ${appTitle}`;

  return (
    <Helmet title={composedTitle}>
      <meta name="description" content={description || appDescription} />
      <link rel="canonical" href={appCanonicalUrl + (location?.pathname || "")} />
    </Helmet>
  );
}

export default PageMeta;
