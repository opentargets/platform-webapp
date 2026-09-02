import { useQuery } from "@apollo/client";
import { Link, SectionItem, Tooltip, OtTable, Box, Chip } from "ui";
import { Fragment } from "react";
import { definition } from "../VariantEffectPredictor";
import Description from "../VariantEffectPredictor/Description";
import { naLabel } from "@ot/constants";
import { identifiersOrgLink } from "@ot/utils";
import VARIANT_EFFECT_PREDICTOR_QUERY from "./VariantEffectPredictorQuery.gql";

function formatVariantConsequenceLabel(label) {
  return label.replace(/_/g, " ");
}

function isNumber(value: any): boolean {
  return typeof value === "number" && isFinite(value);
}

const columns = [
  {
    id: "target.approvedSymbol",
    label: "Gene",
    sortable: true,
    enableHiding: false,
    renderCell: ({ target, transcriptId, uniprotAccessions }) => {
      if (!target) return naLabel;
      let displayElement = (
        <Link asyncTooltip to={`../target/${target.id}`}>
          {target.approvedSymbol}
        </Link>
      );
      let tooltipContent = <></>;
      if (transcriptId) {
        tooltipContent = (
          <Box>
            <b>Ensembl canonical transcript: </b>
            <br />
            <Link
              external
              to={`https://www.ensembl.org/Homo_sapiens/Transcript/Summary?db=core;g=${target.id};t=${transcriptId}`}
            >
              {transcriptId}
            </Link>
          </Box>
        );
      }
      if (uniprotAccessions?.length) {
        tooltipContent = (
          <>
            {tooltipContent}
            <b>Protein:</b>
            <br />
            {uniprotAccessions.map((id, i, arr) => (
              <Fragment key={id}>
                <Link external to={`https://identifiers.org/uniprot:${id}`} footer={false}>
                  {id}
                </Link>
                {i < arr.length - 1 && ", "}
              </Fragment>
            ))}
          </>
        );
      }
      displayElement = (
        <Tooltip title={tooltipContent} showHelpIcon>
          {displayElement}
        </Tooltip>
      );

      if (target?.biotype === "protein_coding") {
        displayElement = (
          <>
            {displayElement}{" "}
            <Chip sx={{ typography: "caption" }} label="protein coding" />{" "}
          </>
        );
      }
      return displayElement;
    },
    exportValue: ({ target, transcriptId, uniprotAccessions, aminoAcidChange }) => {
      const geneInfo = `Gene: ${target?.id};`;
      const canonicalTranscript = transcriptId ? `Canonical transcript: ${transcriptId};` : "";
      const biotype = `Biotype: ${target?.biotype};`;
      const protein = uniprotAccessions?.length
        ? `Protein(s): ${uniprotAccessions.join(", ")}`
        : "";
      const aaChange = aminoAcidChange ? `AA: ${aminoAcidChange};` : "";
      return [geneInfo, canonicalTranscript, biotype, protein, aaChange].join("");
    },
  },
  {
    id: "variantConsequences.label",
    label: "Predicted consequence",
    enableHiding: false,
    renderCell: ({ variantConsequences, aminoAcidChange, codons }) => {
      if (!variantConsequences?.length) return naLabel;
      let displayElement = variantConsequences.map(({ id, label }, i, arr) => (
        <Fragment key={id}>
          <Link external to={identifiersOrgLink("SO", id.slice(3))}>
            {formatVariantConsequenceLabel(label)}
          </Link>
          {i < arr.length - 1 && ", "}
        </Fragment>
      ));
      if (aminoAcidChange)
        displayElement = (
          <Box sx={{ display: "flex", alignItems: "center" }}>
            {displayElement}&nbsp;{" "}
            <Chip sx={{ typography: "caption" }} label={aminoAcidChange} />
          </Box>
        );
      if (codons) {
        const tooltipContent = (
          <>
            <b>Trancript consequence:</b>
            <br />
            {codons}
            <br />
          </>
        );

        displayElement = (
          <Tooltip title={tooltipContent} style="">
            {displayElement}
          </Tooltip>
        );
      }
      return displayElement;
    },
    exportValue: ({ variantConsequences }) => {
      return variantConsequences
        .map(({ label }) => {
          return formatVariantConsequenceLabel(label);
        })
        .join(", ");
    },
  },
  {
    id: "impact",
    label: "Impact",
    renderCell: ({ impact }) => impact?.toLowerCase?.() ?? naLabel,
  },
  {
    id: "distanceFromFootprint",
    label: "Distance from footprint (bp)",
    numeric: true,
    sortable: true,
    renderCell: ({ distanceFromFootprint }) =>
      isNumber(distanceFromFootprint)
        ? parseInt(distanceFromFootprint, 10).toLocaleString()
        : naLabel,
  },
  {
    id: "distanceFromTss",
    label: "Distance from start site (bp)",
    numeric: true,
    sortable: true,
    renderCell: ({ distanceFromTss }) =>
      isNumber(distanceFromTss) ? parseInt(distanceFromTss, 10).toLocaleString() : naLabel,
  },
];

type BodyProps = {
  id: string;
  entity: string;
};

export function Body({ id, entity }: BodyProps) {
  const variables = {
    variantId: id,
  };

  const request = useQuery(VARIANT_EFFECT_PREDICTOR_QUERY, {
    variables,
  });

  return (
    <SectionItem
      definition={definition}
      request={request}
      entity={entity}
      renderDescription={() => (
        <Description
          variantId={request.data?.variant.id}
          referenceAllele={request.data?.variant.referenceAllele}
          alternateAllele={request.data?.variant.alternateAllele}
        />
      )}
      renderBody={() => {
        let sortedRows = [];
        sortedRows = structuredClone(request.data?.variant.transcriptConsequences);
        sortedRows?.sort((a, b) => a.transcriptIndex - b.transcriptIndex);
        return (
          <OtTable
            columns={columns}
            rows={sortedRows}
            dataDownloader
            dataDownloaderFileStem={`${id}-variant-effect-predictor`}
            query={VARIANT_EFFECT_PREDICTOR_QUERY.loc.source.body}
            variables={variables}
            loading={request.loading}
          />
        );
      }}
    />
  );
}

export default Body;
