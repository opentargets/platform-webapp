import type { ReactElement } from "react";
import { AssociationsView } from "../../../components/AssociationsToolkit";
import { ENTITY } from "../../../components/AssociationsToolkit/types";
import {
  GeneEnrichmentAnalysisModal,
  GeneEnrichmentProvider,
} from "../../../components/GeneEnrichmentAnalysis";
import DISEASE_ASSOCIATIONS_QUERY from "./DiseaseAssociationsQuery.gql";

type DiseaseAssociationsProps = {
  efoId: string;
};

function DiseaseAssociations(pros: DiseaseAssociationsProps): ReactElement {
  return (
    <GeneEnrichmentProvider>
      <GeneEnrichmentAnalysisModal />
      <AssociationsView
        key={pros.efoId}
        id={pros.efoId}
        entity={ENTITY.DISEASE}
        query={DISEASE_ASSOCIATIONS_QUERY}
      />
    </GeneEnrichmentProvider>
  );
}

export default DiseaseAssociations;
