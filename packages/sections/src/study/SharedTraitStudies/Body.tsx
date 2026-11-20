import { useQuery } from "@apollo/client";
import {
  type DiseaseStudiesSearch,
  DiseaseStudiesSearchField,
  type DiseaseStudiesSort,
  DiseaseStudiesSortField,
  type DiseaseStudy,
  naLabel,
  SortDirection,
} from "@ot/constants";
import { epmcUrl, getStudyCategory } from "@ot/utils";
import { Fragment, type ReactElement } from "react";
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
import SHARED_TRAIT_STUDIES_QUERY_DOCUMENT from "./SharedTraitStudiesQuery.gql";

type StudyRow = Pick<
  DiseaseStudy,
  | "id"
  | "traitFromSource"
  | "projectId"
  | "diseaseIds"
  | "diseaseNames"
  | "publicationFirstAuthor"
  | "publicationDate"
  | "nSamples"
  | "cohorts"
  | "ldPopulationStructure"
  | "pubmedId"
>;

type QueryData = {
  sharedTraitStudies: { studiesView: { count: number; rows: StudyRow[] } };
};

type QueryVariables = {
  studyId: string;
  diseaseIds: string[];
  index: number;
  size: number;
  sort: DiseaseStudiesSort[];
  search: DiseaseStudiesSearch;
};

const SHARED_TRAIT_STUDIES_QUERY = typedDocument<QueryData, QueryVariables>(
  SHARED_TRAIT_STUDIES_QUERY_DOCUMENT
);

const PAGE_SIZE = 10;
const DEFAULT_SORT = {
  id: "nSamples",
  field: DiseaseStudiesSortField.NSamples,
  desc: true,
};

function getColumns(diseaseIds: string[]): OtTableColumn<StudyRow>[] {
  const diseaseIdsSet = new Set(diseaseIds);
  const getSharedTraits = (row: StudyRow) =>
    row.diseaseIds.flatMap((id, index) =>
      diseaseIdsSet.has(id) ? [{ id, name: row.diseaseNames[index] || id }] : []
    );
  return [
    {
      id: "studyId",
      label: "Study",
      enableHiding: false,
      // Attach all fields to the first column for global server search.
      searchFields: [
        DiseaseStudiesSearchField.StudyId,
        DiseaseStudiesSearchField.TraitFromSource,
        DiseaseStudiesSearchField.PublicationFirstAuthor
      ],
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
      renderCell: (row) => {
        const sharedTraits = getSharedTraits(row);
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
      exportValue: (row) =>
        getSharedTraits(row)
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
      renderCell: ({ publicationFirstAuthor, publicationDate, pubmedId }) => {
        if (!publicationFirstAuthor) return naLabel;
        const year = publicationDate ? new Date(publicationDate).getFullYear() : NaN;
        const label = `${publicationFirstAuthor} et al.${Number.isFinite(year) ? ` (${year})` : ""}`;
        return pubmedId ? (
          <PublicationsDrawer
            entries={[{ name: pubmedId, url: epmcUrl(pubmedId) }]}
            customLabel={label}
          />
        ) : (
          label
        );
      },
      exportValue: ({ pubmedId }) => pubmedId ?? "",
    },
  ];
}

type BodyProps = {
  studyId: string;
  diseaseIds: string[];
};

export function Body({ studyId, diseaseIds }: BodyProps): ReactElement {
  const variables = { studyId, diseaseIds };
  const columns = getColumns(diseaseIds);
  const request = useQuery(SHARED_TRAIT_STUDIES_QUERY, {
    variables: {
      ...variables,
      index: 0,
      size: PAGE_SIZE,
      sort: [
        {
          key: DEFAULT_SORT.field,
          direction: DEFAULT_SORT.desc ? SortDirection.Descending : SortDirection.Ascending,
        },
      ],
      search: {
        text: "",
        fields: columns.flatMap(
          (column) => column.searchFields ?? []
        ) as DiseaseStudiesSearchField[],
      },
    },
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
          <OtTableServer<StudyRow>
            columns={columns}
            dataPath="sharedTraitStudies.studiesView"
            pageSize={PAGE_SIZE}
            sortBy={DEFAULT_SORT.id}
            order={DEFAULT_SORT.desc ? "desc" : "asc"}
            dataDownloader
            dataDownloaderFileStem={`${studyId}-shared-trait-studies`}
            query={SHARED_TRAIT_STUDIES_QUERY}
            variables={variables}
            globalFilterPlaceholderText="Search studies, traits or authors..."
          />
        );
      }}
    />
  );
}

export default Body;
