import {
  Link,
  SectionItem,
  Tooltip,
  DirectionOfEffectIcon,
  DirectionOfEffectTooltip,
  OtTable,
  ClinicalRecordDrawer,
} from "ui";
import { useQuery } from "@apollo/client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRightToBracket } from "@fortawesome/free-solid-svg-icons";
import { clinicalStageCategories, naLabel, dataTypesMap, sectionsBaseSizeQuery, type EvidenceBodyProps } from "@ot/constants";
import Description from "./Description";
import { definition } from ".";
import CLINICAL_PRECEDENCE_QUERY from "./ClinicalPrecedence.gql";
import { Box, Typography } from "@mui/material";

const exportColumns = [
  {
    label: "clinicalReportId",
    exportValue: row => row.clinicalReportId,
  },
  {
    label: "diseaseId",
    exportValue: row => row.disease.id,
  },
  {
    label: "diseaseName",
    exportValue: row => row.disease.name,
  },
  {
    label: "targetId",
    exportValue: row => row.target.id,
  },
  {
    label: "targetApprovedSymbol",
    exportValue: row => row.target.approvedSymbol,
  },
  {
    label: "drugId",
    exportValue: row => row.drug.id,
  },
  {
    label: "drugName",
    exportValue: row => row.drug.name,
  },
  {
    label: "clinicalStage",
    exportValue: row => row.clinicalStage,
  },
  {
    label: "startDate",
    exportValue: row => row.studyStartDate,
  },
];

const columns = [
  {
    id: "clinicalReportId",
    label: "Report",
    sticky: true,
    enableHiding: false,
    renderCell: ({ clinicalReportId }) => {
      if (!clinicalReportId) return naLabel;
      return (
        <Box  sx={{ display: "flex", justifyContent: "center" }}>
          <ClinicalRecordDrawer
            recordId={clinicalReportId}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2">View</Typography>
              <FontAwesomeIcon size="sm" icon={faArrowRightToBracket} />
            </Box>
          </ClinicalRecordDrawer>
        </Box>
      );
    },
  },
  {
    id: "disease.name",
    label: "Disease/phenotype",
    enableHiding: false,
    renderCell: ({ disease, cohortPhenotypes }) => {
      let displayElement = naLabel;
      if (disease)
        displayElement = (
          <Link asyncTooltip to={`/disease/${disease.id}`}>
            {disease.name}
          </Link>
        );
      if (cohortPhenotypes && cohortPhenotypes.length) {
        displayElement = (
          <Tooltip
            showHelpIcon
            title={
              <Box>
                <Typography variant="subtitle2" display="block" align="center">
                  All reported phenotypes:
                </Typography>
                {cohortPhenotypes.map(e => (
                  <div key={e}>{e}</div>
                ))}
              </Box>
            }
          >
            {displayElement}
          </Tooltip>
        );
      }
      return displayElement;
    },
  },
  {
    id: "target",
    label: "Targets",
    enableHiding: false,
    renderCell: ({ target, drug }) => {
      const mechanismsOfAction = drug.mechanismsOfAction || {};
      const { rows = [] } = mechanismsOfAction;

      let symbol = "";

      const otherTargets = rows.reduce((acc, { targets }) => {
        targets.forEach(({ id, approvedSymbol }) => {
          if (id !== target.id) {
            acc.add(id);
          } else {
            symbol = approvedSymbol;
          }
        });
        return acc;
      }, new Set());

      if (symbol === "") {
        const { approvedSymbol: targetSymbol } = target;
        symbol = targetSymbol;
      }

      return (
        <>
          <Link asyncTooltip to={`/target/${target.id}`}>{symbol}</Link>
          {otherTargets.size > 0
            ? ` and ${otherTargets.size} other target${otherTargets.size > 1 ? "s" : ""}`
            : null}
        </>
      );
    },
    filterValue: ({ target }) => target.approvedSymbol,
  },
  {
    id: "drug.name",
    label: "Drug",
    enableHiding: false,
    renderCell: ({ drug }) => <Link asyncTooltip to={`/drug/${drug.id}`}>{drug.name}</Link>,
  },
  {
    id: "directionOfVariantEffect",
    label: (
      <DirectionOfEffectTooltip docsUrl="https://platform-docs.opentargets.org/evidence#clinical-precedence"></DirectionOfEffectTooltip>
    ),
    renderCell: ({ directionOnTarget, directionOnTrait }) => {
      return (
        <Box sx={{ maxWidth: "140px" }}>
          <DirectionOfEffectIcon
            variantEffect={directionOnTarget}
            directionOnTrait={directionOnTrait}
          />
        </Box>
      );
    },
  },
  {
    id: "clinicalStage",
    label: "Stage",
    sortable: true,
    comparator: (a, b) => {
      return (clinicalStageCategories[a.clinicalStage]?.index ?? -1) -
        (clinicalStageCategories[b.clinicalStage]?.index ?? -1);
    },
    renderCell: ({ clinicalStage }) => clinicalStageCategories[clinicalStage]?.label ?? naLabel,
    filterValue: ({ clinicalStage }) => clinicalStageCategories[clinicalStage],
  },
  {
    id: "studyStartDate",
    label: "Start Date",
    numeric: true,
    comparator: (a, b) => {
      return (new Date(a.studyStartDate).getTime() || -1) -
        (new Date(b.studyStartDate).getTime() || -1);
    },
    sortable: true,
    renderCell: ({ studyStartDate }) => {
      return studyStartDate ? new Date(studyStartDate).getFullYear() : naLabel;
    },
    filterValue: ({ studyStartDate }) => {
      return studyStartDate ? new Date(studyStartDate).getFullYear() : "";
    },
  },
];

type Props = EvidenceBodyProps;

function Body({ id, label, entity }: Props) {

  const variables = {
    ensemblId: id.ensgId,
    efoId: id.efoId,
    size: sectionsBaseSizeQuery,
  };

  const request = useQuery(CLINICAL_PRECEDENCE_QUERY, {
    variables,
  });

  return (
    <SectionItem
      definition={definition}
      chipText={dataTypesMap.clinical}
      entity={entity}
      request={request}
      renderDescription={() => <Description symbol={label.symbol} name={label.name} />}
      renderBody={() => (
        <OtTable
          columns={columns}
          dataDownloader
          dataDownloaderColumns={exportColumns}
          dataDownloaderFileStem={`${id.ensgId}-${id.efoId}-clinical-precedence-evidence`}
          rows={request.data?.disease.clinical_precedence.rows}
          showGlobalFilter
          query={CLINICAL_PRECEDENCE_QUERY.loc.source.body}
          variables={variables}
          loading={request.loading}
          sortBy="clinicalStage"
          order="desc"
          // fixed={true}
        />
      )}
    />
  );
}

export default Body;