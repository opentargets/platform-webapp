import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@apollo/client";
import { SectionItem, Link, OtTableServer, Skeleton } from "ui";

import Description from "./Description";
import { europePmcLiteratureQuery } from "@ot/utils";
import { dataTypesMap, naLabel, type EvidenceBodyProps } from "@ot/constants";
import Publication from "./Publication";
import EUROPE_PMC_QUERY from "./sectionQuery.gql";
import { definition } from ".";

// Europe PMC REST details of a publication, keyed by its id (row.literature[0])
type LiteratureById = Record<string, Record<string, any>>;

const getColumns = (label, literatureById: LiteratureById) => [
  {
    id: "disease",
    label: "Disease/phenotype",
    renderCell: ({ disease }) => (
      <Link asyncTooltip to={`/disease/${disease.id}`}>
        {disease.name}
      </Link>
    ),
    filterValue: ({ disease }) => disease.name,
  },
  {
    id: "publicationDetails",
    propertyPath: "title",
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
    renderCell: ({ literature }) => literatureById[literature[0]]?.pubYear || naLabel,
  },
  {
    id: "resourceScore",
    label: "Score",
    numeric: true,
  },
];

// the publication title, PMC id and year come from the Europe PMC REST API,
// not the Open Targets API, so the download only has the Open Targets fields
const exportColumns = [
  {
    label: "Disease/phenotype",
    exportValue: row => row.disease.name,
  },
  {
    label: "europePmcId",
    exportValue: row => row.literature[0],
  },
  {
    label: "Score",
    exportValue: row => row.resourceScore,
  },
];

type Props = EvidenceBodyProps;

const PAGE_SIZE = 5;

function Body({ id, label, entity }: Props) {
  const { ensgId, efoId } = id;
  const variables = { ensemblId: ensgId, efoId };
  const [literatureById, setLiteratureById] = useState<LiteratureById>({});
  const [pageIds, setPageIds] = useState<string[]>([]);

  // first page only: drives the section loading/error state, the table fetches
  // the same page from the Apollo cache and then paginates on its own
  const request = useQuery(EUROPE_PMC_QUERY, {
    variables: { ...variables, index: 0, size: PAGE_SIZE },
  });

  const onDataLoaded = useCallback(data => {
    setPageIds(data?.disease?.europePmc.rows.map(row => row.literature[0]) ?? []);
  }, []);

  // Europe PMC details for the publications of the current page only
  useEffect(() => {
    const missingIds = pageIds.filter(pmid => !literatureById[pmid]);
    if (!missingIds.length) return;
    let isCurrent = true;

    async function fetchLiterature() {
      let entries = [];
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
        <OtTableServer
          query={EUROPE_PMC_QUERY}
          columns={columns}
          dataDownloader
          dataDownloaderColumns={exportColumns}
          dataDownloaderFileStem={`europepmc-${ensgId}-${efoId}`}
          dataPath="disease.europePmc"
          onDataLoaded={onDataLoaded}
          pageSize={PAGE_SIZE}
          pageSizeOptions={[5, 10, 15, 20, 25]}
          showGlobalFilter={false}
          variables={variables}
        />
      )}
    />
  );
}

export default Body;
