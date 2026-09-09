import { useStateValue, useActions } from "./Context";
import { VARIANT_CONSEQUENCES, DATASOURCES } from "@ot/constants";
import { useState, useEffect } from "react";
import { FacetsSelect, Autocomplete, Box, TextField, Slider, Typography } from "ui";

function VariantFilter() {
  const { state } = useStateValue();
  const { setVariant } = useActions();

  function handleChange(event) {
    setVariant(event.target.value);
  }

  return (
    <TextField
      label="Variant ID"
      variant="outlined"
      value={state.variant}
      onChange={handleChange}
      size="small"
    />
  );
}

function ConsequenceFilter() {
  const { setConsequence } = useActions();

  function handleChange(event, value) {
    setConsequence(value);
  }

  return (
    <Autocomplete
      multiple
      onChange={handleChange}
      options={VARIANT_CONSEQUENCES.filter(c => c.proteinCoding)}
      getOptionLabel={option => option.label}
      sx={{ width: 200 }}
      renderInput={params => <TextField {...params} label="Variant consequences" />}
      size="small"
      isOptionEqualToValue={(option, value) => option.id === value.id}
      // renderValue={(value, getItemProps) => <Chip label={value} {...getItemProps()} />}
    />
  );
}

function EvidenceFilter() {
  const { setEvidence } = useActions();

  function handleChange(event, value) {
    setEvidence(value);
  }

  return (
    <Autocomplete
      multiple
      onChange={handleChange}
      options={DATASOURCES}
      getOptionLabel={option => option.datasourceNiceName}
      sx={{ width: 200 }}
      renderInput={params => <TextField {...params} label="Evidence" />}
      size="small"
      isOptionEqualToValue={(option, value) => option.datasourceId === value.datasourceId}
      // renderValue={(value, getItemProps) => <Chip label={value} {...getItemProps()} />}
    />
  );
}

function StartPositionFilter() {
  const { state } = useStateValue();
  const [structureLength, setStructureLength] = useState(null);

  // fetch structure length
  useEffect(() => {
    async function fetchStructureLength() {
      if (!state.uniprotId) return;
      let response;
      try {
        response = await fetch(
          `https://rest.uniprot.org/uniprotkb/${state.uniprotId}.json?fields=sequence`
        );
        if (!response.ok) {
          console.error(`Failed to fetch protein length`);
          return;
        }
      } catch (error) {
        console.error(error.message);
        return;
      }
      const json = await response.json();
      setStructureLength(json.sequence.length);
    }
    fetchStructureLength();
  }, [state.uniprotId]);

  const { setStartPosition } = useActions();
  const {
    state: { data, filters },
  } = useStateValue();

  function handleChange(event, value) {
    setStartPosition({ min: value[0], max: value[1] });
  }

  const min = 0;
  const max = structureLength;

  const marks = data.proteinCodingCoordinates.rows.map(row => ({
    value: row.aminoAcidPosition,
  }));

  if (!structureLength) return null;

  return (
    <Box sx={{ width: 340 }}>
      <Typography variant="body1">Start position</Typography>
      <Box display="flex" alignItems="center" gap={1} mt={-0.3}>
        <Typography variant="body2" lineHeight={0}>
          {min}
        </Typography>
        <Slider
          min={min}
          max={max}
          step={1}
          value={[filters.startPosition.min, filters.startPosition.max]}
          onChange={handleChange}
          size="small"
          sx={{
            "& .MuiSlider-mark": {
              backgroundColor: "red",
              opacity: 0.5,
              height: 10,
              width: 1.1,
            },
          }}
          marks={marks}
          valueLabelDisplay="auto"
        />
        <Typography variant="body2" lineHeight={0}>
          {max}
        </Typography>
      </Box>
    </Box>
  );
}

function TherapeuticAreas() {
  return (
    <FacetsSelect
      id="id"
      hideLegend
      hideActive
      entityToGet="disease"
      // parentState={}
      onFacetSelect={newState => {
        console.log(newState);
      }}
    />
  );
}

function Filters() {
  return (
    <Box display="flex" gap={2}>
      <VariantFilter />
      <ConsequenceFilter />
      <EvidenceFilter />
      <TherapeuticAreas />
      <StartPositionFilter />
    </Box>
  );
}
export default Filters;
