import { useQuery } from "@apollo/client";
import { sortBy, filter } from "lodash";
import { Link, Tooltip, SectionItem, PublicationsDrawer, OtTable } from "ui";

import { definition } from ".";
import Description from "./Description";
import { epmcUrl } from "@ot/utils";
import { defaultRowsPerPageOptions } from "@ot/constants";
import GeneOntologyEvidenceCodeMap from "./GeneOntologyEvidenceCodeMappings.json";
import GENE_ONTOLOGY_QUERY from "./GeneOntology.gql";

const CATEGORY_BY_PREFIX = {
  F: { code: "MOLECULAR_FUNCTION", label: "Molecular Function" },
  P: { code: "BIOLOGICAL_PROCESS", label: "Biological Process" },
  C: { code: "CELLULAR_COMPONENT", label: "Cellular Component" },
};

const extractCategory = row => ({
  ...row,
  category: CATEGORY_BY_PREFIX[row.aspect],
});

const sourceURLS = {
  Reactome: id => `https://identifiers.org/reactome:${id}`,
  DOI: id => `https://doi.org/${id}}`,
  GO_REF: id => `https://identifiers.org/GO_REF:${id}`,
};

const sourceMapContent = source => {
  const sourceName = source.slice(0, source.indexOf(":"));
  const sourceId = source.slice(source.indexOf(":") + 1);
  if (sourceName !== "PMID")
    return (
      <Link external to={sourceURLS[sourceName](sourceId)}>
        {sourceName}
      </Link>
    );

  if (sourceName === "PMID")
    return (
      <PublicationsDrawer
        entries={[
          {
            name: sourceId,
            url: epmcUrl(sourceId),
            group: "literature",
          },
        ]}
      />
    );

  return null;
};

function EvidenceTooltip({ evidence }) {
  const code = filter(GeneOntologyEvidenceCodeMap, {
    evidenceCode: evidence,
  })[0];
  return (
    <div>
      <p>
        <b>Label: </b>
        <span>{code.evidenceLabel}</span>
      </p>
      <p>
        <b>Category: </b>
        {code.evidenceCategory}
      </p>
      <p>
        <b>Source: </b>
        <Link external to={code.evidenceSourceUrl}>
          Gene Ontology wiki
        </Link>
      </p>
    </div>
  );
}

const columns = [
  {
    id: "category",
    label: "Category",
    renderCell: ({ category }) => category.label,
    filterValue: ({ category }) => category.label,
    exportLabel: "Category",
    propertyPath: "category.label",
  },
  {
    id: "goTerm",
    label: "GO term",
    enableHiding: false,
    renderCell: ({ term }) =>
      term ? (
        <Link external to={`https://identifiers.org/${term.id}`}>
          {term.label}
        </Link>
      ) : (
        "N/A"
      ),
    exportLabel: "GO term",
    exportValue: ({ term }) => term.label,
    filterValue: ({ term }) => term.label,
  },
  {
    id: "geneProduct",
    label: "Gene product",
    renderCell: ({ geneProduct, term }) =>
      term ? (
        <Link
          external
          to={`https://www.ebi.ac.uk/QuickGO/annotations?geneProductId=${geneProduct}&goId=${term.id}`}
        >
          {geneProduct}
        </Link>
      ) : (
        geneProduct
      ),
    exportLabel: "GO term",
    exportValue: ({ term }) => term.label,
  },
  {
    id: "evidence",
    label: "Evidence code",
    exportLabel: "Evidence code",
    exportValue: row => row.evidence,
    renderCell: ({ evidence }) => (
      <Tooltip title={<EvidenceTooltip evidence={evidence} />} showHelpIcon>
        {evidence}
      </Tooltip>
    ),
  },
  {
    id: "source",
    label: "Source",
    exportLabel: "Source",
    exportValue: row => row.source,
    renderCell: ({ source }) => sourceMapContent(source),
  },
];

type Props = {
  id: string;
  entity: string;
  label: string;
};

function Section({ id, label: symbol, entity }: Props) {
  const variables = { ensemblId: id };
  const request = useQuery(GENE_ONTOLOGY_QUERY, { variables });

  return (
    <SectionItem
      definition={definition}
      entity={entity}
      request={request}
      renderDescription={() => <Description symbol={symbol} />}
      renderBody={() => {
        const rows = sortBy(
          request.data?.target.geneOntology.map(extractCategory),
          "category.label"
        );
        return (
          <OtTable
            showGlobalFilter
            dataDownloader
            dataDownloaderFileStem={`${id}-gene-ontology-${entity}`}
            columns={columns}
            rows={rows}
            rowsPerPageOptions={defaultRowsPerPageOptions}
            query={GENE_ONTOLOGY_QUERY.loc.source.body}
            variables={variables}
            loading={request.loading}
          />
        );
      }}
    />
  );
}

export default Section;
