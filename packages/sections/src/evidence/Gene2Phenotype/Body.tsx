import { List, ListItem, Typography } from "@mui/material";
import { useQuery } from "@apollo/client";
import { v1 } from "uuid";
import {
  SectionItem,
  Tooltip,
  Link,
  PublicationsDrawer,
  DirectionOfEffectIcon,
  DirectionOfEffectTooltip,
  OtTable,
} from "ui";

import { dataTypesMap, naLabel, sectionsBaseSizeQuery, EvidenceBodyProps} from "@ot/constants";
import Description from "./Description";
import { epmcUrl, sentenceCase } from "@ot/utils";
import OPEN_TARGETS_GENETICS_QUERY from "./sectionQuery.gql";
import { definition } from ".";

const g2pUrl = (targetFromSourceId, diseaseFromSource) =>
  `https://www.ebi.ac.uk/gene2phenotype/search?query=${targetFromSourceId}-related%20${diseaseFromSource}`;

const getColumns = label => [
  {
    id: "disease.name",
    label: "Disease/phenotype",
    enableHiding: false,
    renderCell: ({ disease, diseaseFromSource }) => (
      <Tooltip
        title={
          <>
            <Typography variant="subtitle2" display="block" align="center">
              Reported disease or phenotype:
            </Typography>
            <Typography variant="caption" display="block" align="center">
              {sentenceCase(diseaseFromSource)}
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
    id: "variantFunctionalConsequence",
    label: "Functional consequence",
    renderCell: ({ variantFunctionalConsequence }) =>
      variantFunctionalConsequence ? (
        <Link
          external
          to={`http://www.sequenceontology.org/browser/current_svn/term/${variantFunctionalConsequence.id}`}
        >
          {sentenceCase(variantFunctionalConsequence.label)}
        </Link>
      ) : (
        naLabel
      ),
    filterValue: ({ variantFunctionalConsequence }) =>
      sentenceCase(variantFunctionalConsequence?.label),
  },
  {
    id: "directionOfVariantEffect",
    label: (
      <DirectionOfEffectTooltip docsUrl="https://platform-docs.opentargets.org/evidence#gene2phenotype"></DirectionOfEffectTooltip>
    ),
    renderCell: ({ directionOnTarget, directionOnTrait }) => {
      return (
        <DirectionOfEffectIcon variantEffect={directionOnTarget} directionOnTrait={directionOnTrait} />
      );
    },
  },
  {
    id: "allelicRequirements",
    label: "Allelic requirement",
    renderCell: ({ allelicRequirements }) => {
      if (allelicRequirements && allelicRequirements.length > 1) {
        return (
          <List>
            {allelicRequirements.map(item => (
              <ListItem key={v1()}>{item}</ListItem>
            ))}
          </List>
        );
      }
      if (allelicRequirements && allelicRequirements.length === 1) {
        return sentenceCase(allelicRequirements[0]);
      }

      return naLabel;
    },
    filterValue: ({ allelicRequirements }) => allelicRequirements.join(),
  },
  {
    id: "studyId",
    label: "Panel",
    enableHiding: false,
    renderCell: ({ studyId, targetFromSourceId, diseaseFromSource }) => (
      <Link external to={g2pUrl(targetFromSourceId, diseaseFromSource)}>
        {studyId}
      </Link>
    ),
  },
  {
    id: "confidence",
    label: "Confidence category",
    renderCell: ({ confidence }) =>
      confidence ? (
        <Tooltip
          title={
            <Typography variant="caption" display="block" align="center">
              As defined by the{" "}
              <Link external to="https://thegencc.org/faq.html#validity-termsdelphi-survey">
                GenCC Guidelines
              </Link>
            </Typography>
          }
          showHelpIcon
        >
          {sentenceCase(confidence)}
        </Tooltip>
      ) : (
        naLabel
      ),
  },
  {
    id: "literature",
    label: "Literature",
    renderCell: ({ literature }) => {
      const entries = literature
        ? literature.map(id => ({
            name: id,
            url: epmcUrl(id),
            group: "literature",
          }))
        : [];
      return <PublicationsDrawer entries={entries} symbol={label.symbol} name={label.name} />;
    },
  },
];

type Props = EvidenceBodyProps;

function Body({ id: { ensgId, efoId }, label: { symbol, name }, entity }: Props) {
  const variables = { ensemblId: ensgId, efoId, size: sectionsBaseSizeQuery };

  const request = useQuery(OPEN_TARGETS_GENETICS_QUERY, {
    variables,
  });

  const columns = getColumns({ symbol, name });

  return (
    <SectionItem
      definition={definition}
      chipText={dataTypesMap.genetic_association}
      request={request}
      entity={entity}
      renderDescription={() => <Description symbol={symbol} name={name} />}
      renderBody={() => (
        <OtTable
          columns={columns}
          dataDownloader
          dataDownloaderFileStem={`${ensgId}-${efoId}-gene2phenotype`}
          rows={request.data?.disease.gene2Phenotype.rows}
          showGlobalFilter
          query={OPEN_TARGETS_GENETICS_QUERY.loc.source.body}
          variables={variables}
          loading={request.loading}
        />
      )}
    />
  );
}

export default Body;
