import { useQuery } from "@apollo/client";
import type {
  TargetBodyProps,
  TargetMousePhenotypesQuery,
  TargetMousePhenotypesQueryVariables,
} from "@ot/constants";
import { Link, type OtTableColumn, OtTableServer, SectionItem, TableDrawer } from "ui";
import { typedDocument } from "../../utils/typedDocument";
import { definition } from ".";
import AllelicCompositionDrawer from "./AllelicCompositionDrawer";
import Description from "./Description";
import MOUSE_PHENOTYPES_QUERY_DOCUMENT from "./MousePhenotypes.gql";

const MOUSE_PHENOTYPES_QUERY = typedDocument<
  TargetMousePhenotypesQuery,
  TargetMousePhenotypesQueryVariables
>(MOUSE_PHENOTYPES_QUERY_DOCUMENT);

type MousePhenotypeRow = NonNullable<
  TargetMousePhenotypesQuery["target"]
>["mousePhenotypes"]["rows"][number];

const PAGE_SIZE = 10;

const columns: OtTableColumn<MousePhenotypeRow>[] = [
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
      const entries = modelPhenotypeClasses.map((phenotypeClass) => ({
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
      modelPhenotypeClasses.map((phenotypeClass) => phenotypeClass.label),
  },
  {
    id: "allelicComposition",
    label: "Allelic composition",
    enableHiding: false,
    renderCell: ({ biologicalModels }) => (
      <AllelicCompositionDrawer biologicalModels={biologicalModels} />
    ),
    exportValue: ({ biologicalModels }) => biologicalModels.map((bm) => bm.allelicComposition),
  },
];

type Props = TargetBodyProps;

function Body({ id, label: symbol, entity }: Props) {
  const variables = { ensemblId: id };
  // first page only: drives the section loading/error state, the table fetches
  // the same page from the Apollo cache and then paginates on its own
  const request = useQuery(MOUSE_PHENOTYPES_QUERY, {
    variables: { ...variables, index: 0, size: PAGE_SIZE },
  });

  return (
    <SectionItem
      definition={definition}
      entity={entity}
      request={request}
      renderDescription={() => <Description symbol={symbol} />}
      renderBody={() => (
        <OtTableServer<MousePhenotypeRow>
          columns={columns}
          query={MOUSE_PHENOTYPES_QUERY}
          variables={variables}
          dataPath="target.mousePhenotypes"
          pageSize={PAGE_SIZE}
          dataDownloader
          dataDownloaderFileStem={`${symbol}-mouse-phenotypes`}
        />
      )}
    />
  );
}

export default Body;
