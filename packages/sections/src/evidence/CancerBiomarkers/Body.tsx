import { useQuery } from "@apollo/client";
import { Typography } from "@mui/material";
import { Link, Tooltip, SectionItem, PublicationsDrawer, OtTable, TableDrawer } from "ui";

import { defaultRowsPerPageOptions, sectionsBaseSizeQuery, naLabel, EvidenceBodyProps} from "@ot/constants";
import { epmcUrl } from "@ot/utils";
import Description from "./Description";
import BiomarkersDrawer from "./BiomarkersDrawer";
import { definition } from ".";

import CANCER_BIOMARKERS_EVIDENCE_QUERY from "./CancerBiomarkersEvidence.gql";

const getColumns = label => [
  {
    id: "disease",
    label: "Disease",
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
    id: "biomarkerName",
    label: "Biomarker",
    enableHiding: false,
    renderCell: ({ biomarkerName, biomarkers }) => (
      <BiomarkersDrawer biomarkerName={biomarkerName} biomarkers={biomarkers} />
    ),
  },
  {
    id: "drug",
    label: "Reported drug",
    renderCell: ({ drug, drugFromSource }) =>
      drug ? <Link to={`/drug/${drug.id}`}>{drug.name}</Link> : drugFromSource,
    filterValue: ({ drug, drugFromSource }) => (drug ? drug.name : drugFromSource),
  },
  {
    id: "drugResponse",
    label: "Drug response",
    renderCell: ({ drugResponse }) =>
      (drugResponse && <Link to={`/disease/${drugResponse.id}`}>{drugResponse.name}</Link>) ||
      naLabel,
  },
  {
    id: "confidence",
    label: "Source",
    renderCell: ({ confidence, urls }) => {
      const entries = urls
        ? urls.map(url => ({
            url: url.url,
            name: url.niceName,
            group: "Sources",
          }))
        : [];
      return <TableDrawer entries={entries} message={confidence} />;
    },
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

function Body({ id, label, entity }: Props) {
  const { ensgId, efoId } = id;

  const variables = {
    ensemblId: ensgId,
    efoId,
    size: sectionsBaseSizeQuery,
  };

  const request = useQuery(CANCER_BIOMARKERS_EVIDENCE_QUERY, {
    variables,
  });

  const columns = getColumns(label);

  return (
    <SectionItem
      definition={definition}
      chipText={definition.dataType}
      request={request}
      entity={entity}
      renderDescription={() => <Description symbol={label.symbol} diseaseName={label.name} />}
      renderBody={() => {
        return (
          <OtTable
            columns={columns}
            rows={request.data?.disease.cancerBiomarkersSummary.rows}
            dataDownloader
            dataDownloaderFileStem={`cancer-biomarker-${ensgId}-${efoId}`}
            showGlobalFilter
            rowsPerPageOptions={defaultRowsPerPageOptions}
            query={CANCER_BIOMARKERS_EVIDENCE_QUERY.loc.source.body}
            variables={variables}
            loading={request.loading}
          />
        );
      }}
    />
  );
}

export default Body;
