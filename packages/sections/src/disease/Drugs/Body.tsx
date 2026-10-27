import { useQuery } from "@apollo/client";
import type { DiseaseBodyProps } from "@ot/constants";
import { useCallback } from "react";
import {
  ClinicalReportsMasterDetailFrame,
  RecordsCards,
  SectionItem,
  useClinicalReportsMasterDetail,
} from "ui";
import { definition } from ".";
import Description from "./Description";
import DrugsTable, { DRUGS_PAGE_SIZE, DRUGS_QUERY, type DrugRow } from "./DrugsTable";

type Props = DiseaseBodyProps;

function Body({ id: efoId, label: name, entity }: Props) {
  // first page only: drives the section loading/error state, the table fetches
  // the same page from the Apollo cache and then paginates on its own
  const request = useQuery(DRUGS_QUERY, {
    variables: { efoId, index: 0, size: DRUGS_PAGE_SIZE },
  });

  const getClinicalReportsIds = useCallback(
    (row: DrugRow) => row?.clinicalReports?.map((report) => report.id),
    []
  );

  const getMaxClinicalStage = useCallback((row: DrugRow) => row?.maxClinicalStage, []);

  const getSelectedEntity = useCallback((row: DrugRow) => {
    const id = row?.drug?.id;
    const selectedName = row?.drug?.name;
    if (!id || !selectedName) return null;
    return { entityType: "drug", id, name: selectedName };
  }, []);

  const {
    selectedRow,
    selectRow,
    selectedEntity,
    recordsByStage,
    maxClinicalStage,
    loadingRecords,
  } = useClinicalReportsMasterDetail<DrugRow>({
    getClinicalReportsIds,
    getMaxClinicalStage,
    getSelectedEntity,
  });

  const count = request.data?.disease?.drugAndClinicalCandidates?.count ?? 0;

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
              count > 0 && (
                <DrugsTable efoId={efoId} selectedRow={selectedRow} selectRow={selectRow} />
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
