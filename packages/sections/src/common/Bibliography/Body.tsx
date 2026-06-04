import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Autocomplete, Box, Button, Chip, Grid, TextField, Typography } from "@mui/material";
// TODO: note this component is not actually used.
// Only SimplePublication is used in evidence bibliography

import Publication from "./Publication";
import { getAggregationsData, getPublicationsData } from "./Api";
import { SectionItem, useReportSectionContext, registerSectionComponent } from "ui";
import Description from "./Description";
import { definition } from ".";

interface ChipData {
  key: string;
  label: string;
}

interface AggregationType {
  value: string;
  label: string;
}

interface Author {
  LastName: string;
  Initials: string;
}

interface Journal {
  title: string;
  date: string;
  ref: string;
}

interface HitItem {
  _source: {
    pub_id: string;
    title: string;
    authors?: Author[];
    journal: {
      title: string;
    };
    pub_date: string;
    journal_reference: string;
    abstract?: string;
  };
  _id: string;
  sort: number[];
}

interface Aggregations {
  [key: string]: {
    buckets: ChipData[];
  };
}

interface BodyProps {
  id: string;
  label: string;
  definition: string;
}

const AGG_TYPES: AggregationType[] = [
  { value: "top_chunks_significant_terms", label: "Concepts" },
  { value: "genes", label: "Genes" },
  { value: "diseases", label: "Diseases" },
  { value: "drugs", label: "Drugs" },
  { value: "journal_abbr_significant_terms", label: "Journal" },
  { value: "authors_significant_terms", label: "Authors" },
  // the following are also valid aggregation types in Link but we currently don't use them:
  // {value: 'phenotypes', label: 'Phenotypes'}, // phenotypes don't return any hits at the moment
  // {value: 'pub_date_histogram', label: 'publication date'}
];

const styles = {
  filterCategoryContainer: {
    display: "flex",
    "& p": {
      margin: ".2rem 1rem 0 0",
    },
  },
  aggtypeAutocomplete: {
    width: "15rem",
    "& .MuiFormControl-root": { marginTop: 0 },
  },
  chip: {
    margin: 0.25,
  },
  noTagsSelected: {
    margin: ".375rem 0",
  },
  resultCount: {
    marginBottom: "2rem",
  },
};

const Body: FC<BodyProps> = ({ id, label, definition }) => {
  const reportContext = useReportSectionContext();
  const contextId = reportContext?.entityId || id;
  const contextLabel = reportContext?.entityLabel || label;

  const initialSearchTerm: ChipData = { key: contextId, label: contextLabel };

  const [bibliographyCount, setBibliographyCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [aggregations, setAggregations] = useState<Aggregations>({});
  const [selectedAggregation, setSelectedAggregation] = useState<AggregationType>(AGG_TYPES[0]);
  const [hits, setHits] = useState<HitItem[]>([]);
  const [selected, setSelected] = useState<ChipData[]>([initialSearchTerm]);

  // Parse the aggregation data based on defined aggtypes
  // and filter out all entries that are already selected
  const filterAggregations = useCallback(
    (aggs: Aggregations): Aggregations => {
      return AGG_TYPES.reduce<Aggregations>((newaggs, agg) => {
        const newAggregationObject = { ...newaggs };
        newAggregationObject[agg.value] = {
          buckets: (aggs[agg.value]?.buckets || []).filter(
            b =>
              !selected.some(a => {
                const label = a.label || a.key;
                return (
                  a.key.toString().toLowerCase() === b.key.toString().toLowerCase() ||
                  label.toString().toLowerCase() === b.key.toString().toLowerCase()
                );
              })
          ),
        };
        return newAggregationObject;
      }, {});
    },
    [selected]
  );

  // Get the data for the chips
  const getAggregations = useCallback(async (): Promise<void> => {
    try {
      const resp = await getAggregationsData(selected);
      setBibliographyCount(resp.hits.total);
      setHasData(resp.hits.total > 0);
      setAggregations(filterAggregations(resp.aggregations));
    } catch (error) {
      setAggregations({});
      setHasError(true);
    }
  }, [selected, filterAggregations]);

  // Get the data for the publications
  const getPublications = useCallback(
    async (append: boolean = false): Promise<void> => {
      setIsLoading(true);
      try {
        const last = hits[hits.length - 1];
        const after = append ? last?.sort[0] : undefined;
        const afterId = append ? last?._id : undefined;

        const resp = await getPublicationsData(selected, after, afterId);
        // if loading more data (after & afterId) append that, if not just reset hits
        const newHits = after && afterId ? hits.concat(resp.hits.hits) : resp.hits.hits;
        setHits(newHits);
        setIsLoading(false);
      } catch (error) {
        setHits([]);
        setHasError(true);
        setIsLoading(false);
      }
    },
    [selected, hits]
  );

  // We make 2 calls: one for chips and one for papers
  // This is because aggregations can be computationally demanding (e.g. for neoplasm) and fail.
  // By splitting the call we always have some papers to show
  const getData = useCallback(async (): Promise<void> => {
    await Promise.all([getAggregations(), getPublications()]);
  }, [getAggregations, getPublications]);

  // Initial data load
  useEffect(() => {
    getData();
  }, []);

  // Refetch data when selected chips change
  useEffect(() => {
    getData();
  }, [selected.length]);

  const handleAggregationChange = useCallback(
    (_e: unknown, newValue: AggregationType | null) => {
      if (newValue) {
        setSelectedAggregation(newValue);
      }
    },
    []
  );

  const handleDeselectChip = useCallback((index: number) => {
    setSelected(prev => {
      if (index < prev.length) {
        return prev.filter((_, i) => i !== index);
      }
      return prev;
    });
  }, []);

  const handleSelectChip = useCallback((chip: ChipData) => {
    setSelected(prev => [...prev, chip]);
  }, []);

  const handleLoadMore = useCallback(() => {
    getPublications(true);
  }, [getPublications]);

  const currentAggregationBuckets = useMemo(
    () => aggregations[selectedAggregation.value]?.buckets || [],
    [aggregations, selectedAggregation]
  );

  return (
    <SectionItem
      definition={definition}
      request={{ loading: isLoading, error: hasError, data: hasData }}
      renderDescription={() => <Description label={label} />}
      renderBody={() => (
        <Grid
          container
          direction="column"
          justifyContent="flex-start"
          alignItems="stretch"
          spacing={2}
        >
          <Grid item xs={12}>
            <Box sx={styles.filterCategoryContainer}>
              <Typography>Tag category:</Typography>
              {/* Dropdown menu */}
              <Autocomplete
                disableClearable
                getOptionLabel={option => option.label}
                isOptionEqualToValue={(option, value) => option.value === value.value}
                onChange={handleAggregationChange}
                options={AGG_TYPES}
                renderInput={params => <TextField {...params} margin="normal" />}
                value={selectedAggregation}
                sx={styles.aggtypeAutocomplete}
              />
            </Box>
            {/* Chips */}
            <Box>
              {selected.length > 1 ? (
                selected.map((sel, i) =>
                  i > 0 ? (
                    <Chip
                      key={uuidv4()}
                      color="primary"
                      label={sel.label || sel.key}
                      onDelete={() => handleDeselectChip(i)}
                      sx={styles.chip}
                    />
                  ) : null
                )
              ) : (
                <Typography sx={styles.noTagsSelected}>
                  No tags selected, please select from below
                </Typography>
              )}
            </Box>
            <Box>
              {currentAggregationBuckets.map(agg => (
                <Chip
                  key={uuidv4()}
                  variant="outlined"
                  label={agg.label || agg.key}
                  onClick={() => handleSelectChip(agg)}
                  sx={styles.chip}
                />
              ))}
            </Box>
          </Grid>

          <Grid item xs={12}>
            {/* Total result */}
            <Typography variant="body2" sx={styles.resultCount}>
              Showing {Math.min(hits.length, bibliographyCount)} of {bibliographyCount} results
            </Typography>

            {/* Publications */}
            <Grid
              container
              direction="column"
              justifyContent="flex-start"
              alignItems="stretch"
              spacing={2}
            >
              {hits.map(hitItem => (
                <Grid item xs={12} key={hitItem._source.pub_id}>
                  <Publication
                    pmId={hitItem._source.pub_id}
                    title={hitItem._source.title}
                    authors={
                      (hitItem._source.authors || []).map(a => ({
                        lastName: a.LastName,
                        initials: a.Initials,
                      })) || []
                    }
                    journal={{
                      title: hitItem._source.journal.title,
                      date: hitItem._source.pub_date,
                      ref: hitItem._source.journal_reference,
                    }}
                    hasAbstract={hitItem._source.abstract}
                  />
                </Grid>
              ))}
            </Grid>
          </Grid>

          {/* Load more, if any */}
          {hits.length < bibliographyCount && (
            <Grid item xs={12}>
              <Button
                variant="contained"
                size="medium"
                color="primary"
                disableElevation
                onClick={handleLoadMore}
              >
                Load more papers
              </Button>
            </Grid>
          )}
        </Grid>
      )}
    />
  );
};

// Register at module level
registerSectionComponent(definition.id, Body, definition);

export default Body;
