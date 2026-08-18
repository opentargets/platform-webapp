import { SummaryItem, usePlatformApi } from "ui";

import { definition } from ".";
import { dataTypesMap } from "@ot/constants";
import UNIPROT_VARIANTS_SUMMARY from "./UniprotVariantsSummaryQuery.gql";

function Summary() {
  const request = usePlatformApi(UNIPROT_VARIANTS_SUMMARY);
  return (
    <SummaryItem
      definition={definition}
      request={request}
      renderSummary={({ uniprotVariantsSummary }) => {
        const { count } = uniprotVariantsSummary;
        return `${count} ${count === 1 ? "entry" : "entries"}`;
      }}
      subText={dataTypesMap.genetic_association}
    />
  );
}

Summary.fragments = {
  UniprotVariantsSummary: UNIPROT_VARIANTS_SUMMARY,
};

export default Summary;
