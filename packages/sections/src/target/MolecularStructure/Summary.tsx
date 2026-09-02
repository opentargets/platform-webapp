import { SummaryItem, usePlatformApi } from "ui";

import { definition } from ".";
import MOLECULAR_STRUCTURE_FRAGMENT from "./summaryQuery.gql";

function Summary() {
  const request = usePlatformApi(MOLECULAR_STRUCTURE_FRAGMENT);

  return (
    <SummaryItem
      definition={definition}
      request={request}
      renderSummary={() => "Positional, Structural and Functional Information"}
    />
  );
}

Summary.fragments = {
  MolecularStructureSummaryFragment: MOLECULAR_STRUCTURE_FRAGMENT,
};

export default Summary;
