import { useQuery } from "@apollo/client";
import { Typography } from "@mui/material";
import {
  Link,
  SectionItem,
  Tooltip,
  PublicationsDrawer,
  EllsWrapper,
  OtTable,
  TableDrawer,
} from "ui";

import { definition } from ".";
import Description from "./Description";
import { epmcUrl, sentenceCase } from "@ot/utils";

import REACTOME_QUERY from "./sectionQuery.gql";
import {
  dataTypesMap,
  defaultRowsPerPageOptions,
  naLabel,
  sectionsBaseSizeQuery,, EvidenceBodyProps} from "@ot/constants";

const getColumns = label => [
  {
    id: "disease",
    label: "Disease / phenotype",
    renderCell: ({ disease, diseaseFromSource }) => (
      <Tooltip
        title={
          <>
            <Typography variant="subtitle2" display="block" align="center">
              Reported disease or phenotype:
            </Typography>
            <Typography variant="caption" display="block" align="center">
              {diseaseFromSource}
            </Typography>
          </>
        }
        showHelpIcon
      >
        <Link asyncTooltip to={`/disease/${disease.id}`}>
          <EllsWrapper>{disease.name}</EllsWrapper>
        </Link>
      </Tooltip>
    ),
    width: "18%",
  },
  {
    id: "pathways",
    label: "Pathway",
    renderCell: ({ pathways }) => {
      if (!pathways || pathways.length === 0) {
        return naLabel;
      }
      if (pathways.length === 1) {
        return (
          <Link external to={`http://www.reactome.org/PathwayBrowser/#${pathways[0].id}`}>
            <EllsWrapper>{pathways[0].name}</EllsWrapper>
          </Link>
        );
      }
      const refs = pathways.map(p => ({
        url: `http://www.reactome.org/PathwayBrowser/#${p.id}`,
        name: p.name,
        group: "Pathways",
      }));
      return <TableDrawer entries={refs} message={`${refs.length} pathways`} />;
    },
    width: "17%",
  },
  {
    id: "reactionId",
    label: "Reaction",
    enableHiding: false,
    renderCell: ({ reactionName, reactionId }) => (
      <Link external to={`https://identifiers.org/reactome/${reactionId}`}>
        <EllsWrapper>{reactionName}</EllsWrapper>
      </Link>
    ),
    width: "17%",
  },
  {
    id: "targetFromSourceId",
    label: "Reported target",
    renderCell: ({ targetFromSourceId }) => (
      <Link external to={`https://identifiers.org/uniprot/${targetFromSourceId}`}>
        <EllsWrapper>{targetFromSourceId}</EllsWrapper>
      </Link>
    ),
    width: "12%",
  },
  {
    id: "targetModulation",
    label: "Target modulation",
    renderCell: ({ targetModulation }) =>
      targetModulation ? <EllsWrapper>{sentenceCase(targetModulation)}</EllsWrapper> : naLabel,
    filterValue: ({ targetModulation }) => sentenceCase(targetModulation),
    width: "12%",
  },
  {
    id: "variantAminoacidDescriptions",
    label: "Amino acid variation",
    renderCell: ({ variantAminoacidDescriptions }) => {
      if (variantAminoacidDescriptions?.length === 1) {
        return <EllsWrapper>{variantAminoacidDescriptions[0]}</EllsWrapper>;
      }
      if (variantAminoacidDescriptions?.length > 1) {
        return (
          <TableDrawer
            entries={variantAminoacidDescriptions.map(d => ({
              name: d,
              group: "Amino acid variation",
            }))}
          />
        );
      }
      return naLabel;
    },
    width: "12%",
  },
  {
    id: "literature",
    label: "Literature",
    renderCell: ({ literature = [] }) => {
      const literatureList = [];
      literature?.forEach(id => {
        if (id !== "NA") {
          literatureList.push({
            name: id,
            url: epmcUrl(id),
            group: "literature",
          });
        }
      });
      return (
        <PublicationsDrawer entries={literatureList} symbol={label.symbol} name={label.name} />
      );
    },
    width: "12%",
  },
];

type Props = EvidenceBodyProps;

function Body({ id, label, entity }: Props) {
  const { ensgId, efoId } = id;

  const variables = {
    ensemblId: ensgId,
    efoId,
    size: sectionsBaseSizeQuery,
  };

  const request = useQuery(REACTOME_QUERY, {
    variables,
  });

  const columns = getColumns(label);

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
            rows={request.data?.disease.reactomeSummary.rows}
            dataDownloader
            dataDownloaderFileStem={`reactome-${ensgId}-${efoId}`}
            showGlobalFilter
            rowsPerPageOptions={defaultRowsPerPageOptions}
            fixed
            noWrapHeader={false}
            query={REACTOME_QUERY.loc.source.body}
            variables={variables}
            loading={request.loading}
          />
        );
      }}
    />
  );
}

export default Body;
