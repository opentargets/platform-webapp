import * as d3 from "d3";
import { useRef, useEffect } from "react";
import { useMeasure } from "@uidotdev/usehooks";
import { useTheme } from "@mui/material";
import { grey } from "@mui/material/colors";
import { Link, DataDownloader, Box, Skeleton, Typography } from "ui";

const content = {
  mouseOrthologMaxIdentityPercentage:
    "The Mouse Orthologue Identity visualization highlights the maximum sequence identity (%) of mouse orthologues for a given target, providing insight into its potential for in vivo assays. Data is sourced from the Ensembl Compara widget, and only orthologues with at least 80% identity are considered. Scores range from 0 to 1, where 1 indicates a mouse gene with 100% identity to the target, and 0 means no gene meets the 80% threshold. If multiple orthologues exist, the highest identity percentage is displayed.",
  paralogMaxIdentityPercentage:
    "The Paralogues visualization displays the maximum sequence identity (%) of paralogues within the human genome, offering insights into functional redundancy or diversity. Data is sourced from the Ensembl Compara widget, focusing on paralogues with at least 60% identity to the target. Scores range from 0 to -1, where -1 represents paralogues with higher identity (≥60%), and 0 indicates paralogues with lower identity.",
};
const contentURL = {
  mouseOrthologMaxIdentityPercentage:
    "https://platform-docs.opentargets.org/web-interface/target-prioritisation#mouse-ortholog-identity",
  paralogMaxIdentityPercentage:
    "https://platform-docs.opentargets.org/web-interface/target-prioritisation#paralogues",
};

function getTooltipContent(homolog) {
  return `<div>
    ${getPropText(homolog, "homologyType", "Type")}
    ${getPropText(homolog, "targetGeneSymbol", "Homolog")}
    ${getPropText(homolog, "queryPercentageIdentity", "Query Percentage")}
    ${getPropText(homolog, "targetPercentageIdentity", "Target Percentage")}
  </div>`;
}

function getPropText(homolog, prop, label) {
  return `<div>
  <b> ${label}:</b> ${homolog[prop]}
</div>`;
}

const yAxisValues = [
  "6239",
  "7227",
  "7955",
  "8364",
  "9823",
  "9615",
  "10141",
  "9986",
  "10116",
  "10090",
  "9544",
  "9598",
  "9606",
];

const TOOLTIP_ID = "tolltip-template-comp-genomic";
const dotDefaultRadious = 6;
const dotDefaultOpacity = 0.7;

function Wrapper({ homologues, viewMode, loading, query, variables, columns }) {
  const [ref, { width }] = useMeasure();
  if (loading)
    return (
      <Box>
        <Skeleton height={400} />
      </Box>
    );
  return (
    <Box data-testid="comparative-genomics-chart" sx={{ display: "flex", flexDirection: "column" }}>
      <ChartControls data={homologues} query={query} variables={variables} columns={columns} />
      {viewMode !== "default" && (
        <Typography sx={{ width: "85%", my: 2, ml: 4 }} variant="body2">
          {content[viewMode]}
          <Link external to={contentURL[viewMode]}>
            Documentation
          </Link>
        </Typography>
      )}
      <Box sx={{ width: "95%", margin: "0 auto", position: "relative" }} ref={ref}>
        <div style={{ height: 0 }} id={TOOLTIP_ID}></div>
        <Visualisation homologues={homologues} width={width} viewMode={viewMode} />
      </Box>
    </Box>
  );
}

function ChartControls({ data, query, variables, columns }) {
  return (
    <Box
      sx={{
        borderColor: grey[300],
        borderRadius: 1,
        display: "flex",
        justifyContent: "flex-end",
        gap: 1,
        mb: 2,
      }}
    >
      <DataDownloader
        btnLabel="Export"
        fileStem={`comparative-genomics-plot`}
        rows={data}
        query={query}
        variables={variables}
        columns={columns}
      />
    </Box>
  );
}

const labels = {
  6239: "Caenorhabditis elegans (Nematode, N2)",
  7227: "Drosophila melanogaster (Fruit fly)",
  7955: "Zebrafish",
  8364: "Tropical clawed frog",
  9823: "Pig",
  9615: "Dog",
  10141: "Guinea Pig",
  9986: "Rabbit",
  10116: "Rat",
  10090: "Mouse",
  9544: "Macaque",
  9598: "Chimpanzee",
  9606: "Human",
};

function Visualisation({ homologues, width, viewMode }) {
  const theme = useTheme();
  const containerReference = useRef();
  const height = 400;
  const marginTop = 20;
  const marginRight = 20;
  const marginBottom = 30;
  const marginLeft = 40;

  // Declare the y (vertical position) scale.
  const y = d3
    .scalePoint()
    .domain(yAxisValues)
    .range([height - marginBottom * 2, marginTop]);

  useEffect(() => {
    if (!homologues) return;
    const chartWidth = (width - marginRight) * 0.4;

    // Declare the x (horizontal position) scale.
    const queryScale = d3.scaleLinear().domain([0, 100]).range([marginLeft, chartWidth]);
    const targetScale = d3
      .scaleLinear()
      .domain([100, 0])
      .range([width - chartWidth, width - marginRight]);

    // Create the SVG container.
    const svg = d3.create("svg").attr("width", width).attr("height", height);

    const tooltip = d3
      .select(`#${TOOLTIP_ID}`)
      .append("div")
      .style("opacity", 0)
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("background-color", "white")
      .style("border", `1px solid ${grey[400]}`)
      .style("border-radius", "3px")
      .style("padding", "5px")
      .style("width", "175px")
      .style("font-family", theme.typography.body2.fontFamily)
      .style("font-size", theme.typography.body2.fontSize)
      .style("box-shadow", theme.boxShadow.default);

    const mouseover = function (d) {
      tooltip.style("opacity", 1);
      const classId = `.${d.targetGeneId}_${d.speciesId}`;
      d3.select(this)
        .transition()
        .duration(300)
        .attr("fill-opacity", 1)
        .attr("r", dotDefaultRadious * 2);
      d3.selectAll(classId)
        .transition()
        .duration(300)
        .attr("fill-opacity", 1)
        .attr("r", dotDefaultRadious * 2);
    };
    const mousemove = function (d) {
      const mouseX = d3.mouse(this)[0];
      const mouseY = d3.mouse(this)[1];
      const bottom = mouseY > height / 2 ? `${height - mouseY + 8}px` : "initial";
      const left = mouseX < width / 2 ? `${mouseX + 8}px` : "initial";
      const right = mouseX > width / 2 ? `${width - mouseX + 8}px` : "initial";
      const top = mouseY < height / 2 ? `${mouseY + 8}px` : "initial";
      tooltip
        .style("top", top)
        .style("right", right)
        .style("bottom", bottom)
        .style("left", left)
        .html(getTooltipContent(d));
    };
    const mouseleave = function (d) {
      tooltip.style("opacity", 0);
      const classId = `.${d.targetGeneId}_${d.speciesId}`;
      d3.selectAll(classId)
        .transition()
        .duration(300)
        .attr("fill-opacity", dotDefaultOpacity)
        .attr("r", dotDefaultRadious);
      d3.select(this)
        .transition()
        .duration(300)
        .attr("fill-opacity", dotDefaultOpacity)
        .attr("r", dotDefaultRadious);
    };

    // Add the x-axis.
    svg
      .append("g")
      .attr("transform", `translate(0,${height - marginBottom})`)
      .call(d3.axisBottom(queryScale))
      .call(g =>
        g
          .append("text")
          .attr("x", marginLeft)
          .attr("y", marginBottom - 1)
          .attr("fill", "currentColor")
          .attr("text-anchor", "start")
          .text("Query Percentage Identity →")
      );

    // Add the x-axis.
    svg
      .append("g")
      .attr("transform", `translate(0,${height - marginBottom})`)
      .call(d3.axisBottom(targetScale))
      .call(g =>
        g
          .append("text")
          .attr("x", width - marginRight)
          .attr("y", marginBottom - 1)
          .attr("fill", "currentColor")
          .attr("text-anchor", "end")
          .text("← Target Percentage Identity")
      );

    const yAxis = d3
      .axisLeft(y)
      .tickFormat(d => labels[d])
      .tickSize(0);
    // Add the y-axis.
    svg
      .append("g")
      .attr("class", "queryContainer")
      .attr("transform", `translate(${width / 2},0)`)
      .style("text-anchor", "middle")
      .style("font-size", "0.85rem")
      .style("font-weight", 400)
      .call(yAxis)
      .call(g => g.select(".domain").remove());

    svg
      .append("g")
      .attr("stroke", "currentColor")
      .attr("stroke-opacity", 0.1)
      .call(g =>
        g
          .append("g")
          .selectAll("line")
          .data(queryScale.ticks())
          .join("line")
          .attr("x1", d => queryScale(d))
          .attr("x2", d => queryScale(d))
          .attr("y1", marginTop)
          .attr("y2", height - marginBottom)
      )
      .call(g =>
        g
          .append("g")
          .selectAll("line")
          .data(targetScale.ticks())
          .join("line")
          .attr("x1", d => targetScale(d))
          .attr("x2", d => targetScale(d))
          .attr("y1", marginTop)
          .attr("y2", height - marginBottom)
      );

    // Create the grid
    const queryContainer = svg.append("g").attr("class", "queryContainer");
    const targetContainer = svg.append("g").attr("class", "targetContainer");

    queryContainer
      .selectAll(".query")
      .data(homologues)
      .enter()
      .append("circle")
      .attr("cx", function (d) {
        return queryScale(d.queryPercentageIdentity);
      })
      .attr("cy", function (d) {
        return y(d.speciesId);
      })
      .attr("r", dotDefaultRadious)
      .attr("class", function (d) {
        return `${d.targetGeneId}_${d.speciesId}`;
      })
      .attr("id", function (d, i) {
        return i;
      })
      .attr("fill-opacity", dotDefaultOpacity)
      .attr("fill", theme.palette.primary.main)
      .attr("stroke", theme.palette.primary.dark)
      .on("mouseover", mouseover)
      .on("mousemove", mousemove)
      .on("mouseleave", mouseleave);

    targetContainer
      .selectAll(".target")
      .data(homologues)
      .enter()
      .append("circle")
      .attr("cx", function (d) {
        return targetScale(d.targetPercentageIdentity);
      })
      .attr("cy", function (d) {
        return y(d.speciesId);
      })
      .attr("r", dotDefaultRadious)
      .attr("class", function (d) {
        return `${d.targetGeneId}_${d.speciesId}`;
      })
      .attr("fill-opacity", 0.7)
      .attr("fill", theme.palette.primary.main)
      .attr("stroke", theme.palette.primary.dark)
      .on("mouseover", mouseover)
      .on("mousemove", mousemove)
      .on("mouseleave", mouseleave);

    if (viewMode === "mouseOrthologMaxIdentityPercentage") {
      queryContainer.selectAll("circle").attr("fill", grey[300]).attr("stroke", grey[300]);
      targetContainer.selectAll("circle").attr("fill", grey[300]).attr("stroke", grey[300]);

      queryContainer
        .selectAll("circle")
        .attr("fill", d =>
          d.queryPercentageIdentity > 80 && d.speciesId == "10090"
            ? theme.palette.primary.main
            : grey[300]
        )
        .attr("stroke", d =>
          d.queryPercentageIdentity > 80 && d.speciesId == "10090"
            ? theme.palette.primary.dark
            : grey[300]
        );
      queryContainer
        .append("line")
        .attr("x1", queryScale(80))
        .attr("x2", queryScale(80))
        .attr("y1", marginTop)
        .attr("y2", height - marginBottom)
        .attr("stroke", "#2e5943");

      svg
        .selectAll(".queryContainer text")
        .attr("color", d => (d === "10090" ? theme.palette.text.primary : grey[400]));
    }
    if (viewMode === "paralogMaxIdentityPercentage") {
      queryContainer.selectAll("circle").attr("fill", grey[300]).attr("stroke", grey[300]);
      targetContainer.selectAll("circle").attr("fill", grey[300]).attr("stroke", grey[300]);

      queryContainer
        .selectAll("circle")
        // .transition(300)
        .attr("fill", d =>
          d.queryPercentageIdentity > 60 && d.speciesId == "9606"
            ? theme.palette.primary.main
            : grey[300]
        )
        .attr("stroke", d =>
          d.queryPercentageIdentity > 60 && d.speciesId == "9606"
            ? theme.palette.primary.dark
            : grey[300]
        );
      queryContainer
        .append("line")
        .attr("x1", queryScale(60))
        .attr("x2", queryScale(60))
        .attr("y1", marginTop)
        .attr("y2", height - marginBottom)
        .attr("stroke", "#e3a772");

      svg
        .selectAll(".queryContainer text")
        .attr("color", d => (d === "9606" ? theme.palette.text.primary : grey[400]));
    }

    // Append the SVG element.
    containerReference.current.append(svg.node());
    return () => {
      tooltip.remove();
      svg.remove();
    };
  }, [homologues, width, viewMode]);

  return <div ref={containerReference}></div>;
}

export default Wrapper;
