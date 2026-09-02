import { SummaryItem, usePlatformApi } from "ui";

import { definition } from ".";
import MOLECULAR_STRUCTURE_SUMMARY from "./MolecularStructureSummaryFragment.gql";

function Summary() {
  const request = usePlatformApi(MOLECULAR_STRUCTURE_SUMMARY);

  return <SummaryItem definition={definition} request={request} />;
}

Summary.fragments = {
  VariantMolecularStructureSummaryFragment: MOLECULAR_STRUCTURE_SUMMARY,
};

export default Summary;
