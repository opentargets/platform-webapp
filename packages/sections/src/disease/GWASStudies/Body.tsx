import { useQuery } from "@apollo/client";
import type { SortingState } from "@tanstack/react-table";
import { ReactElement } from "react";
import {
  Link,
  SectionItem,
  Tooltip,
  PublicationsDrawer,
  OtTableServer,
  Box,
  Typography,
  type OtTableColumn,
} from "ui";
import {
  naLabel,
  SortDirection,
  StudySortField,
  type GwasStudiesQuery,
  type GwasStudiesQueryVariables,
  type StudySort,
} from "@ot/constants";
import { epmcUrl, getStudyCategory } from "@ot/utils";
import Description from "./Description";

import GWAS_STUDIES_BODY_QUERY_DOCUMENT from "./GWASStudiesQuery.gql";
import { definition } from ".";
import { typedDocument } from "../../utils/typedDocument";

const GWAS_STUDIES_BODY_QUERY = typedDocument<GwasStudiesQuery, GwasStudiesQueryVariables>(
  GWAS_STUDIES_BODY_QUERY_DOCUMENT
);

type StudyRow = GwasStudiesQuery["studies"]["rows"][number];

const columns: OtTableColumn<StudyRow>[] = [
  {
    id: "id",
    label: "Study",
    enableHiding: false,
    renderCell: ({ id }) => (
      <Link asyncTooltip to={`/study/${id}`}>
        {id}
      </Link>
    ),
  },
  {
    id: "traitFromSource",
    label: "Reported trait",
    sortable: true,
  },
  {
    id: "nSamples",
    label: "Sample size",
    renderCell: ({ nSamples }) => {
      return typeof nSamples === "number" ? nSamples.toLocaleString() : naLabel;
    },
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
    sortable: true,
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
    filterValue: ({ publicationDate, publicationFirstAuthor }) =>
      `${publicationDate ?? ""} ${publicationFirstAuthor ?? ""}`,
    exportValue: ({ pubmedId }) => pubmedId ?? "",
  },
  {
    id: "credibleSets",
    label: "Credible sets count",
    renderCell: ({ credibleSets }) => {
      return credibleSets?.count ?? naLabel;
    },
  },
];

// column id -> StudySortField of the API; columns not listed here are not sortable
const SORT_FIELDS: Record<string, StudySortField | undefined> = {
  traitFromSource: StudySortField.TraitFromSource,
  nSamples: StudySortField.NSamples,
  publication: StudySortField.PublicationAuthorDate,
};

const DEFAULT_SORTING: SortingState = [{ id: "nSamples", desc: true }];

export function getStudySortVariables(sorting: SortingState): { sort: StudySort[] } {
  const sort = sorting.flatMap(({ id, desc }) => {
    const key = SORT_FIELDS[id];
    return key ? [{ key, direction: desc ? SortDirection.Descending : SortDirection.Ascending }] : [];
  });
  return { sort };
}

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
    variables: { ...variables, index: 0, size: PAGE_SIZE, ...getStudySortVariables(DEFAULT_SORTING) },
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
          dataPath="studies"
          pageSize={PAGE_SIZE}
          sortBy={DEFAULT_SORTING[0].id}
          order="desc"
          getSortVariables={getStudySortVariables}
          searchVariable="search"
          globalFilterPlaceholderText="Search studies..."
          dataDownloader
          dataDownloaderFileStem={`${efoId}-gwas-studies`}
        />
      )}
    />
  );
}

export default Body;
