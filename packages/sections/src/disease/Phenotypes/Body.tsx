import { useQuery } from "@apollo/client";
import _ from "lodash";
import { Link, SectionItem, Tooltip, TableDrawer, OtTable } from "ui";

import Description from "./Description";
import { naLabel, DiseaseBodyProps} from "@ot/constants";

import PHENOTYPES_BODY_QUERY from "./PhenotypesQuery.gql";
import { definition } from ".";

const evidenceTypeDescription = {
  IEA: "Inferred from Electronic Annotations (IEA) are extracted by parsing the Clinical Features sections of the Online Mendelian Inheritance in Man resource",
  PCS: "Published Clinical Study (PCS) are annotations extracted from articles in the medical literature with the PubMed ID of the published study (if available)",
  TAS: "Traceable Author Statement (TAS) is used for information gleaned from knowledge bases such as OMIM or Orphanet that have derived the information from a published source",
};

const aspectDescription = {
  P: "Phenotypic abnormality",
  I: "Inheritance",
  C: "Onset and clinical course",
  M: "Clinical modifier",
  H: "Past medical history",
};

const columns = [
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
      let content;
      if (phenotypeEFO && phenotypeEFO.id ) {
        content = (
          <Link asyncTooltip to={`/disease/${phenotypeEFO.id}`}>
            {phenotypeEFO.name}
          </Link>
        );
      } else if (phenotypeHPO && phenotypeHPO.name) content = phenotypeHPO.name;
      else content = naLabel;

      return phenotypeHPO?.description ? (
        <Tooltip title={`Description: ${phenotypeHPO.description}`} showHelpIcon>
          {content}
        </Tooltip>
      ) : (
        content
      );
    },
    filterValue: ({phenotypeEFO,phenotypeHPO}) => phenotypeHPO && phenotypeHPO?.name ? phenotypeHPO.name : naLabel,
    exportValue: ({phenotypeEFO,phenotypeHPO}) => phenotypeHPO && phenotypeHPO?.name ? phenotypeHPO.name : naLabel,
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
    filterValue: row => row.evidence.aspect,
    exportValue: row => row.evidence.aspect,
  },
  {
    id: "frequency",
    label: "Frequency",
    renderCell: ({ evidence }) => {
      if (evidence.frequencyHPO && evidence.frequencyHPO.id && evidence.frequencyHPO.name)
        return (
          <Link
            external
            to={`https://identifiers.org/ols/${evidence.frequencyHPO.id.replace("_", ":")}`}
          >
            {evidence.frequencyHPO.name}
          </Link>
        );
      if (evidence.frequencyHPO && evidence.frequencyHPO.name) return evidence.frequencyHPO.name;
      return naLabel;
    },
    filterValue: row => row.evidence.frequencyHPO?.name || naLabel,
    exportValue: row => row.evidence.frequencyHPO?.name || naLabel,
  },
  {
    id: "onset",
    label: "Onset",
    renderCell: ({ evidence }) =>
      evidence.onset?.length > 0
        ? evidence.onset.map(o => (
            <span key={o.id}>
              <Link external to={`https://identifiers.org/ols/${o.id.replace("_", ":")}`}>
                {o.name}
              </Link>
              <br />
            </span>
          ))
        : naLabel,
    filterValue: row => row.evidence.onset?.map(o => o.name).join() || naLabel,
    exportValue: row => row.evidence.onset?.map(o => o.name).join() || naLabel,
  },
  {
    id: "modifier",
    label: "Modifier",
    renderCell: ({ evidence }) =>
      evidence.modifiers?.length > 0
        ? evidence.modifiers.map(m => (
            <span key={m.id}>
              <Link external to={`https://identifiers.org/ols/${m.id.replace("_", ":")}`}>
                {m.name}
              </Link>
              <br />
            </span>
          ))
        : naLabel,
    filterValue: row => row.evidence.modifiers?.map(m => m.name).join() || naLabel,
    exportValue: row => row.evidence.modifiers?.map(m => m.name).join() || naLabel,
  },
  {
    id: "sex",
    label: "Sex",
    renderCell: ({ evidence }) => _.capitalize(evidence.sex) || naLabel,
    filterValue: row => row.evidence.sex || naLabel,
  },
  {
    id: "evidenceType",
    label: "Evidence",
    renderCell: ({ evidence }) =>
      evidence.evidenceType ? (
        <Tooltip title={evidenceTypeDescription[evidence.evidenceType?.toUpperCase()]} showHelpIcon>
          {evidence.evidenceType}
        </Tooltip>
      ) : (
        naLabel
      ),
    filterValue: row => row.evidence.evidenceType || naLabel,
    exportValue: row => row.evidence.evidenceType || naLabel,
  },
  {
    id: "source",
    label: "Source",
    renderCell: ({ evidence }) => evidence.resource || naLabel,
    filterValue: row => row.evidence.resource || naLabel,
    exportValue: row => row.evidence.resource || naLabel,
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
      const refs = evidence.references.map(r => ({
        url: r.toUpperCase().startsWith("PMID:")
          ? `https://europepmc.org/search?query=EXT_ID:${r.split(":").pop()}`
          : `https://hpo.jax.org/app/browse/disease/${r}`,
        name: r,
        group: "References",
      }));
      return <TableDrawer entries={refs} />;
    },
    filterValue: row => row.evidence.references?.map(r => r).join() || naLabel,
    exportValue: row => row.evidence.references?.map(r => r).join() || naLabel,
    // width: '9%',
  },
];

type Props = DiseaseBodyProps;

function Body({ label: name, id: efoId, entity }: Props) {
  const variables = {
    efoId,
    index: 0,
    size: 1000,
  };

  const request = useQuery(PHENOTYPES_BODY_QUERY, {
    variables,
  });

  return (
    <SectionItem
      definition={definition}
      entity={entity}
      request={request}
      renderDescription={() => <Description name={name} />}
      renderBody={() => {
        // process the data
        const rows = [];
        request.data?.disease.phenotypes.rows.forEach(p =>
          p.evidence.forEach(e => {
            const p1 = { ...p };
            p1.evidence = e;
            rows.push(p1);
          })
        );

        return (
          <OtTable
            columns={columns}
            rows={rows}
            dataDownloader
            dataDownloaderFileStem={`${efoId}-phenotypes`}
            showGlobalFilter
            query={PHENOTYPES_BODY_QUERY.loc.source.body}
            variables={variables}
            loading={request.loading}
          />
        );
      }}
    />
  );
}

export default Body;
