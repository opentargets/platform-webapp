import { Fragment, ReactElement } from "react";
import {
  Link,
  SectionItem,
  Tooltip,
  PublicationsDrawer,
  OtTable,
  useBatchQuery,
  Box,
  Typography,
} from "ui";
import { definition } from ".";
import Description from "./Description";
import { naLabel, table5HChunkSize } from "@ot/constants";
import SHARED_TRAIT_STUDIES_QUERY from "./SharedTraitStudiesQuery.gql";
import { epmcUrl, getStudyCategory } from "@ot/utils";

function getColumns(diseaseIds: string[]) {
  const diseaseIdsSet = new Set(diseaseIds);
  return [
    {
      id: "studyId",
      label: "Study",
      enableHiding: false,
      renderCell: ({ id }) => (
        <Link asyncTooltip to={`/study/${id}`}>
          {id}
        </Link>
      ),
      exportValue: ({ id }) => id,
    },
    {
      id: "sharedDiseases",
      label: "Shared disease/phenotype",
      renderCell: ({ diseases }) => {
        const sharedTraits = diseases.filter(d => diseaseIdsSet.has(d.id));
        return (
          <>
            {sharedTraits.map(({ id, name }, index) => (
              <Fragment key={id}>
                {index > 0 ? ", " : null}
                <Link asyncTooltip to={`/disease/${id}`}>
                  {name}
                </Link>
              </Fragment>
            ))}
          </>
        );
      },
      exportValue: ({ diseases }) =>
        diseases
          .filter(d => diseaseIdsSet.has(d.id))
          .map(({ name }) => name)
          .join(", "),
    },
    {
      id: "traitFromSource",
      label: "Reported trait",
    },
    {
      id: "nSamples",
      label: "Sample size",
      numeric: true,
      renderCell: ({ nSamples }) => {
        return typeof nSamples === "number" ? nSamples.toLocaleString() : naLabel;
      },
      comparator: (a, b) => a?.nSamples - b?.nSamples,
      sortable: true,
    },
    {
      id: "cohorts",
      label: "Cohorts",
      renderCell: ({ projectId, cohorts, ldPopulationStructure }) => {
        let displayText;
        if (getStudyCategory(projectId) === "FINNGEN") displayText = "FinnGen";
        else if (cohorts?.length) displayText = cohorts.join(", ");
        else return naLabel;
        return ldPopulationStructure?.length ? (
          <Tooltip
            title={
              <>
                <Typography variant="subtitle2" display="block" align="center">
                  LD populations and relative sample sizes
                </Typography>
                {ldPopulationStructure.map(({ ldPopulation, relativeSampleSize }) => (
                  <Box key={ldPopulation}>
                    <Typography variant="caption">
                      {ldPopulation}: {relativeSampleSize}
                    </Typography>
                  </Box>
                ))}
              </>
            }
            showHelpIcon
          >
            {displayText}
          </Tooltip>
        ) : (
          displayText
        );
      },
      exportValue: ({ projectId, cohorts }) =>
        getStudyCategory(projectId) === "FINNGEN"
          ? "FinnGen"
          : cohorts?.length
          ? cohorts.join(", ")
          : null,
    },
    {
      id: "publication",
      label: "Publication",
      renderCell: ({ publicationFirstAuthor, publicationDate, pubmedId }) => {
        if (!publicationFirstAuthor) return naLabel;
        return (
          <PublicationsDrawer
            entries={[{ name: pubmedId, url: epmcUrl(pubmedId) }]}
            customLabel={`${publicationFirstAuthor} et al. (${new Date(
              publicationDate
            ).getFullYear()})`}
          />
        );
      },
      filterValue: ({ publicationYear, publicationFirstAuthor }) =>
        `${publicationYear} ${publicationFirstAuthor}`,
      exportValue: ({ pubmedId }) => `${pubmedId}`,
    },
  ];
}

type BodyProps = {
  studyId: string;
  diseaseIds: string[];
};

export function Body({ studyId, diseaseIds }: BodyProps): ReactElement {
  const variables = {
    diseaseIds: diseaseIds,
    size: table5HChunkSize,
    index: 0,
  };

  const request = useBatchQuery({
    query: SHARED_TRAIT_STUDIES_QUERY,
    variables,
    dataPath: "sharedTraitStudies",
    size: table5HChunkSize,
  });

  const columns = getColumns(diseaseIds);

  const rows = request.data?.sharedTraitStudies?.rows?.filter(row => {
    return row.id !== studyId;
  });

  return (
    <SectionItem
      definition={definition}
      request={request}
      entity={"sharedTraitStudies"}
      showContentLoading
      loadingMessage="Loading data. This may take some time..."
      renderDescription={() => <Description studyId={studyId} />}
      renderBody={() => {
        return (
          <OtTable
            columns={columns}
            rows={rows}
            loading={request.loading}
            sortBy="nSamples"
            order="desc"
            dataDownloader
            dataDownloaderFileStem={`${studyId}-shared-trait-studies`}
            query={SHARED_TRAIT_STUDIES_QUERY.loc.source.body}
            variables={variables}
          />
        );
      }}
    />
  );
}

export default Body;
