import type {
  DrugBibliographyQuery,
  DrugBibliographyQueryVariables,
  DrugBodyProps,
} from "@ot/constants";
import { Body as Bibliography } from "../../common/Literature";
import { typedDocument } from "../../utils/typedDocument";
import { definition } from ".";
import DRUGS_LITERATURE_OCURRENCES_DOCUMENT from "./BibliographyQuery.gql";

const DRUGS_LITERATURE_OCURRENCES = typedDocument<
  DrugBibliographyQuery,
  DrugBibliographyQueryVariables
>(DRUGS_LITERATURE_OCURRENCES_DOCUMENT);

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
