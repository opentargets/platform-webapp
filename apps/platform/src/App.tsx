import { ReactElement } from "react";
import { createBrowserRouter, RouterProvider } from "react-router";
import { SearchProvider, PrivateRoute, OTConfigurationProvider, LoadingBackdrop } from "ui";
import { getConfig } from "@ot/config";

import SEARCH_QUERY from "./components/Search/SearchQuery.gql";

import RootLayout from "./layouts/RootLayout";
import StandardLayout from "./layouts/StandardLayout";
import HomePage from "./pages/HomePage/HomePage";
import NotFoundPage from "./pages/NotFoundPage/NotFoundPage";

const config = getConfig();

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    hydrateFallbackElement: <LoadingBackdrop height={400} />,
    children: [
      { index: true, element: <HomePage /> },
      {
        element: <StandardLayout />,
        children: [
          {
            path: "/api",
            lazy: () => import("./pages/APIPage/APIPage").then(m => ({ Component: m.default })),
          },
          {
            path: "/search",
            lazy: () =>
              import("./pages/SearchPage/SearchPage").then(m => ({ Component: m.default })),
          },
          {
            path: "/downloads/*",
            lazy: () =>
              import("./pages/DownloadsPage/DownloadsWrapper").then(m => ({
                Component: m.default,
              })),
          },
          {
            path: "/target/:ensgId/*",
            lazy: () =>
              import("./pages/TargetPage/TargetPage").then(m => ({ Component: m.default })),
          },
          {
            path: "/disease/:efoId/*",
            lazy: () =>
              import("./pages/DiseasePage/DiseasePage").then(m => ({ Component: m.default })),
          },
          {
            path: "/evidence/:ensgId/:efoId/*",
            lazy: () =>
              import("./pages/EvidencePage/EvidencePage").then(m => ({ Component: m.default })),
          },
          {
            path: "/drug/:chemblId/*",
            lazy: () =>
              import("./pages/DrugPage/DrugPage").then(m => ({ Component: m.default })),
          },
          {
            path: "/variant/:varId/*",
            lazy: () =>
              import("./pages/VariantPage/VariantPage").then(m => ({ Component: m.default })),
          },
          {
            path: "/study/:studyId/*",
            lazy: () =>
              import("./pages/StudyPage/StudyPage").then(m => ({ Component: m.default })),
          },
          {
            path: "/credible-set/:studyLocusId/*",
            lazy: () =>
              import("./pages/CredibleSetPage/CredibleSetPage").then(m => ({
                Component: m.default,
              })),
          },
          {
            element: <PrivateRoute />,
            children: [
              {
                path: "/analysis",
                lazy: () =>
                  import("./pages/AnalysisPage/AnalysisPage").then(m => ({
                    Component: m.default,
                  })),
              },
              {
                path: "/projects",
                lazy: () =>
                  import("./pages/ProjectsPage/ProjectsPage").then(m => ({
                    Component: m.default,
                  })),
              },
            ],
          },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);

function App(): ReactElement {
  return (
    <OTConfigurationProvider config={config}>
      <SearchProvider
        searchQuery={SEARCH_QUERY}
        searchPlaceholder="Search for a target, drug, disease, or phenotype..."
      >
        <RouterProvider router={router} />
      </SearchProvider>
    </OTConfigurationProvider>
  );
}

export default App;
