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
import { type DrugBodyProps } from "@ot/constants";
import { definition } from ".";
import IndicationsTable, { INDICATIONS_PAGE_SIZE } from "./IndicationsTable";

type Props = DrugBodyProps;

function Body({ id: chemblId, label: name, entity }: Props) {
  // first page only: drives the section loading/error state, the table fetches
  // the same page from the Apollo cache and then paginates on its own
  const request = useQuery(INDICATIONS_QUERY, {
    variables: { chemblId, index: 0, size: INDICATIONS_PAGE_SIZE },
  });

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

  const count = request.data?.drug?.indications?.count ?? 0;

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
                <IndicationsTable
                  chemblId={chemblId}
                  selectedRow={selectedRow}
                  selectRow={selectRow}
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
