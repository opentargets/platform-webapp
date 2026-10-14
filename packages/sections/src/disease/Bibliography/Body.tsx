import { Body as Bibliography } from "../../common/Literature";
import { definition } from ".";

import DISEASE_LITERATURE_OCURRENCES_DOCUMENT from "./BibliographyQuery.gql";
import { typedDocument } from "../../utils/typedDocument";
import type { DiseaseBibliographyQuery, DiseaseBibliographyQueryVariables } from "@ot/constants";

import type { DiseaseBodyProps } from "@ot/constants";

const DISEASE_LITERATURE_OCURRENCES = typedDocument<DiseaseBibliographyQuery, DiseaseBibliographyQueryVariables>(DISEASE_LITERATURE_OCURRENCES_DOCUMENT);

type Props = DiseaseBodyProps;

function Body({ id, label: name, entity }: Props) {
  return (
    <Bibliography
      definition={definition}
      entity={entity}
      id={id}
      name={name}
      BODY_QUERY={DISEASE_LITERATURE_OCURRENCES}
    />
  );
}

export default Body;
