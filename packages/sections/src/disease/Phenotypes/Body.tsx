import { useQuery } from "@apollo/client";
import {
  type DiseaseBodyProps,
  naLabel,
  type PhenotypesQuery,
  type PhenotypesQueryVariables,
} from "@ot/constants";
import _ from "lodash";
import type { ReactNode } from "react";
import { Link, type OtTableColumn, OtTableServer, SectionItem, TableDrawer, Tooltip } from "ui";
import { typedDocument } from "../../utils/typedDocument";
import { definition } from ".";
import Description from "./Description";
import PHENOTYPES_BODY_QUERY_DOCUMENT from "./PhenotypesQuery.gql";

const PHENOTYPES_BODY_QUERY = typedDocument<PhenotypesQuery, PhenotypesQueryVariables>(
  PHENOTYPES_BODY_QUERY_DOCUMENT
);

type PhenotypeServerRow = NonNullable<PhenotypesQuery["disease"]>["phenotypes"]["rows"][number];
type PhenotypeEvidence = PhenotypeServerRow["evidence"][number];
/** one table row per (phenotype, evidence) pair */
type PhenotypeRow = Omit<PhenotypeServerRow, "evidence"> & { evidence: PhenotypeEvidence };

const evidenceTypeDescription: Record<string, string> = {
  IEA: "Inferred from Electronic Annotations (IEA) are extracted by parsing the Clinical Features sections of the Online Mendelian Inheritance in Man resource",
  PCS: "Published Clinical Study (PCS) are annotations extracted from articles in the medical literature with the PubMed ID of the published study (if available)",
  TAS: "Traceable Author Statement (TAS) is used for information gleaned from knowledge bases such as OMIM or Orphanet that have derived the information from a published source",
};

const aspectDescription: Record<string, string> = {
  P: "Phenotypic abnormality",
  I: "Inheritance",
  C: "Onset and clinical course",
  M: "Clinical modifier",
  H: "Past medical history",
};

const columns: OtTableColumn<PhenotypeRow>[] = [
  {
    id: "qualifierNot",
    label: "Qualifier",
    exportLabel: "qualifierNot",
    renderCell: ({ evidence }) => (evidence.qualifierNot ? "NOT" : ""),
    filterValue: ({ evidence }) => (evidence.qualifierNot ? "NOT" : ""),
    exportValue: ({ evidence }) => (evidence.qualifierNot ? "NOT" : ""),
  },
  {
    id: "phenotypeHPO",
    label: "Phenotype",
    enableHiding: false,
    renderCell: ({ phenotypeEFO, phenotypeHPO }) => {
      let content: ReactNode;
      if (phenotypeEFO?.id) {
        content = (
          <Link asyncTooltip to={`/disease/${phenotypeEFO.id}`}>
            {phenotypeEFO.name}
          </Link>
        );
      } else if (phenotypeHPO?.name) content = phenotypeHPO.name;
      else content = naLabel;

      return phenotypeHPO?.description ? (
        <Tooltip title={`Description: ${phenotypeHPO.description}`} showHelpIcon>
          {content}
        </Tooltip>
      ) : (
        content
      );
    },
    filterValue: ({ phenotypeHPO }) => phenotypeHPO?.name || naLabel,
    exportValue: ({ phenotypeHPO }) => phenotypeHPO?.name || naLabel,
  },
  {
    id: "aspect",
    label: "Aspect",
    renderCell: ({ evidence }) =>
      evidence.aspect ? (
        <Tooltip
          title={`Sub-ontology: ${evidence.aspect} (${aspectDescription[evidence.aspect]})`}
          showHelpIcon
        >
          {evidence.aspect}
        </Tooltip>
      ) : (
        naLabel
      ),
    filterValue: (row) => row.evidence.aspect,
    exportValue: (row) => row.evidence.aspect,
  },
  {
    id: "frequency",
    label: "Frequency",
    renderCell: ({ evidence }) => evidence.frequency || naLabel,
    filterValue: (row) => row.evidence.frequency || naLabel,
    exportValue: (row) => row.evidence.frequency || naLabel,
  },
  {
    id: "onset",
    label: "Onset",
    renderCell: ({ evidence }) =>
      evidence.onset?.length > 0
        ? evidence.onset.map((o) => (
            <span key={o.id}>
              <Link external to={`https://identifiers.org/ols/${o.id.replace("_", ":")}`}>
                {o.name}
              </Link>
              <br />
            </span>
          ))
        : naLabel,
    filterValue: (row) => row.evidence.onset?.map((o) => o.name).join() || naLabel,
    exportValue: (row) => row.evidence.onset?.map((o) => o.name).join() || naLabel,
  },
  {
    id: "modifier",
    label: "Modifier",
    renderCell: ({ evidence }) =>
      evidence.modifiers?.length > 0
        ? evidence.modifiers.map((m) => (
            <span key={m.id}>
              <Link external to={`https://identifiers.org/ols/${m.id.replace("_", ":")}`}>
                {m.name}
              </Link>
              <br />
            </span>
          ))
        : naLabel,
    filterValue: (row) => row.evidence.modifiers?.map((m) => m.name).join() || naLabel,
    exportValue: (row) => row.evidence.modifiers?.map((m) => m.name).join() || naLabel,
  },
  {
    id: "sex",
    label: "Sex",
    renderCell: ({ evidence }) => _.capitalize(evidence.sex ?? "") || naLabel,
    filterValue: (row) => row.evidence.sex || naLabel,
  },
  {
    id: "evidenceType",
    label: "Evidence",
    renderCell: ({ evidence }) =>
      evidence.evidenceType ? (
        <Tooltip title={evidenceTypeDescription[evidence.evidenceType.toUpperCase()]} showHelpIcon>
          {evidence.evidenceType}
        </Tooltip>
      ) : (
        naLabel
      ),
    filterValue: (row) => row.evidence.evidenceType || naLabel,
    exportValue: (row) => row.evidence.evidenceType || naLabel,
  },
  {
    id: "source",
    label: "Source",
    renderCell: ({ evidence }) => evidence.resource || naLabel,
    filterValue: (row) => row.evidence.resource || naLabel,
    exportValue: (row) => row.evidence.resource || naLabel,
  },
  {
    id: "references",
    label: "References",
    renderCell: ({ evidence }) => {
      // no references
      if (!evidence.references || evidence.references.length === 0) {
        return naLabel;
      }
      // parse references
      const refs = evidence.references.map((r) => ({
        url: r.toUpperCase().startsWith("PMID:")
          ? `https://europepmc.org/search?query=EXT_ID:${r.split(":").pop()}`
          : `https://hpo.jax.org/app/browse/disease/${r}`,
        name: r,
        group: "References",
      }));
      return <TableDrawer entries={refs} message={`${refs.length} references`} />;
    },
    filterValue: (row) => row.evidence.references?.map((r) => r).join() || naLabel,
    exportValue: (row) => row.evidence.references?.map((r) => r).join() || naLabel,
    // width: '9%',
  },
];

type Props = DiseaseBodyProps;

const PAGE_SIZE = 10;

function flattenEvidence(rows: PhenotypeServerRow[]): PhenotypeRow[] {
  return rows.flatMap((phenotype) =>
    phenotype.evidence.map((evidence) => ({ ...phenotype, evidence }))
  );
}

function Body({ label: name, id: efoId, entity }: Props) {
  const variables = { efoId };

  // first page only: drives the section loading/error state, the table fetches
  // the same page from the Apollo cache and then paginates on its own
  const request = useQuery(PHENOTYPES_BODY_QUERY, {
    variables: { ...variables, index: 0, size: PAGE_SIZE },
  });

  return (
    <SectionItem
      definition={definition}
      entity={entity}
      request={request}
      renderDescription={() => <Description name={name} />}
      renderBody={() => (
        <OtTableServer<PhenotypeRow, PhenotypeServerRow>
          columns={columns}
          query={PHENOTYPES_BODY_QUERY}
          variables={variables}
          dataPath="disease.phenotypes"
          transformRows={flattenEvidence}
          pageSize={PAGE_SIZE}
          dataDownloader
          dataDownloaderFileStem={`${efoId}-phenotypes`}
        />
      )}
    />
  );
}

export default Body;
