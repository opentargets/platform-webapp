import { definition } from ".";
import { Body as Bibliography } from "../../common/Literature";

import DRUGS_LITERATURE_OCURRENCES_DOCUMENT from "./BibliographyQuery.gql";
import { typedDocument } from "../../utils/typedDocument";
import type { DrugBibliographyQuery, DrugBibliographyQueryVariables } from "@ot/constants";

import type { DrugBodyProps } from "@ot/constants";

const DRUGS_LITERATURE_OCURRENCES = typedDocument<DrugBibliographyQuery, DrugBibliographyQueryVariables>(DRUGS_LITERATURE_OCURRENCES_DOCUMENT);

type Props = DrugBodyProps;

function Body({ id, label: name }: Props) {
  return (
    <Bibliography
      definition={definition}
      entity="drug"
      id={id}
      name={name}
      BODY_QUERY={DRUGS_LITERATURE_OCURRENCES}
    />
  );
}

export default Body;
