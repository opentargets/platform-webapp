import { SummaryItem, usePlatformApi } from "ui";

import { definition } from ".";
import { dataTypesMap } from "@ot/constants";
import UNIPROT_LITERATURE_SUMMARY from "./UniprotLiteratureSummary.gql";

function Summary() {
  const request = usePlatformApi(UNIPROT_LITERATURE_SUMMARY);
  return (
    <SummaryItem
      definition={definition}
      request={request}
      renderSummary={({ uniprotLiteratureSummary }) => {
        const { count } = uniprotLiteratureSummary;
        return `${count} ${count === 1 ? "entry" : "entries"}`;
      }}
      subText={dataTypesMap.genetic_association}
    />
  );
}

Summary.fragments = {
  UniprotLiteratureSummary: UNIPROT_LITERATURE_SUMMARY,
};

export default Summary;
