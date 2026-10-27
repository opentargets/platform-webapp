import type {
  TargetBibliographyQuery,
  TargetBibliographyQueryVariables,
  TargetBodyProps,
} from "@ot/constants";
import { Body as Bibliography } from "../../common/Literature";
import { typedDocument } from "../../utils/typedDocument";
import { definition } from ".";
import TARGET_LITERATURE_OCURRENCES_DOCUMENT from "./SimilarEntities.gql";

const TARGET_LITERATURE_OCURRENCES = typedDocument<
  TargetBibliographyQuery,
  TargetBibliographyQueryVariables
>(TARGET_LITERATURE_OCURRENCES_DOCUMENT);

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
