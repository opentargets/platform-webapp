import type { ApolloClient } from "@apollo/client";
import type { TargetExpressionQuery, TargetExpressionQueryVariables } from "@ot/constants";
import { DataDownloader, GridLegacy } from "ui";
import { typedDocument } from "../../utils/typedDocument";
import BaselineExpressionTable from "./BaselineExpressionTable";
import EXPRESSION_QUERY_DOCUMENT from "./ExpressionQuery.gql";
import { processData } from "./processData";

// the heatmap needs every biosample, so the query asks for one large page
const EXPRESSION_QUERY = typedDocument<TargetExpressionQuery, TargetExpressionQueryVariables>(
  EXPRESSION_QUERY_DOCUMENT
);

export function getData(ensgId: string, client: ApolloClient<object>) {
  return client.query({
    query: EXPRESSION_QUERY,
    variables: { ensemblId: ensgId },
  });
}

const columns = [
  { id: "tissueBiosampleName" },
  { id: "tissueBiosampleId" },
  { id: "tissueBiosampleFromSource" },
  { id: "celltypeBiosampleName" },
  { id: "celltypeBiosampleId" },
  { id: "celltypeBiosampleFromSource" },
  { id: "median" },
  { id: "unit" },
  { id: "datasourceId" },
  { id: "datatypeId" },
  { id: "specificityScore" },
  { id: "distributionScore" },
];

type ExpressionRow = NonNullable<
  TargetExpressionQuery["target"]
>["baselineExpression"]["rows"][number];

type SummaryTabProps = {
  symbol: string;
  ensgId: string;
  data?: TargetExpressionQuery;
  viewMode?: "tissue" | "celltype";
  expandSpecificity?: boolean;
};

const getDownloadRows = (baselineExpressions: ExpressionRow[]) =>
  baselineExpressions.map((expression) => ({
    tissueBiosampleName: expression.tissueBiosample?.biosampleName ?? null,
    tissueBiosampleId: expression.tissueBiosample?.biosampleId ?? null,
    tissueBiosampleFromSource: expression.tissueBiosampleFromSource ?? null,
    celltypeBiosampleName: expression.celltypeBiosample?.biosampleName ?? null,
    celltypeBiosampleId: expression.celltypeBiosample?.biosampleId ?? null,
    celltypeBiosampleFromSource: expression.celltypeBiosampleFromSource ?? null,
    median: expression.median ?? null,
    unit: expression.unit,
    datasourceId: expression.datasourceId,
    datatypeId: expression.datatypeId,
    specificityScore: expression.specificity_score ?? null,
    distributionScore: expression.distribution_score,
  }));

function SummaryTab({ symbol, ensgId, data, viewMode, expandSpecificity }: SummaryTabProps) {
  if (!data) return null;
  const rows = data.target?.baselineExpression.rows ?? [];

  const datatypes = ["scrna-seq", "bulk rna-seq", "mass-spectrometry proteomics"];
  const processedData = {
    tissue: processData(rows, datatypes, true),
    celltype: processData(rows, datatypes, false),
  };

  return (
    <GridLegacy container justifyContent="center">
      <BaselineExpressionTable
        symbol={symbol}
        data={processedData}
        datatypes={datatypes}
        specificityThreshold={0.75}
        DownloaderComponent={
          <DataDownloader
            btnLabel="Export"
            fileStem={`${symbol}-baseline-expression`}
            rows={getDownloadRows(rows)}
            query={EXPRESSION_QUERY_DOCUMENT.loc?.source.body}
            variables={{ ensemblId: ensgId }}
            columns={columns}
          />
        }
        viewMode={viewMode ?? "tissue"}
        expandSpecificity={expandSpecificity ?? false}
      />
    </GridLegacy>
  );
}

export default SummaryTab;
