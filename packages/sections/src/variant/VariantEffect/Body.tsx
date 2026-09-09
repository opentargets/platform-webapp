import { ReactElement } from "react";
import { useQuery } from "@apollo/client";
import { SectionItem, Tooltip, OtTable, Link, Typography } from "ui";
import { definition } from ".";
import Description from "./Description";
import { naLabel, VARIANT_EFFECT_METHODS, VIEW } from "@ot/constants";
import VARIANT_EFFECT_QUERY from "./VariantEffectQuery.gql";
import VariantEffectPlot from "./VariantEffectPlot";

const columns = [
  {
    id: "method",
    label: "Method",
    enableHiding: false,
    renderCell: ({ method }) => (
      <Tooltip
        title={
          <>
            {VARIANT_EFFECT_METHODS[method].description} See{" "}
            <Link to={VARIANT_EFFECT_METHODS[method].docsUrl}>here </Link> for more info.
          </>
        }
        showHelpIcon
      >
        {VARIANT_EFFECT_METHODS[method].prettyName}
      </Tooltip>
    ),
    exportValue: ({ method }) => VARIANT_EFFECT_METHODS[method].prettyName,
  },
  {
    id: "assessment",
    label: "Prediction",
    renderCell: ({ assessment, assessmentFlag }) =>
      assessmentFlag ? (
        <Tooltip
          title={
            <>
              <Typography variant="subtitle2" display="block" align="center">
                Flag: {assessmentFlag}
              </Typography>
            </>
          }
          showHelpIcon
        >
          {assessment ?? naLabel}
        </Tooltip>
      ) : (
        assessment ?? naLabel
      ),
  },
  {
    id: "score",
    label: "Score",
    numeric: true,
    renderCell: ({ score }) => score?.toPrecision(3) ?? naLabel,
  },
  {
    id: "normalisedScore",
    label: "Normalised score",
    numeric: true,
    renderCell: ({ normalisedScore }) => normalisedScore?.toFixed(3) ?? naLabel,
  },
];

type BodyProps = {
  id: string;
  entity: string;
};

function getSortedRows(request) {
  return request.data?.variant?.variantEffect
    ? [...request.data.variant.variantEffect]
        .filter(e => e.method !== null)
        .sort((row1, row2) =>
          VARIANT_EFFECT_METHODS[row1.method].prettyName.localeCompare(
            VARIANT_EFFECT_METHODS[row2.method].prettyName
          )
        )
    : [];
}

export function Body({ id, entity }: BodyProps): ReactElement {
  const variables = {
    variantId: id,
  };
  const request = useQuery(VARIANT_EFFECT_QUERY, {
    variables,
  });

  const rows = getSortedRows(request);

  return (
    <SectionItem
      definition={definition}
      request={request}
      entity={entity}
      defaultView={VIEW.chart}
      renderDescription={() => (
        <Description
          variantId={request.data?.variant.id}
          referenceAllele={request.data?.variant.referenceAllele}
          alternateAllele={request.data?.variant.alternateAllele}
        />
      )}
      renderChart={() => {
        return (
          <VariantEffectPlot
            data={rows}
            query={VARIANT_EFFECT_QUERY.loc.source.body}
            variables={variables}
            columns={columns}
          />
        );
      }}
      renderBody={() => {
        return (
          <OtTable
            columns={columns}
            rows={rows}
            dataDownloader
            dataDownloaderFileStem={`${id}-variant-effect`}
            query={VARIANT_EFFECT_QUERY.loc.source.body}
            variables={variables}
            loading={request.loading}
          />
        );
      }}
    />
  );
}

export default Body;
