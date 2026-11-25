import { gql } from "@apollo/client";

import { SummaryItem, usePlatformApi } from "ui";
import type { WidgetDefinition } from "../../types/widget";

const SIMILARENTTIES_SUMMARY_FRAGMENT = gql`
  fragment SimilarEntitiesDisease on Disease {
    similarEntities(threshold: 0.5, page: { index: 0, size: 20 }) {
      count
    }
  }
`;

type Props = { definition: WidgetDefinition };

function Summary({ definition }: Props) {
  const request = usePlatformApi(SIMILARENTTIES_SUMMARY_FRAGMENT);

  return (
    <SummaryItem
      definition={definition}
      request={request}
      renderSummary={(data) => (data.similarEntities?.count > 0 ? "Data available" : "no data")}
    />
  );
}

Summary.fragments = {
  SimilarEntitiesDisease: SIMILARENTTIES_SUMMARY_FRAGMENT,
};

export default Summary;
