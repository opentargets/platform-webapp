import { Box, Checkbox, FormControlLabel, FormGroup, Paper, Typography, Chip } from "ui";
import { v1 } from "uuid";
import DownloadsSearchInput from "./DownloadsSearchInput";
import { DownloadsContext } from "./context/DownloadsContext";
import { useContext } from "react";
import { clearFilterData, setActiveFilter } from "./context/downloadsActions";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";

function DownloadsFilter() {
  const { state, dispatch } = useContext(DownloadsContext);

  function handleChangeFilter(item, e) {
    const currentFilters = [...state.selectedFilters];
    if (currentFilters.includes(item)) {
      currentFilters.splice(currentFilters.indexOf(item), 1);
    } else currentFilters.push(item);
    dispatch(setActiveFilter(currentFilters));
  }

  function handleClearAll() {
    dispatch(clearFilterData());
  }

  return (
    <Paper
      variant="outlined"
      elevation={0}
      sx={{ mb: 2, maxWidth: "350px", width: "100%", height: "fit-content" }}
    >
      <Box sx={{ p: 3 }}>
        <Typography
          variant="h6"
          component="div"
          sx={{
            wordBreak: "break-all",
            fontWeight: "bold",
            mb: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          Filters
          <Chip
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <FontAwesomeIcon icon={faTrash} />
                clear
              </Box>
            }
            variant="filled"
            size="small"
            clickable
            sx={{ fontWeight: "normal", typography: "caption" }}
            onClick={handleClearAll}
          />
        </Typography>
        <Box>
          <DownloadsSearchInput />
        </Box>

        <Typography variant="subtitle1" component="div" sx={{ fontWeight: "bold" }}>
          Data Categories
        </Typography>
        <FormGroup>
          {state.allUniqueCategories.map(item => (
            <FormControlLabel
              key={v1()}
              control={
                <Checkbox
                  checked={state.selectedFilters.includes(item)}
                  onChange={changeEvent => handleChangeFilter(item, changeEvent)}
                />
              }
              label={item}
            />
          ))}
        </FormGroup>
      </Box>
    </Paper>
  );
}
export default DownloadsFilter;
