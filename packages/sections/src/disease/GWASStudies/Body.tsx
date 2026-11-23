import { useQuery } from "@apollo/client";
import {
  DiseaseStudiesSearchField,
  DiseaseStudiesSortField,
  type GwasStudiesQuery,
  type GwasStudiesQueryVariables,
  naLabel,
  SortDirection,
} from "@ot/constants";
import { epmcUrl, getStudyCategory } from "@ot/utils";
import type { ReactElement } from "react";
import {
  Box,
  Link,
  type OtTableColumn,
  OtTableServer,
  PublicationsDrawer,
  SectionItem,
  Tooltip,
  Typography,
} from "ui";
import { typedDocument } from "../../utils/typedDocument";
import { definition } from ".";
import Description from "./Description";
import GWAS_STUDIES_BODY_QUERY_DOCUMENT from "./GWASStudiesQuery.gql";

const GWAS_STUDIES_BODY_QUERY = typedDocument<GwasStudiesQuery, GwasStudiesQueryVariables>(
  GWAS_STUDIES_BODY_QUERY_DOCUMENT
);

type StudyRow = GwasStudiesQuery["studies"]["studiesView"]["rows"][number];

const DEFAULT_SORT = {
  id: "nSamples",
  field: DiseaseStudiesSortField.NSamples,
};

const columns: OtTableColumn<StudyRow>[] = [
  {
    id: "id",
    label: "Study",
    enableHiding: false,
    // For now, attach all search fields to the first column.
    searchFields: Object.values(DiseaseStudiesSearchField),
    renderCell: ({ id }) => (
      <Link asyncTooltip to={`/study/${id}`}>
        {id}
      </Link>
    ),
  },
  {
    id: "traitFromSource",
    label: "Reported trait",
  },
  {
    id: "nSamples",
    label: "Sample size",
    renderCell: ({ nSamples }) => {
      return typeof nSamples === "number" ? nSamples.toLocaleString() : naLabel;
    },
    sortField: DEFAULT_SORT.field,
  },
  {
    id: "cohorts",
    label: "Cohorts",
    renderCell: ({ projectId, cohorts, ldPopulationStructure }) => {
      let displayText: string;
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
    sortField: DiseaseStudiesSortField.PublicationDate,
    renderCell: ({ publicationFirstAuthor, publicationDate, pubmedId, projectId }) => {
      if (!publicationFirstAuthor) return naLabel;
      const year = publicationDate ? new Date(publicationDate).getFullYear() : naLabel;
      return (
        <PublicationsDrawer
          entries={pubmedId ? [{ name: pubmedId, url: epmcUrl(pubmedId) }] : []}
          customLabel={`${
            getStudyCategory(projectId) === "FINNGEN" ? "FinnGen" : publicationFirstAuthor
          } et al. (${year})`}
        />
      );
    },
    exportValue: ({ pubmedId }) => pubmedId ?? "",
  },
  {
    id: "credibleSetsCount",
    label: "Credible sets count",
    renderCell: ({ credibleSetsCount }) => credibleSetsCount ?? naLabel,
  },
];

const PAGE_SIZE = 10;

type BodyProps = {
  id: string;
  label: string;
};

function Body({ id: efoId, label: diseaseName }: BodyProps): ReactElement {
  const variables = { diseaseIds: [efoId] };

  // first page only: drives the section loading/error state, the table fetches
  // the same page from the Apollo cache and then paginates on its own
  const request = useQuery(GWAS_STUDIES_BODY_QUERY, {
    variables: {
      ...variables,
      index: 0,
      size: PAGE_SIZE,
      sort: [{ key: DEFAULT_SORT.field, direction: SortDirection.Descending }],
    },
  });

  return (
    <SectionItem
      definition={definition}
      entity="studies"
      showContentLoading
      loadingMessage="Loading data. This may take some time..."
      request={request}
      renderDescription={() => <Description name={diseaseName} />}
      renderBody={() => (
        <OtTableServer<StudyRow>
          columns={columns}
          query={GWAS_STUDIES_BODY_QUERY}
          variables={variables}
          dataPath="studies.studiesView"
          pageSize={PAGE_SIZE}
          sortBy={DEFAULT_SORT.id}
          order="desc"
          globalFilterPlaceholderText="Search studies..."
          dataDownloader
          dataDownloaderFileStem={`${efoId}-gwas-studies`}
        />
      )}
    />
  );
}

export default Body;
