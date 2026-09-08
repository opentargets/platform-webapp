import { median as d3Median, quantile } from "d3";
import { useRef } from "react";
import { DownloadSvgPlot } from "ui";

import GtexVariability from "./GtexVariability";

const transformData = (data) =>
  data.map((d) => {
    // d3 requires for the array of values to be sorted before using median and quantile
    d.data.sort((a, b) => a - b);
    const median = d3Median(d.data);
    const q1 = quantile(d.data, 0.25);
    const q3 = quantile(d.data, 0.75);
    const outliers = [];
    const notoutliers = [];
    const iqr = q3 - q1; // interquartile range

    // find the outliers and not outliers
    d.data.forEach((item) => {
      if (item < q1 - 1.5 * iqr || item > q3 + 1.5 * iqr) {
        outliers.push(item);
      } else {
        notoutliers.push(item);
      }
    });

    return {
      tissueSiteDetailId: d.tissueSiteDetailId,
      median,
      q1,
      q3,
      lowerLimit: notoutliers[0],
      upperLimit: notoutliers[notoutliers.length - 1],
      outliers,
    };
  });

export async function getData(symbol) {
  try {
    const urlGene = ` https://gtexportal.org/api/v2/reference/gene?geneId=${symbol}&gencodeVersion=v39`;
    const resGene = await fetch(urlGene);
    const rawGene = await resGene.json();
    const { gencodeId } = rawGene.data[0];
    const urlData = `https://gtexportal.org/api/v2/expression/geneExpression?datasetId=gtex_v10&gencodeId=${gencodeId}`;
    const resData = await fetch(urlData);
    const rawData = await resData.json();
    // TODO:
    // in order for the SectionItem null check to work, the data needs to match the target object format.
    // Ideally when switching tabs we don't want to check and hide the widget, so this should be handled differently
    const data = {
      target: {
        expressions: transformData(rawData.data),
      },
    };

    return { loading: false, data };
  } catch (error) {
    return { loading: false, error };
  }
}

function GtexTab({ symbol, data }) {
  const gtexVariability = useRef();

  return (
    <DownloadSvgPlot svgContainer={gtexVariability} filenameStem={`${symbol}-gtex`}>
      <GtexVariability data={data.target.expressions} ref={gtexVariability} />
    </DownloadSvgPlot>
  );
}

export default GtexTab;
