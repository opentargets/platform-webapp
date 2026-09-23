import { autoType, csvParse } from "d3";
import { faHexagonNodes, faPrescriptionBottleMedical, faMapPin, faChartBar } from "@fortawesome/free-solid-svg-icons";
import { Typography, Box, Link } from "ui";
import metricsCsv from "./metrics.csv?raw";
import MetricsCards from "./MetricsCards";
import HierarchicalAssociationChart from "./HierarchicalAssociationChart";
import MetricsWidget from "./MetricsWidget";
import DrugsByStageBubbles from "./DrugsByStageBubbles";
import ByStudyTypeHBar from "./ByStudyTypeHBar";
import VariantsByConsequenceImpact from "./VariantsByConsequenceImpact";

export type MetricRow = { dataset: string; kind: string; metric: string; group_value: string; value: number };

const data = csvParse(metricsCsv, autoType) as unknown as MetricRow[];

function MetricsPage() {
  return (
    <>
      <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
        Open Targets Platform Metrics
      </Typography>
      <MetricsCards data={data} />

      <Box component="section" sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 6 }}>
        <MetricsWidget
          id="disease-target-associations"
          icon={faHexagonNodes}
          title="Evidence and Associations"
          description={
            <Typography variant="body2">
              Target-disease{" "}
              <Link external to="https://platform-docs.opentargets.org/evidence">evidence</Link>
              {" "}and{" "}
              <Link external to="https://platform-docs.opentargets.org/associations">associations</Link>
              {" "}by data source and data type.
            </Typography>
          }
        >
          <HierarchicalAssociationChart data={data} />
        </MetricsWidget>

        <MetricsWidget
          id="drugs"
          icon={faPrescriptionBottleMedical}
          title="Drugs and Clinical Candidates"
          description={
            <Typography variant="body2">
              <Link external to="https://platform-docs.opentargets.org/drug">Drugs, clinical candidates and clinical reports</Link>
              {" "}by stage.
            </Typography>
          }
        >
          <DrugsByStageBubbles data={data} />
        </MetricsWidget>

        <MetricsWidget
          id="studies-and-credible-sets"
          icon={faChartBar}
          title="GWAS and molQTL"
          description={
            <Typography variant="body2">
              <Link external to="https://platform-docs.opentargets.org/study">Studies</Link>
              ,{" "}
              <Link external to="https://platform-docs.opentargets.org/credible-set">credible sets</Link>
              {" "}and{" "}
              <Link external to="https://platform-docs.opentargets.org/gentropy/colocalisation">colocalisations</Link>
              {" "}by type.
            </Typography>
          }
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
          description={
            <Typography variant="body2">
              <Link external to="https://platform-docs.opentargets.org/variant">Phenotype-associated variants</Link>
              {" "}by{" "}
              <Link external to=" https://www.ensembl.org/tools/vep">
                most severe consequence
              </Link>
              .
            </Typography>
          }
        >
          <VariantsByConsequenceImpact data={data} />
        </MetricsWidget>
      </Box>
    </>
  );
}

export default MetricsPage;
