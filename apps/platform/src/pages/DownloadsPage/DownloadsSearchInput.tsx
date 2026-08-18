import { faSearch } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, InputAdornment, TextField } from "ui";
import { styled } from "@mui/material/styles";
import { useContext } from "react";
import { DownloadsContext } from "./context/DownloadsContext";
import { textSearch } from "./context/downloadsActions";

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

interface DownloadsSearchInputProps {
  sx?: object;
}

function DownloadsSearchInput({ sx = {} }: DownloadsSearchInputProps) {
  const { state, dispatch } = useContext(DownloadsContext);

  return (
    <Box sx={sx}>
      <NameFilterInput
        value={state.freeTextQuery}
        onChange={event => {
          dispatch(textSearch(event.target.value));
        }}
        size="small"
        fullWidth
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <FontAwesomeIcon icon={faSearch} />
            </InputAdornment>
          ),
        }}
        placeholder={`Search...`}
      />
    </Box>
  );
}
export default DownloadsSearchInput;
