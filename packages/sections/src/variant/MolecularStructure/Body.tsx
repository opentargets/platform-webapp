import { ReactElement } from "react";
import { useQuery } from "@apollo/client";
import { SectionItem, ViewerProvider, ViewerInteractionProvider, useReportQueryVariables } from "ui";
import { definition } from ".";
import Description from "./Description";
import MOLECULAR_STRUCTURE_QUERY from "./MolecularStructureQuery.gql";
import StructureViewer from "./StructureViewer";
import { initialState, reducer } from "./context";

type BodyProps = {
  id: string;
  entity: string;
};

export function Body({ id, entity }: BodyProps): ReactElement {
  const savedVariables = useReportQueryVariables();
  const variables = savedVariables || {
    variantId: id,
  };
  const request = useQuery(MOLECULAR_STRUCTURE_QUERY, {
    variables,
  });

  const variant = request.data?.variant;
  const proteinCodingCoordinatesRow = variant?.proteinCodingCoordinates?.rows?.[0];

  if (!proteinCodingCoordinatesRow) return null;

  return (
    <SectionItem
      definition={definition}
      request={request}
      entity={entity}
      renderDescription={() => (
        <Description
          variantId={variant?.id}
          referenceAllele={variant?.referenceAllele}
          alternateAllele={variant?.alternateAllele}
          targetId={proteinCodingCoordinatesRow?.target?.id}
          targetApprovedSymbol={proteinCodingCoordinatesRow?.target?.approvedSymbol}
          uniprotAccession={proteinCodingCoordinatesRow?.uniprotAccessions?.[0]}
        />
      )}
      renderBody={() => (
        <ViewerProvider
          initialState={{
            ...initialState,
            variantSummary: `${
              proteinCodingCoordinatesRow.referenceAminoAcid}${
              proteinCodingCoordinatesRow.aminoAcidPosition}${
              proteinCodingCoordinatesRow.alternateAminoAcid
            }`
          }}
          reducer={reducer}
        >
          <ViewerInteractionProvider>
            <StructureViewer row={proteinCodingCoordinatesRow} />
          </ViewerInteractionProvider>
        </ViewerProvider>
      )}
    />
  );
}

export default Body;
