import { useRef, useEffect } from "react";
import * as Plot from "@observablehq/plot";
import { useMeasure } from "@uidotdev/usehooks";
import { Box } from "@mui/material";
import { grey } from "@mui/material/colors";
import { DataDownloader } from "ui";
import { sentenceCase } from "@ot/utils";

const prepareData = (data = []) => {
  const flatData = data.reduce((accumulator, currentValue) => {
    currentValue.screens.forEach(dot => {
      accumulator.push({ ...dot, tissueName: sentenceCase(currentValue.tissueName) });
    });
    return accumulator;
  }, []);
  return flatData;
};

function Wrapper({ data, query, variables }) {
  const [ref, { width }] = useMeasure();
  const parsedData = prepareData(data);
  return (
    <Box sx={{ display: "flex", justifyContent: "center" }} data-testid="depmap-plot">
      <Box sx={{ width: "95%" }} ref={ref}>
        <ChartControls data={parsedData} query={query} variables={variables} />
        <DepmapPlot data={parsedData} width={width} />
      </Box>
    </Box>
  );
}

function ChartControls({ data, query, variables }) {
  return (
    <Box
      sx={{
        borderColor: grey[300],
        borderRadius: 1,
        display: "flex",
        justifyContent: "flex-end",
        gap: 1,
      }}
    >
      <DataDownloader
        btnLabel="Export data"
        rows={data}
        query={query}
        variables={variables}
        fileStem={`cancer-depmap-target`}
        columns={[
          { exportValue: row => row.depmapId, id: "depmapId" },
          { exportValue: row => row.cellLineName, id: "cellLineName" },
          { exportValue: row => row.diseaseFromSource, id: "diseaseFromSource" },
          { exportValue: row => row.geneEffect, id: "geneEffect" },
          { exportValue: row => row.expression, id: "expression" },
          { exportValue: row => row.tissueName, id: "tissueName" },
        ]}
      />
    </Box>
  );
}

function DepmapPlot({ data, width }) {
  const headerRef = useRef();
  useEffect(() => {
    if (data === undefined || width === null) return;
    const chart = Plot.plot({
      width: width,
      marginLeft: 200,
      style: {
        background: "transparent",
        fontSize: "12px",
      },
      x: {
        type: "symlog",
        domain: [-6, -1, 6],
        grid: true,
        label: null,
      },
      color: {
        domain: ["Dependency", "Neutral"],
        range: ["#EC2846", "#08519C"],
        type: "ordinal",
        label: "Gene effect - log(x)",
        legend: true,
      },
      marks: [
        Plot.ruleX([-1], { strokeDasharray: 4, stroke: "#EC2846" }),
        Plot.boxX(data, {
          r: 0,
          x: "geneEffect",
          y: "tissueName",
          opacity: 0.5,
        }),
        Plot.dot(data, {
          x: "geneEffect",
          y: "tissueName",
          channels: {
            cellLineName: {
              value: "cellLineName",
              label: "",
            },
            geneEffect: {
              value: "geneEffect",
              label: "Gene effect:",
            },
            tissueName: {
              value: "tissueName",
              label: "Tissue:",
            },
            expression: {
              value: "expression",
              label: "Expression:",
            },
            diseaseFromSource: {
              value: "diseaseFromSource",
              label: "Disease:",
            },
          },
          tip: {
            fontSize: 14,
            textPadding: 10,
            format: {
              fill: false,
              cellLineName: true,
              diseaseFromSource: true,
              x: false,
              y: false,
            },
          },
          fill: d => (d.geneEffect < -1 ? "#EC2846" : "#08519C"),
          fillOpacity: 0.5,
        }),
        Plot.axisY({
          label: "Tissue name",
        }),
        Plot.axisX({
          label: "Gene Effect",
        }),
        Plot.crosshair(data, { x: "geneEffect", y: "tissueName" }),
      ],
    });
    headerRef.current.append(chart);
    return () => chart.remove();
  }, [data, width]);

  return <Box ref={headerRef}></Box>;
}

export default Wrapper;
