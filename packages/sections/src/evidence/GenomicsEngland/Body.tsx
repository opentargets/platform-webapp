import { useQuery } from "@apollo/client";
import { faCheckSquare, faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Typography } from "@mui/material";
import { v1 } from "uuid";
import { Tooltip, SectionItem, Link, PublicationsDrawer, OtTable } from "ui";

import { definition } from ".";
import { dataTypesMap, naLabel, sectionsBaseSizeQuery, type EvidenceBodyProps} from "@ot/constants";
import Description from "./Description";
import { epmcUrl, sentenceCase } from "@ot/utils";

import GENOMICS_ENGLAND_QUERY from "./sectionQuery.gql";

const geUrl = (id, approvedSymbol) =>
  `https://panelapp.genomicsengland.co.uk/panels/${id}/gene/${approvedSymbol}`;

const confidenceCaption = confidence =>
  ({
    green: (
      <span style={{ color: "#3fad46" }}>
        <FontAwesomeIcon icon={faCheckSquare} size="sm" /> {sentenceCase(confidence)}
      </span>
    ),
    amber: (
      <span style={{ color: "#f0ad4e" }}>
        <FontAwesomeIcon icon={faExclamationTriangle} size="sm" /> {sentenceCase(confidence)}
      </span>
    ),
  }[confidence]);

const confidenceMap = confidence =>
  ({
    green: 20,
    amber: 10,
  }[confidence?.toLowerCase()] || 0);

const allelicRequirementsCaption = allelicRequirements => {
  const caption = sentenceCase(allelicRequirements.split(" ", 1)[0].replace(/[;:,]*/g, ""));
  const description =
    allelicRequirements.split(" ").slice(1).join(" ") || "No more information available";

  return [caption, description];
};

const getColumns = label => [
  {
    id: "disease",
    label: "Disease/phenotype",
    enableHiding: false,
    renderCell: ({ disease, diseaseFromSource, cohortPhenotypes }) => (
      <Tooltip
        title={
          <>
            <Typography variant="subtitle2" display="block" align="center">
              Reported disease or phenotype:
            </Typography>
            <Typography variant="caption" display="block" align="center" gutterBottom>
              {sentenceCase(diseaseFromSource)}
            </Typography>

            {cohortPhenotypes?.length > 1 ? (
              <>
                <Typography variant="subtitle2" display="block" align="center">
                  All reported phenotypes:
                </Typography>
                <Typography variant="caption" display="block">
                  {cohortPhenotypes.map(cp => (
                    <div key={cp}>{cp}</div>
                  ))}
                </Typography>
              </>
            ) : (
              ""
            )}
          </>
        }
        showHelpIcon
      >
        <Link asyncTooltip to={`/disease/${disease.id}`}>
          {disease.name}
        </Link>
      </Tooltip>
    ),
    filterValue: ({ disease, diseaseFromSource }) => [disease.name, diseaseFromSource].join(),
  },
  {
    id: "allelicRequirements",
    label: "Allelic Requirement",
    renderCell: ({ allelicRequirements }) =>
      allelicRequirements
        ? allelicRequirements.map(item => {
            const [caption, description] = allelicRequirementsCaption(item);

            return (
              <Tooltip key={v1()} placement="top" title={description} showHelpIcon>
                {caption}
              </Tooltip>
            );
          })
        : naLabel,
  },
  {
    id: "studyOverview",
    label: "Genomics England Panel",
    enableHiding: false,
    renderCell: ({ studyOverview, studyId, target: { approvedSymbol } }) =>
      studyOverview && studyId && approvedSymbol ? (
        <Link external to={geUrl(studyId, approvedSymbol)}>
          {studyOverview}
        </Link>
      ) : (
        naLabel
      ),
  },
  {
    id: "confidence",
    label: "Gene rating",
    sortable: true,
    renderCell: ({ confidence }) => (
      <Tooltip
        title={
          <Typography variant="caption" display="block" align="center">
            As defined by the{" "}
            <Link external to="https://panelapp.genomicsengland.co.uk/#!Guidelines">
              Panel App Guidelines
            </Link>
          </Typography>
        }
        showHelpIcon
      >
        {confidenceCaption(confidence)}
      </Tooltip>
    ),
    comparator: (a, b) => confidenceMap(a.confidence) - confidenceMap(b.confidence),
  },
  {
    id: "literature",
    renderCell: ({ literature }) => {
      const literatureList =
        literature?.reduce((acc, id) => {
          if (id === "NA") return acc;

          return [
            ...acc,
            {
              name: id,
              url: epmcUrl(id),
              group: "literature",
            },
          ];
        }, []) || [];

      return (
        <PublicationsDrawer symbol={label.symbol} name={label.name} entries={literatureList} />
      );
    },
  },
];

type Props = EvidenceBodyProps;
export function Body({ id, label, entity }: Props) {
  const { ensgId, efoId } = id;
  const variables = {
    ensemblId: ensgId,
    efoId,
    size: sectionsBaseSizeQuery,
  };

  const request = useQuery(GENOMICS_ENGLAND_QUERY, {
    variables,
  });

  const columns = getColumns(label);

  return (
    <SectionItem
      definition={definition}
      chipText={dataTypesMap.genetic_association}
      request={request}
      entity={entity}
      renderDescription={() => <Description symbol={label.symbol} name={label.name} />}
      renderBody={() => (
        <OtTable
          columns={columns}
          dataDownloader
          dataDownloaderFileStem={`GEL-PanelApp-${ensgId}-${efoId}`}
          order="desc"
          rows={request.data?.disease.genomicsEngland.rows}
          showGlobalFilter
          sortBy="confidence"
          query={GENOMICS_ENGLAND_QUERY.loc.source.body}
          variables={variables}
          loading={request.loading}
        />
      )}
    />
  );
}

export default Body;
