import { useEffect, useState } from "react";
import { autoType, csv } from "d3";
import { faCircleNodes, faShareNodes, faHexagonNodes, faPrescriptionBottleMedical, faMapPin, faChartBar } from "@fortawesome/free-solid-svg-icons";
import { Paper, Typography, Box } from "@mui/material";
import metricsCsv from "./metrics.csv?url";
import MetricsCards, { PlatformMetricsSummary } from "./MetricsCards";
import HierarchicalAssociationChart from "./HierarchicalAssociationChart";
import MetricsWidget from "./MetricsWidget";
import DrugsbyStageBubbles from "./DrugsByStageBubbles";
import ByStudyTypeHBar from "./ByStudyTypeHBar";
import VariantsByConsequenceImpact from "./VariantsByConsequenceImpact";

export type MetricRow = { dataset: string; kind: string; metric: string; group_value: string; value: number };

function MetricsPage() {
  const [data, setData] = useState<MetricRow[]>([]);

  useEffect(() => {
    csv(metricsCsv, autoType).then((d) => setData(d as unknown as MetricRow[]));
  }, []);

  return (
    <>
      <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
        Platform Metrics
      </Typography>
      <MetricsCards data={data} />

      <Box component="section" sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 6 }}>
        <MetricsWidget
          id="disease-target-associations"
          icon={faHexagonNodes}
          title="Evidence and associations"
          description="Total evidence counts and association counts"
        >
          <HierarchicalAssociationChart data={data} />
        </MetricsWidget>

        <MetricsWidget
          id="drugs"
          icon={faPrescriptionBottleMedical}
          title="Drugs"
          description="Drug and clinical reports words"
        >
          <DrugsbyStageBubbles data={data} />
        </MetricsWidget>

        <MetricsWidget
          id="studies-and-credible-sets"
          icon={faChartBar}
          title="Studies and credible sets"
          description="Studies and credible sets words"
        >
          <ByStudyTypeHBar data={data} dataset="study" title="Studies by study type" />
          <ByStudyTypeHBar
            data={data}
            dataset="credible_set"
            title="Credible sets by study type"
          />
          <ByStudyTypeHBar
            data={data}
            dataset="colocalisation"
            metric="studyTypePair"
            title="Colocalisation by type"
          />
        </MetricsWidget>

        <MetricsWidget
          id="variants"
          icon={faMapPin}
          title="Variants"
          description="Variants words"
        >
          <VariantsByConsequenceImpact data={data} />
        </MetricsWidget>
      </Box>
    </>
  );
}

export default MetricsPage;
