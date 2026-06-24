import { ReactElement } from "react";
import { AssociationsView } from "../../../components/AssociationsToolkit";
import { ENTITY } from "../../../components/AssociationsToolkit/types";
import TARGET_ASSOCIATIONS_QUERY from "./TargetAssociationsQuery.gql";

type TargetAssociationsProps = {
  ensgId: string;
};

function TargetAssociations({ ensgId }: TargetAssociationsProps): ReactElement {
  return <AssociationsView key={ensgId} id={ensgId} entity={ENTITY.TARGET} query={TARGET_ASSOCIATIONS_QUERY} />;
}

export default TargetAssociations;
