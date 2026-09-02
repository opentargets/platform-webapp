import { Body as Bibliography } from "../../common/Literature";
import { definition } from ".";

import DISEASE_LITERATURE_OCURRENCES from "./BibliographyQuery.gql";
import type { DiseaseBodyProps } from "@ot/constants";

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
