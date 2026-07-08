import { useQuery } from "@apollo/client";
import {
  SectionItem,
  useClinicalReportsMasterDetail,
  RecordsCards,
  ClinicalReportsMasterDetailFrame,
} from "ui";
import { useCallback } from "react";
import Description from "./Description";
import INDICATIONS_QUERY from "./IndicationsQuery.gql";
import { DrugBodyProps } from "@ot/constants";
import { definition } from ".";
import IndicationsTable from "./IndicationsTable";

type Props = DrugBodyProps;

function Body({ id: chemblId, label: name, entity }: Props) {
  const variables = { chemblId };
  const request = useQuery(INDICATIONS_QUERY, { variables });

  const getClinicalReportsIds = useCallback(
    (row: any) => row?.clinicalReports?.map((report: any) => report.id),
    []
  );

  const getMaxClinicalStage = useCallback((row: any) => row?.maxClinicalStage, []);

  const getSelectedEntity = useCallback(
    (row: any) => {
      const id = row?.disease?.id;
      const selectedName = row?.disease?.name;
      if (!id || !selectedName) return null;
      return { entityType: "disease", id, name: selectedName };
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

  const rows = request.data?.drug.indications.rows;

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
                <IndicationsTable
                  chemblId={chemblId}
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