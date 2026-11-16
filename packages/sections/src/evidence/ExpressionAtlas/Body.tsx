import { useQuery } from "@apollo/client";
import { SectionItem, Tooltip, Link, ScientificNotation, OtTableServer, Typography } from "ui";

import Description from "./Description";
import { sentenceCase } from "@ot/utils";
import EXPRESSION_ATLAS_QUERY from "./ExpressionAtlasQuery.gql";
import { definition } from ".";
import { dataTypesMap, type EvidenceBodyProps} from "@ot/constants";

const columns = [
  {
    id: "disease.name",
    label: "Disease/phenotype",
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
          {disease.name}
        </Link>
      </Tooltip>
    ),
  },
  {
    id: "studyId",
    label: "Experiment ID",
    enableHiding: false,
    renderCell: ({ studyId }) => (
      <Link external to={`http://www.ebi.ac.uk/gxa/experiments/${studyId}`}>
        {studyId}
      </Link>
    ),
  },
  {
    id: "contrast",
    label: "Experiment details",
    renderCell: ({ contrast, studyOverview }) => (
      <Tooltip title={studyOverview} showHelpIcon>
        <span>{contrast}</span>
      </Tooltip>
    ),
  },
  {
    id: "confidence",
    label: "Experiment confidence",
    renderCell: ({ confidence }) => (
      <Tooltip
        title={
          <Typography variant="caption" display="block" align="center">
            As defined by the{" "}
            <Link external to="https://www.ebi.ac.uk/gxa/FAQ.html">
              Expression Atlas Guideline
            </Link>
          </Typography>
        }
        showHelpIcon
      >
        {sentenceCase(confidence)}
      </Tooltip>
    ),
  },
  {
    id: "log2FoldChangeValue",
    label: (
      <>
        Log<sub>2</sub> fold change
      </>
    ),
    numeric: true,
  },
  {
    id: "log2FoldChangePercentileRank",
    label: "Percentile",
    numeric: true,
  },
  {
    id: "resourceScore",
    label: (
      <>
        <i>p</i>-value
      </>
    ),
    renderCell: ({ resourceScore }) => <ScientificNotation number={resourceScore} />,
    numeric: true,
  },
];

type Props = EvidenceBodyProps;

const PAGE_SIZE = 10;

function Body({ id, label, entity }: Props) {
  const { ensgId, efoId } = id;
  const variables = { ensemblId: ensgId, efoId };

  // first page only: drives the section loading/error state, the table fetches
  // the same page from the Apollo cache and then paginates on its own
  const request = useQuery(EXPRESSION_ATLAS_QUERY, {
    variables: { ...variables, index: 0, size: PAGE_SIZE },
  });

  return (
    <SectionItem
      definition={definition}
      chipText={dataTypesMap.rna_expression}
      request={request}
      entity={entity}
      renderDescription={() => <Description symbol={label.symbol} name={label.name} />}
      renderBody={() => {
        return (
          <OtTableServer
            query={EXPRESSION_ATLAS_QUERY}
            columns={columns}
            dataDownloader
            dataDownloaderFileStem={`expression-atlas-${ensgId}-${efoId}`}
            dataPath="disease.expressionAtlasSummary"
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
