import { faSearch } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, InputAdornment, styled, TextField } from "@mui/material";
import { useEffect, useState } from "react";
import { useDebounce } from "ui";
import { useAotfQueryState, useAotfQueryDispatch } from "../../context/AssociationsQueryContext";

const NameFilterInput = styled(TextField)(() => ({
  borderRadius: "2px",
  margin: 0,
  "& .MuiInputBase-input": {
    fontSize: "0.875rem",
  },
  "& input::placeholder": {
    color: "#000",
  },
}));

const NameFilter = () => {
  const { entityToGet, entitySearch } = useAotfQueryState();
  const { handleEntitySearch } = useAotfQueryDispatch();
  const placeHolderEntity = entityToGet === "target" ? "target" : "disease";

  const [inputValue, setInputValue] = useState(entitySearch);
  const debouncedInputValue = useDebounce(inputValue, 300);

  useEffect(() => {
    if (debouncedInputValue !== entitySearch) {
      handleEntitySearch(debouncedInputValue);
    }
  }, [debouncedInputValue]);

  useEffect(() => {
    if (entitySearch !== inputValue) setInputValue(entitySearch);
  }, [entitySearch]);

  return (
    <Box sx={{ maxWidth: { md: 240 } }}>
      <NameFilterInput
        value={inputValue}
        onChange={(event) => {
          setInputValue(event.target.value);
        }}
        size="small"
        fullWidth
        inputProps={{
          "data-testid": "name-filter-input",
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <FontAwesomeIcon icon={faSearch} size="xs" />
            </InputAdornment>
          ),
        }}
        placeholder={`Search ${placeHolderEntity}`}
      />
    </Box>
  );
};

export default NameFilter;
