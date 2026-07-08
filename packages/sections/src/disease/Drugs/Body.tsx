import { useQuery } from "@apollo/client";
import {
  SectionItem,
  useClinicalReportsMasterDetail,
  RecordsCards,
  ClinicalReportsMasterDetailFrame,
} from "ui";
import { useCallback } from "react";
import Description from "./Description";
import DRUGS_QUERY from "./DrugsQuery.gql";
import { type DiseaseBodyProps } from "@ot/constants";
import { definition } from ".";
import DrugsTable from "./DrugsTable";

type Props = DiseaseBodyProps;

function Body({ id: efoId, label: name, entity }: Props) {
  const variables = { efoId };
  const request = useQuery(DRUGS_QUERY, { variables });

  const getClinicalReportsIds = useCallback(
    row => row?.clinicalReports?.map(report => report.id),
    []
  );

  const getMaxClinicalStage = useCallback(row => row?.maxClinicalStage, []);

  const getSelectedEntity = useCallback(
    row => {
      const id = row?.drug?.id;
      const selectedName = row?.drug?.name;
      if (!id || !selectedName) return null;
      return { entityType: "drug", id, name: selectedName };
    },
    []
  );

  const {
    selectedRow,
    selectRow,
    selectedEntity,
    recordsByStage,
    maxClinicalStage,
    loadingRecords,
  } = useClinicalReportsMasterDetail({
    getClinicalReportsIds,
    getMaxClinicalStage,
    getSelectedEntity,
  });

  const rows = request.data?.disease?.drugAndClinicalCandidates?.rows;

  return (
    <SectionItem
      definition={definition}
      request={request}
      entity={entity}
      renderDescription={() => <Description name={name} />}
      renderBody={() => {
        return (
          <ClinicalReportsMasterDetailFrame
            master={
              rows?.length > 0 && (
                <DrugsTable
                  efoId={efoId}
                  rows={rows}
                  selectedRow={selectedRow}
                  selectRow={selectRow}
                  loading={request.loading}
                />
              )
            }
            detail={
              (recordsByStage || loadingRecords) && (
                <RecordsCards
                  records={recordsByStage}
                  loading={loadingRecords}
                  maxClinicalStage={maxClinicalStage}
                  selectedEntity={selectedEntity}
                />
              )
            }
          />
        );
      }}
    />
  );
}

export default Body;
