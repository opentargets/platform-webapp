import { useQuery } from "@apollo/client";
import { SectionItem, TableDrawer, OtTableServer, Link } from "ui";

import { dataTypesMap, naLabel, type EvidenceBodyProps} from "@ot/constants";
import Description from "./Description";
import { definition } from ".";

import CRISPR_QUERY from "./CrisprQuery.gql";

const columns = [
  {
    id: "disease.name",
    label: "Disease/phenotype",
    enableHiding: false,
    renderCell: ({ disease }) => (
      <Link asyncTooltip to={`/disease/${disease.id}`}>
        {disease.name}
      </Link>
    ),
  },
  {
    label: "Reported disease/phenotype",
    enableHiding: false,
    renderCell: ({ diseaseCellLines, diseaseFromSource }) => {
      if (!diseaseCellLines) return naLabel;

      const cellLines = diseaseCellLines.map(line => ({
        name: line.name,
        url: `https://cellmodelpassports.sanger.ac.uk/passports/${line.id}`,
        group: "Cancer Cell Lines",
      }));

      return (
        <TableDrawer
          entries={cellLines}
          message={`${diseaseCellLines.length} ${diseaseFromSource} cell lines`}
        />
      );
    },
    filterValue: ({ diseaseFromSource }) => diseaseFromSource,
  },
  {
    id: "resourceScore",
    label: "Priority score",
    renderCell: ({ resourceScore }) => resourceScore.toFixed(3),
  },
];

type Props = EvidenceBodyProps;

const PAGE_SIZE = 10;

function Body({ id, label, entity }: Props) {
  const { ensgId, efoId } = id;

  const variables = { ensemblId: ensgId, efoId };

  // first page only: drives the section loading/error state, the table fetches
  // the same page from the Apollo cache and then paginates on its own
  const request = useQuery(CRISPR_QUERY, {
    variables: { ...variables, index: 0, size: PAGE_SIZE },
  });

  return (
    <SectionItem
      definition={definition}
      chipText={dataTypesMap.affected_pathway}
      request={request}
      entity={entity}
      renderDescription={() => <Description symbol={label.symbol} name={label.name} />}
      renderBody={() => {
        return (
          <OtTableServer
            query={CRISPR_QUERY}
            columns={columns}
            dataDownloader
            dataDownloaderFileStem={`crispr-evidence-${ensgId}-${efoId}`}
            dataPath="disease.crisprSummary"
            pageSize={PAGE_SIZE}
            showGlobalFilter={false}
            variables={variables}
          />
        );
      }}
    />
  );
}

export default Body;
