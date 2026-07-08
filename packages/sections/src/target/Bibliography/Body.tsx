import { Body as Bibliography } from "../../common/Literature";
import { definition } from ".";
import TARGET_LITERATURE_OCURRENCES from "./SimilarEntities.gql";
import type { TargetBodyProps } from "@ot/constants";

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
