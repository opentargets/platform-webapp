import { useQuery } from "@apollo/client";
import { SectionItem, TableDrawer, OtTable, Link } from "ui";

import { dataTypesMap, naLabel, sectionsBaseSizeQuery, EvidenceBodyProps} from "@ot/constants";
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
  entity: string;
  label: { symbol: string; name: string };
};

function Body({ id, label, entity }: Props) {
  const { ensgId, efoId } = id;

  const variables = {
    ensemblId: ensgId,
    efoId,
    size: sectionsBaseSizeQuery,
  };

  const request = useQuery(CRISPR_QUERY, {
    variables,
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
          <OtTable
            columns={columns}
            rows={request.data?.disease.crisprSummary.rows}
            dataDownloader
            dataDownloaderFileStem={`crispr-evidence-${ensgId}-${efoId}`}
            showGlobalFilter
            query={CRISPR_QUERY.loc.source.body}
            variables={variables}
            loading={request.loading}
          />
        );
      }}
    />
  );
}

export default Body;
