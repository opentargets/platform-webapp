import { Body as Bibliography } from "../../common/Literature";
import { definition } from ".";
import TARGET_LITERATURE_OCURRENCES_DOCUMENT from "./SimilarEntities.gql";
import { typedDocument } from "../../utils/typedDocument";
import type { TargetBibliographyQuery, TargetBibliographyQueryVariables } from "@ot/constants";

import type { TargetBodyProps } from "@ot/constants";

const TARGET_LITERATURE_OCURRENCES = typedDocument<TargetBibliographyQuery, TargetBibliographyQueryVariables>(TARGET_LITERATURE_OCURRENCES_DOCUMENT);

type Props = TargetBodyProps;

function Body({ id, label: name, entity }: Props) {
  return (
    <Bibliography
      definition={definition}
      entity={entity}
      id={id}
      name={name}
      BODY_QUERY={TARGET_LITERATURE_OCURRENCES}
    />
  );
}

export default Body;
