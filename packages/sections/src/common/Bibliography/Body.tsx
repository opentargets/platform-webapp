import { Component } from "react";
import { v1 } from "uuid";
import { styled } from "@mui/material/styles";
// TODO: note this component is not actually used.
// Only SimplePublication is used in evidence bibliography

import Publication from "./Publication";
import { getAggregationsData, getPublicationsData } from "./Api";
import {
  SectionItem,
  Autocomplete,
  Box,
  GridLegacy,
  TextField,
  Typography,
  MuiButton as Button,
  MuiChip as Chip,
} from "ui";
import Description from "./Description";

const aggtype = [
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

const StyledAutocomplete = styled(Autocomplete)({
  width: "15rem",
  "& .MuiFormControl-root": { marginTop: 0 },
});

const StyledChip = styled(Chip)(({ theme }) => ({
  margin: theme.spacing(0.25),
}));

const StyledFilterCategoryContainer = styled(Box)({
  display: "flex",
  "& p": {
    margin: ".2rem 1rem 0 0",
  },
});

type Props = {
  definition: Record<string, unknown>;
  id: string;
  label: string;
  entity: string;
};

class Section extends Component<Props> {
  constructor(props) {
    super(props);
    const { id, label } = props;
    const searchTerm = { key: id, label };
    this.state = {
      bibliographyCount: 0,
      isLoading: true,
      hasData: false,
      hasError: false,
      aggregations: {},
      selectedAggregation: aggtype[0],
      hits: [], // the list of papers
      selected: [searchTerm], // the selected chips (first item is the page gene or disease)
    };
  }

  componentDidMount() {
    this.mounted = true;
    this.getData();
  }

  componentDidUpdate(prevProps, prevState) {
    // If a chip has been added or removed, fetch new data
    const { selected } = this.state;
    if (selected.length !== prevState.selected.length) {
      this.getData();
    }
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  // Handler for drop down menu
  aggtypeFilterHandler = (e, selection) => {
    this.setState({ selectedAggregation: selection });
  };

  // Parse the aggregation data based on defined aggtypes
  // and filter out all entries that are already selected
  filterAggregations = aggs => {
    const { selected } = this.state;
    return aggtype.reduce((newaggs, agg) => {
      const newAggregationObject = { ...newaggs };
      newAggregationObject[agg.value] = {
        buckets: aggs[agg.value].buckets.filter(
          b =>
            selected.filter(a => {
              const selectedNewAggregationObject = a;
              selectedNewAggregationObject.label = a.label || a.key;
              return (
                selectedNewAggregationObject.key.toString().toLowerCase() ===
                  b.key.toString().toLowerCase() ||
                selectedNewAggregationObject.label.toString().toLowerCase() ===
                  b.key.toString().toLowerCase()
              );
            }).length === 0
        ),
      };
      return newAggregationObject;
    }, {});
  };

  // Get the data for the chips
  getAggregations = () => {
    const { selected } = this.state;
    getAggregationsData(selected).then(
      resp => {
        if (this.mounted) {
          this.setState({
            bibliographyCount: resp.hits.total,
            hasData: resp.hits.total > 0,
            aggregations: this.filterAggregations(resp.aggregations),
          });
        }
      },
      () => {
        if (this.mounted) {
          this.setState({
            aggregations: {},
            hasError: true,
          });
        }
      }
    );
  };

  // Get the data for the publications
  getPublications = append => {
    this.setState({ isLoading: true });
    const { hits } = this.state;
    const last = hits[hits.length - 1];
    const after = append ? last.sort[0] : undefined;
    const afterId = append ? last._id : undefined;
    const { selected } = this.state;

    getPublicationsData(selected, after, afterId).then(
      resp => {
        const { state: stateHits } = this.state;
        // if loading more data (after & afterId) append that, if not just reset hits
        const newHits = after && afterId ? stateHits.concat(resp.hits.hits) : resp.hits.hits;
        if (this.mounted) {
          this.setState({ hits: newHits, isLoading: false });
        }
      },
      () => {
        if (this.mounted) {
          this.setState({ hits: [], hasError: true, isLoading: false });
        }
      }
    );
  };

  // Handler for when a chip is deselected
  deselectChip = index => {
    const { selected } = this.state;
    if (index < selected.length) {
      this.setState({ selected: selected.filter((sel, i) => i !== index) });
    }
  };

  // Handler for when a chip is selected
  selectChip = chip => {
    const { selected } = this.state;
    const newSelected = selected.concat([chip]);
    this.setState({ selected: newSelected });
  };

  // We make 2 calls: one for chips and one for papers
  // This is because aggregations can be computationally demanding (e.g. for neoplasm) and fail.
  // By splitting the call we always have some papers to show
  getData = () => {
    // get aggregation data for chips
    this.getAggregations();
    // get papers
    this.getPublications();
  };

  render() {
    const {
      bibliographyCount,
      aggregations,
      selectedAggregation,
      hits,
      selected,
      isLoading,
      hasError,
      hasData,
    } = this.state;
    const { definition, label } = this.props;

    return (
      <SectionItem
        definition={definition}
        request={{ loading: isLoading, error: hasError, data: hasData }}
        renderDescription={() => <Description label={label} />}
        renderBody={() => (
          <GridLegacy
            container
            direction="column"
            justifyContent="flex-start"
            alignItems="stretch"
            spacing={2}
          >
            <GridLegacy item xs={12}>
              <StyledFilterCategoryContainer>
                <Typography>Tag category:</Typography>
                {/* Dropdown menu */}
                <StyledAutocomplete
                  disableClearable
                  getOptionLabel={option => option.label}
                  getOptionSelected={option => option.value}
                  onChange={this.aggtypeFilterHandler}
                  options={aggtype}
                  renderInput={params => (
                    // eslint-disable-next-line
                    <TextField {...params} margin="normal" />
                  )}
                  value={selectedAggregation}
                />
              </StyledFilterCategoryContainer>
              {/* Chips */}
              <Box>
                {selected.length > 1 ? (
                  selected.map((sel, i) =>
                    i > 0 ? (
                      <StyledChip
                        key={v1()}
                        color="primary"
                        label={sel.label || sel.key}
                        onDelete={() => this.deselectChip(i)}
                      />
                    ) : null
                  )
                ) : (
                  <Typography sx={{ margin: ".375rem 0" }}>
                    No tags selected, please select from below
                  </Typography>
                )}
              </Box>
              <Box>
                {aggregations[selectedAggregation.value]
                  ? aggregations[selectedAggregation.value].buckets.map((agg, i) => (
                      <StyledChip
                        key={v1()}
                        variant="outlined"
                        label={agg.label || agg.key}
                        onClick={() => this.selectChip(agg)}
                      />
                    ))
                  : null}
              </Box>
            </GridLegacy>

            <GridLegacy item xs={12}>
              {/* Total result */}
              <Typography variant="body2" sx={{ marginBottom: "2rem" }}>
                Showing {Math.min(hits.length, bibliographyCount)} of {bibliographyCount} results
              </Typography>

              {/* Publications */}
              <GridLegacy
                container
                direction="column"
                justifyContent="flex-start"
                alignItems="stretch"
                spacing={2}
              >
                {hits.map((hitItem, i) => (
                  <GridLegacy item xs={12} key={hitItem._source.pub_id}>
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
                  </GridLegacy>
                ))}
              </GridLegacy>
            </GridLegacy>

            {/* Load more, if any */}
            {hits.length < bibliographyCount ? (
              <GridLegacy item xs={12}>
                <Button
                  variant="contained"
                  size="medium"
                  color="primary"
                  disableElevation
                  onClick={() => {
                    this.getPublications(true);
                  }}
                >
                  Load more papers
                </Button>
              </GridLegacy>
            ) : null}
          </GridLegacy>
        )}
      />
    );
  }
}

export default Section;
