import { useQuery } from "@apollo/client";
import { Link, TableDrawer, OtTable, SectionItem } from "ui";

import { definition } from ".";
import Description from "./Description";
import MOUSE_PHENOTYPES_QUERY from "./MousePhenotypes.gql";
import AllelicCompositionDrawer from "./AllelicCompositionDrawer";

const columns = [
  {
    id: "targetInModel",
    label: "Mouse gene",
    enableHiding: false,
    renderCell: ({ targetInModel, targetInModelMgiId }) => (
      <Link external to={`https://identifiers.org/${targetInModelMgiId}`}>
        {targetInModel}
      </Link>
    ),
  },
  {
    id: "modelPhenotypeLabel",
    label: "Phenotype",
    renderCell: ({ modelPhenotypeLabel, modelPhenotypeId }) => (
      <Link external to={`https://identifiers.org/${modelPhenotypeId}`}>
        {modelPhenotypeLabel}
      </Link>
    ),
  },
  {
    id: "modelPhenotypeClasses",
    label: "Category",
    filterValue: ({ modelPhenotypeClasses }) => {
      if (modelPhenotypeClasses.length === 1) {
        return modelPhenotypeClasses[0].label;
      }
      return "categories";
    },
    renderCell: ({ modelPhenotypeClasses }) => {
      const entries = modelPhenotypeClasses.map(phenotypeClass => ({
        name: phenotypeClass.label,
        url: `https://identifiers.org/${phenotypeClass.id}`,
        group: "Categories",
      }));
      return (
        <TableDrawer
          caption="Category"
          message={`${modelPhenotypeClasses.length} categories`}
          entries={entries}
        />
      );
    },
    exportValue: ({ modelPhenotypeClasses }) =>
      modelPhenotypeClasses.map(phenotypeClass => phenotypeClass.label),
  },
  {
    id: "allelicComposition",
    label: "Allelic composition",
    enableHiding: false,
    renderCell: ({ biologicalModels }) => (
      <AllelicCompositionDrawer biologicalModels={biologicalModels} />
    ),
    exportValue: ({ biologicalModels }) => biologicalModels.map(bm => bm.allelicComposition),
  },
];

type Props = {
  id: string;
  entity: string;
  label: string;
};

function Body({ id, label: symbol, entity }: Props) {
  const variables = { ensemblId: id };
  const request = useQuery(MOUSE_PHENOTYPES_QUERY, {
    variables,
  });

  return (
    <SectionItem
      definition={definition}
      entity={entity}
      request={request}
      renderDescription={() => <Description symbol={symbol} />}
      renderBody={() => (
        <OtTable
          showGlobalFilter
          dataDownloader
          dataDownloaderFileStem={`${symbol}-mouse-phenotypes`}
          columns={columns}
          rows={request.data?.target.mousePhenotypes}
          query={MOUSE_PHENOTYPES_QUERY.loc.source.body}
          variables={variables}
          loading={request.loading}
        />
      )}
    />
  );
}

export default Body;
