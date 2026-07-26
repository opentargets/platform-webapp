import { ReactElement } from "react";
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
import { naLabel, table5HChunkSize } from "@ot/constants";
import { epmcUrl, getStudyCategory } from "@ot/utils";
import Description from "./Description";

import GWAS_STUDIES_BODY_QUERY from "./GWASStudiesQuery.gql";
import { definition } from ".";

const columns = [
  {
    id: "id",
    label: "Study",
    enableHiding: false,
    renderCell: ({ id }: { id: string }) => (
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
    renderCell: ({ nSamples }: { nSamples: number }) => {
      return typeof nSamples === "number" ? nSamples.toLocaleString() : naLabel;
    },
    comparator: (a, b) => a?.nSamples - b?.nSamples,
    sortable: true,
  },
  {
    id: "cohorts",
    label: "Cohorts",
    renderCell: ({ projectId, cohorts, ldPopulationStructure }: { projectId: string; cohorts: string[]; ldPopulationStructure: { ldPopulation: string; relativeSampleSize: number }[] }) => {
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
    exportValue: ({ projectId, cohorts }: { projectId: string; cohorts: string[] }) =>
      getStudyCategory(projectId) === "FINNGEN"
        ? "FinnGen"
        : cohorts?.length
        ? cohorts.join(", ")
        : null,
  },
  {
    id: "publication",
    label: "Publication",
    renderCell: ({ publicationFirstAuthor, publicationDate, pubmedId, projectId }: { publicationFirstAuthor: string; publicationDate: string; pubmedId: string; projectId: string } ) => {
      if (!publicationFirstAuthor) return naLabel;
      return (
        <PublicationsDrawer
          entries={[{ name: pubmedId, url: epmcUrl(pubmedId) }]}
          customLabel={`${
            getStudyCategory(projectId) === "FINNGEN"
              ? "FinnGen"
              : publicationFirstAuthor || naLabel
          } et al. (${new Date(publicationDate).getFullYear()})`}
        />
      );
    },
    filterValue: ({ publicationYear, publicationFirstAuthor }: { publicationYear: string; publicationFirstAuthor: string }) =>
      `${publicationYear} ${publicationFirstAuthor}`,
    exportValue: ({ pubmedId }: { pubmedId: string }) => `${pubmedId}`,
  },
  {
    id: "credibleSets",
    label: "Credible sets count",
    renderCell: ({ credibleSets }: { credibleSets: { count: number } }) => {
      return credibleSets?.count ?? naLabel;
    },
    comparator: (a, b) => (a?.credibleSets?.count ?? 0) - (b?.credibleSets?.count ?? 0),
    sortable: true,
  },
];

type BodyProps = {
  id: string;
  label: string;
};

function Body({ id: efoId, label: diseaseName }: BodyProps): ReactElement {
  const variables = {
    diseaseIds: [efoId],
    size: table5HChunkSize,
    index: 0,
  };

  const request = useBatchQuery({
    query: GWAS_STUDIES_BODY_QUERY,
    variables,
    dataPath: "studies",
    size: table5HChunkSize,
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
        <OtTable
          columns={columns}
          rows={request.data?.studies.rows}
          sortBy="nSamples"
          order="desc"
          dataDownloader
          dataDownloaderFileStem={`${efoId}-gwas-studies`}
          loading={request.loading}
          query={GWAS_STUDIES_BODY_QUERY.loc.source.body}
          variables={variables}
        />
      )}
    />
  );
}

export default Body;
