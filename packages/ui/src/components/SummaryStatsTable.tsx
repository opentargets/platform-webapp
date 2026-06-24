import { Typography } from "@mui/material";
import { v1 } from "uuid";
import { Tooltip } from "ui";

const dicSummary = [
  { id: "n_variants", label: "Total variants", tooltip: "Number of harmonised variants" },
  { id: "n_variants_sig", label: "Significant variants", tooltip: "P-value significant variants" },
  { id: "mean_beta", label: "Mean beta", tooltip: "Mean effect size across all variants" },
  {
    id: "gc_lambda",
    label: "GC lambda",
    tooltip: "Additive Genomic Control (GC) lambda indicating GWAS inflation",
  },
  {
    id: "mean_diff_pz",
    label: "Mean diff P-Z",
    tooltip: "Mean difference between reported and calculated log p-values",
  },
  {
    id: "se_diff_pz",
    label: "SD diff P-Z",
    tooltip: "Standard deviation of the difference between reported and calculated log p-values",
  },
  {
    id: "h2",
    label: "SNP heritability",
    tooltip: "LDSC-estimated SNP-based heritability (liability scale for case/control traits)",
  },
  {
    id: "h2_se",
    label: "SNP heritability SE",
    tooltip: "Standard error of the LDSC SNP-heritability estimate",
  },
  {
    id: "intercept",
    label: "LDSC intercept",
    tooltip:
      "LDSC regression intercept; values above 1 indicate inflation from confounding (e.g. population stratification) rather than polygenic signal",
  },
  {
    id: "intercept_se",
    label: "LDSC intercept SE",
    tooltip: "Standard error of the LDSC regression intercept",
  },
  {
    id: "mean_chisq",
    label: "Mean chi-squared",
    tooltip:
      "Mean chi-squared statistic across variants used in LDSC; values above 1 reflect a mix of true polygenic signal and confounding",
  },
  {
    id: "lambda_gc",
    label: "GC lambda (LDSC)",
    tooltip:
      "Genomic control lambda computed from the LDSC-filtered variant set used for heritability estimation",
  },
];

function formatValue(v: number) {
  return Number.isInteger(v) ? v.toLocaleString() : v.toPrecision(3);
}

export default function SummaryStatsTable({ sumstatQCValues }: any) {
  return (
    <>
      <Typography sx={{ fontSize: 16, fontWeight: 600, my: 1 }} variant="subtitle2">
        Harmonised summary statistics
      </Typography>
      <table>
        <tbody>
          {sumstatQCValues.map(({ QCCheckName, QCCheckValue }) => {
            const sumstat = dicSummary.find(({ id }) => id === QCCheckName );
            if (!sumstat) return null;
            return (
              <tr key={v1()}>
                <td>
                  <Tooltip title={sumstat.tooltip} showHelpIcon>
                    {sumstat.label}
                  </Tooltip>
                </td>
                <Typography sx={{ textAlign: "right" }} component="td" variant="body2">
                  {formatValue(QCCheckValue)}
                </Typography>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
