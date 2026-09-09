import { useQuery } from "@apollo/client";
import {
  Link,
  Tooltip,
  SectionItem,
  PublicationsDrawer,
  ClinvarStars,
  OtTable,
  Typography,
} from "ui";
import { clinvarStarMap, naLabel } from "@ot/constants";
import { definition } from ".";

import Description from "./Description";
import { epmcUrl, sentenceCase } from "@ot/utils";
import EVA_QUERY from "./EVAQuery.gql";

const columns = [
  {
    id: "disease.name",
    label: "Disease/phenotype",
    renderCell: ({ disease, diseaseFromSource, cohortPhenotypes }) => {
      let displayElement = (
        <Link asyncTooltip to={`/disease/${disease.id}`}>
          {disease.name}
        </Link>
      );
      if (diseaseFromSource || cohortPhenotypes?.length > 0) {
        displayElement = (
          <Tooltip
            title={
              <>
                {diseaseFromSource && (
                  <>
                    <Typography variant="subtitle2" display="block" align="center">
                      Reported disease or phenotype:
                    </Typography>
                    <Typography variant="caption" display="block" align="center" gutterBottom>
                      {diseaseFromSource}
                    </Typography>
                  </>
                )}
                {cohortPhenotypes?.length > (diseaseFromSource ? 1 : 0) && (
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
                )}
              </>
            }
            showHelpIcon
          >
            {displayElement}
          </Tooltip>
        );
      }
      return displayElement;
    },
    exportValue: ({ disease }) => disease.name,
    filterValue: ({ disease }) => disease.name,
  },
  {
    id: "studyId",
    label: "ClinVar ID",
    enableHiding: false,
    renderCell: ({ studyId }) => {
      if (!studyId) return naLabel;
      return (
        <Link external to={`https://www.ncbi.nlm.nih.gov/clinvar/${studyId}`}>
          {studyId}
        </Link>
      );
    },
  },
  {
    id: "clinicalSignificances",
    label: "Clinical significance",
    renderCell: ({ clinicalSignificances }) => {
      if (!clinicalSignificances || clinicalSignificances.length === 0) {
        return naLabel;
      }
      if (clinicalSignificances.length === 1) {
        return sentenceCase(clinicalSignificances[0]);
      }
      return clinicalSignificances.map(clinicalSignificance => (
        <div key={clinicalSignificance}>{sentenceCase(clinicalSignificance)}</div>
      ));
    },
    filterValue: ({ clinicalSignificances }) => {
      return clinicalSignificances?.join(" ") || "";
    },
  },
  {
    id: "allelicRequirements",
    label: "Allele origin",
    renderCell: ({ alleleOrigins, allelicRequirements }) => {
      if (!alleleOrigins || alleleOrigins.length === 0) return naLabel;
      let displayElement = alleleOrigins.map(a => sentenceCase(a)).join("; ");
      if (allelicRequirements) {
        displayElement = (
          <Tooltip
            title={
              <>
                <Typography variant="subtitle2" display="block" align="center">
                  Allelic requirements:
                </Typography>
                {allelicRequirements.map(r => (
                  <Typography key={r} variant="caption" display="block">
                    {r}
                  </Typography>
                ))}
              </>
            }
            showHelpIcon
          >
            {displayElement}
          </Tooltip>
        );
      }
      return displayElement;
    },
    filterValue: ({ alleleOrigins }) => alleleOrigins?.join(" ") || "",
  },
  {
    id: "reviewStatus",
    label: "Review status",
    renderCell: ({ confidence }) => {
      if (!confidence) return naLabel;
      return (
        <Tooltip title={confidence}>
          <ClinvarStars num={clinvarStarMap[confidence]} />
        </Tooltip>
      );
    },
  },
  {
    id: "literature",
    label: "Literature",
    renderCell: ({ literature }) => {
      const literatureList =
        literature?.reduce((acc, id) => {
          if (id !== "NA") {
            acc.push({
              name: id,
              url: epmcUrl(id),
              group: "literature",
            });
          }
          return acc;
        }, []) || [];
      return <PublicationsDrawer entries={literatureList} />;
    },
  },
];

type BodyProps = {
  id: string;
  entity: string;
};

function Body({ id, entity }: BodyProps) {
  const variables = {
    variantId: id,
  };

  const request = useQuery(EVA_QUERY, {
    variables,
  });

  return (
    <SectionItem
      definition={definition}
      entity={entity}
      request={request}
      renderDescription={() => (
        <Description
          variantId={request.data?.variant.id}
          referenceAllele={request.data?.variant.referenceAllele}
          alternateAllele={request.data?.variant.alternateAllele}
        />
      )}
      renderBody={() => (
        <OtTable
          dataDownloader
          dataDownloaderFileStem={`${id}-clinvar-variant`}
          showGlobalFilter
          columns={columns}
          loading={request.loading}
          rows={request.data?.variant.evaEvidences.rows}
          query={EVA_QUERY.loc.source.body}
          variables={variables}
        />
      )}
    />
  );
}

export default Body;
