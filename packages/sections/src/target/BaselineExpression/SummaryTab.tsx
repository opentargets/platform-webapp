import { Alert, AlertTitle, Grid, Typography } from "@mui/material";
import { DataDownloader } from "ui";
import BaselineExpressionTable from "./BaselineExpressionTable";
import EXPRESSION_QUERY from "./ExpressionQuery.gql";
import { processData } from "./processData";

export function getData(ensgId, client) {
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

const getDownloadRows = (baselineExpressions) =>
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

function SummaryTab({ symbol, ensgId, data, viewMode, expandSpecificity }) {
  if (!data) return null;

  const datatypes = ["scrna-seq", "bulk rna-seq", "mass-spectrometry proteomics"];
  const processedData = {
    tissue: processData(data.target.baselineExpression.rows, datatypes, true),
    celltype: processData(data.target.baselineExpression.rows, datatypes, false),
  };

  return (
    <Grid container justifyContent="center">
      <BaselineExpressionTable
        symbol={symbol}
        data={processedData}
        datatypes={datatypes}
        specificityThreshold={0.75}
        DownloaderComponent={
          <DataDownloader
            btnLabel="Export"
            fileStem={`${symbol}-baseline-expression`}
            rows={getDownloadRows(data.target.baselineExpression.rows)}
            query={EXPRESSION_QUERY.loc.source.body}
            variables={{ ensemblId: ensgId }}
            columns={columns}
          />
        }
        viewMode={viewMode}
        expandSpecificity={expandSpecificity}
      />
    </Grid>
  );
}

export default SummaryTab;
