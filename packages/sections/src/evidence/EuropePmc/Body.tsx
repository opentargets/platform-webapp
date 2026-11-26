import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@apollo/client";
import { SectionItem, Link, OtTableServer, type OtTableColumn, Skeleton } from "ui";

import Description from "./Description";
import { europePmcLiteratureQuery } from "@ot/utils";
import { dataTypesMap, naLabel, type EvidenceBodyProps } from "@ot/constants";
import Publication from "./Publication";
import { typedDocument } from "../../utils/typedDocument";
import EUROPE_PMC_QUERY_DOCUMENT from "./sectionQuery.gql";
import { definition } from ".";

// `europePmc` is on the staging API but not yet in the generated types (see ../types.ts)
type EuropePmcRow = {
  diseaseId: string;
  diseaseName: string;
  literature: string[];
  pmcIds: string[];
  publicationYear?: number | null;
  textMiningSentences: {
    tStart: number;
    tEnd: number;
    dStart: number;
    dEnd: number;
    section: string;
    text: string;
  }[];
  resourceScore?: number | null;
};

type QueryData = {
  disease?: {
    id: string;
    evidenceViews: { europePmc: { count: number; rows: EuropePmcRow[] } };
  } | null;
};

type QueryVariables = {
  ensemblId: string;
  efoId: string;
  index: number;
  size: number;
};

const EUROPE_PMC_QUERY = typedDocument<QueryData, QueryVariables>(EUROPE_PMC_QUERY_DOCUMENT);

// Europe PMC REST details of a publication, keyed by its id (row.literature[0])
type LiteratureById = Record<string, Record<string, any>>;

const getColumns = (
  label: EvidenceBodyProps["label"],
  literatureById: LiteratureById
): OtTableColumn<EuropePmcRow>[] => [
  {
    id: "diseaseName",
    label: "Disease/phenotype",
    renderCell: ({ diseaseId, diseaseName }) => (
      <Link asyncTooltip to={`/disease/${diseaseId}`}>
        {diseaseName}
      </Link>
    ),
  },
  {
    id: "publicationDetails",
    label: "Publication",
    width: "80%",
    renderCell: ({ literature, textMiningSentences }) => {
      const entry = literatureById[literature[0]];
      if (!entry) return <Skeleton variant="text" />;
      return (
        <Publication
          europePmcId={entry.id}
          title={entry.title}
          abstract={entry.abstractText}
          textMiningSentences={textMiningSentences}
          authors={entry.authorList?.author || []}
          journal={{ ...entry.journalInfo, page: entry.pageInfo }}
          source={entry.source}
          patentDetails={entry.patentDetails}
          isOpenAccess={entry.isOpenAccess === "Y"}
          fullTextOpen={!!(entry.inEPMC === "Y" || entry.inPMC === "Y")}
          pmcId={entry.pmcid}
          symbol={label.symbol}
          name={label.name}
        />
      );
    },
  },
  {
    id: "year",
    label: "Year",
    renderCell: ({ publicationYear }) => publicationYear ?? naLabel,
  },
  {
    id: "resourceScore",
    label: "Score",
    numeric: true,
  },
];

// the publication title comes from the Europe PMC REST API, not the Open Targets API,
// so the download only has the Open Targets fields
const exportColumns: OtTableColumn<EuropePmcRow>[] = [
  {
    id: "diseaseName",
    label: "Disease/phenotype",
    exportValue: (row: EuropePmcRow) => row.diseaseName,
  },
  {
    id: "europePmcId",
    label: "europePmcId",
    exportValue: (row: EuropePmcRow) => row.literature[0],
  },
  {
    id: "pmcId",
    label: "pmcId",
    exportValue: (row: EuropePmcRow) => row.pmcIds.join(", "),
  },
  {
    id: "year",
    label: "year",
    exportValue: (row: EuropePmcRow) => row.publicationYear,
  },
  {
    id: "resourceScore",
    label: "Score",
    exportValue: (row: EuropePmcRow) => row.resourceScore,
  },
];

const PAGE_SIZE = 5;

function Body({ id, label, entity }: EvidenceBodyProps) {
  const { ensgId, efoId } = id;
  const variables = { ensemblId: ensgId, efoId };
  const [literatureById, setLiteratureById] = useState<LiteratureById>({});
  const [pageIds, setPageIds] = useState<string[]>([]);

  // first page only: drives the section loading/error state, the table fetches
  // the same page from the Apollo cache and then paginates on its own
  const request = useQuery(EUROPE_PMC_QUERY, {
    variables: { ...variables, index: 0, size: PAGE_SIZE },
  });

  const onDataLoaded = useCallback((data: unknown) => {
    const rows = (data as QueryData | undefined)?.disease?.evidenceViews.europePmc.rows ?? [];
    setPageIds(rows.map(row => row.literature[0]));
  }, []);

  // Europe PMC details for the publications of the current page only
  useEffect(() => {
    const missingIds = pageIds.filter(pmid => !literatureById[pmid]);
    if (!missingIds.length) return;
    let isCurrent = true;

    async function fetchLiterature() {
      let entries: Record<string, any>[] = [];
      try {
        const res = await fetch(europePmcLiteratureQuery(missingIds));
        entries = (await res.json()).resultList.result;
      } catch {
        // rendered with the id only, as when Europe PMC does not know the publication
      }
      if (!isCurrent) return;
      setLiteratureById(prev => {
        const next = { ...prev };
        missingIds.forEach(pmid => {
          next[pmid] = { id: pmid };
        });
        entries.forEach(entry => {
          next[entry.id] = entry;
        });
        return next;
      });
    }

    fetchLiterature();
    return () => {
      isCurrent = false;
    };
  }, [pageIds]);

  const columns = getColumns(label, literatureById);

  return (
    <SectionItem
      definition={definition}
      entity={entity}
      chipText={dataTypesMap.literature}
      request={request}
      renderDescription={() => <Description symbol={label.symbol} name={label.name} />}
      renderBody={() => (
        <OtTableServer<EuropePmcRow>
          query={EUROPE_PMC_QUERY}
          columns={columns}
          dataDownloader
          dataDownloaderColumns={exportColumns}
          dataDownloaderFileStem={`europepmc-${ensgId}-${efoId}`}
          dataPath="disease.evidenceViews.europePmc"
          onDataLoaded={onDataLoaded}
          pageSize={PAGE_SIZE}
          pageSizeOptions={[5, 10, 15, 20, 25]}
          // no search on the Europe PMC view: a browser search would fetch every row
          showGlobalFilter={false}
          variables={variables}
        />
      )}
    />
  );
}

export default Body;
