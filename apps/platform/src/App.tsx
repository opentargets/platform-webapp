import { ReactElement } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { SearchProvider, PrivateRoute, OTConfigurationProvider, FromGeneticsModal } from "ui";
import { ReportBuilderProvider } from "ui/src/providers/ReportBuilderProvider";
import ReportBuilder from "ui/src/components/Report/ReportBuilder";
import ReportToggleButton from "ui/src/components/Report/ReportToggleButton";
import { getConfig } from "@ot/config";

import SEARCH_QUERY from "./components/Search/SearchQuery.gql";

import HomePage from "./pages/HomePage/HomePage";
import SearchPage from "./pages/SearchPage";
import DiseasePage from "./pages/DiseasePage/DiseasePage";
import DownloadsPage from "./pages/DownloadsPage";
import DrugPage from "./pages/DrugPage";
import TargetPage from "./pages/TargetPage";
import EvidencePage from "./pages/EvidencePage";
import VariantPage from "./pages/VariantPage";
import StudyPage from "./pages/StudyPage";
import CredibleSetPage from "./pages/CredibleSetPage";
import APIPage from "./pages/APIPage";
import NotFoundPage from "./pages/NotFoundPage";
import ProjectsPage from "./pages/ProjectsPage";

const config = getConfig();

function App(): ReactElement {
  return (
    <ReportBuilderProvider>
      <OTConfigurationProvider config={config}>
        <SearchProvider
          searchQuery={SEARCH_QUERY}
          searchPlaceholder="Search for a target, drug, disease, or phenotype..."
        >
          <Router>
            <FromGeneticsModal />
            <ReportBuilder />
            <ReportToggleButton />
            <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/api" element={<APIPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/downloads/*" element={<DownloadsPage />} />
            <Route path="/target/:ensgId/*" element={<TargetPage />} />
            <Route path="/disease/:efoId/*" element={<DiseasePage />} />
            <Route path="/evidence/:ensgId/:efoId/*" element={<EvidencePage />} />
            <Route path="/drug/:chemblId/*" element={<DrugPage />} />
            <Route path="/variant/:varId/*" element={<VariantPage />} />
            <Route path="/study/:studyId/*" element={<StudyPage />} />
            <Route path="/credible-set/:studyLocusId/*" element={<CredibleSetPage />} />
            <Route
              path="/projects"
              element={
                <PrivateRoute>
                  <ProjectsPage />
                </PrivateRoute>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Router>
      </SearchProvider>
    </OTConfigurationProvider>
    </ReportBuilderProvider>
  );
}

export default App;
