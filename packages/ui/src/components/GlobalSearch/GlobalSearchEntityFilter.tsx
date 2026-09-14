import { Box, Checkbox, Chip, Divider, FormControlLabel, FormGroup } from "@mui/material";
import { useContext } from "react";
import GlobalSearchIcon from "./GlobalSearchIcon";
import { defaultEntityFilterState, SearchContext } from "./SearchContext";
import { getSelectedEntityFilterLength } from "./utils/searchUtils";

const ALL = "All";

function GlobalSearchEntityFilter() {
  const { filterState, setFilterState } = useContext(SearchContext);

  function handleChangeFilter(key: string, event: React.ChangeEvent<HTMLInputElement>) {
    const newValue = event.target.checked;
    setFilterState({ ...filterState, [key]: newValue });
  }

  function onAllFilterClick() {
    setFilterState({ ...defaultEntityFilterState });
  }

  function getAllFilter() {
    if (getSelectedEntityFilterLength(filterState) === 0) return true;
    return false;
  }

  return (
    <Box>
      <FormGroup sx={{ overflowX: "auto", p: 1 }}>
        <Box sx={{ display: "flex", pr: 2 }}>
          <FormControlLabel
            label={""}
            sx={{ mr: 0 }}
            control={
              <>
                <Checkbox
                  checked={getAllFilter()}
                  role=""
                  onChange={onAllFilterClick}
                  inputProps={{ "aria-label": "controlled" }}
                  size="small"
                  icon={
                    <Chip
                      sx={{
                        borderRadius: 2,
                        fontWeight: "bold",
                        display: "flex",
                        padding: "15px 6px",
                        color: (theme) => theme.palette.grey[500],
                        ".MuiChip-icon": {
                          fontSize: "12px",
                        },
                      }}
                      size="small"
                      label={<Box sx={{ textTransform: "capitalize" }}> {ALL}</Box>}
                      variant="outlined"
                      clickable
                      tabIndex={-1}
                      icon={<GlobalSearchIcon entity={ALL} />}
                    />
                  }
                  checkedIcon={
                    <Chip
                      sx={{
                        borderRadius: 2,
                        fontWeight: "bold",
                        display: "flex",
                        padding: "15px 6px",
                        backgroundColor: (theme) => `${theme.palette.primary.light}30`,
                        ".MuiChip-icon": {
                          fontSize: "12px",
                        },
                      }}
                      color="primary"
                      size="small"
                      label={<Box sx={{ textTransform: "capitalize" }}> {ALL}</Box>}
                      variant="outlined"
                      clickable
                      tabIndex={-1}
                      icon={<GlobalSearchIcon entity={ALL} />}
                    />
                  }
                />
              </>
            }
          />
          <Box
            tabIndex="-1"
            sx={{
              width: "1px",
              borderLeft: (theme) => `1px solid ${theme.palette.grey[400]}`,
              marginY: "10px",
              paddingX: "6px",
            }}
          />

          {Object.entries(filterState).map(([key, value]) => {
            return (
              <FormControlLabel
                key={key}
                sx={{ mr: 0 }}
                control={
                  <>
                    <Checkbox
                      checked={value}
                      onChange={(e) => handleChangeFilter(key, e)}
                      inputProps={{ "aria-label": "controlled" }}
                      data-testid={`entity-filter-${key.toLowerCase()}`}
                      size="small"
                      icon={
                        <Chip
                          sx={{
                            borderRadius: 2,
                            fontWeight: "bold",
                            display: "flex",
                            padding: "15px 6px",
                            color: (theme) => theme.palette.grey[500],
                            ".MuiChip-icon": {
                              fontSize: "12px",
                            },
                          }}
                          size="small"
                          label={<Box sx={{ textTransform: "capitalize" }}> {key}</Box>}
                          variant="outlined"
                          clickable
                          tabIndex={-1}
                          icon={<GlobalSearchIcon entity={key} />}
                        />
                      }
                      checkedIcon={
                        <Chip
                          sx={{
                            borderRadius: 2,
                            fontWeight: "bold",
                            display: "flex",
                            padding: "15px 6px",
                            backgroundColor: (theme) => `${theme.palette.primary.light}30`,
                            ".MuiChip-icon": {
                              fontSize: "12px",
                            },
                          }}
                          color="primary"
                          size="small"
                          label={<Box sx={{ textTransform: "capitalize" }}> {key}</Box>}
                          variant="outlined"
                          clickable
                          tabIndex={-1}
                          icon={<GlobalSearchIcon entity={key} />}
                        />
                      }
                    />
                  </>
                }
                label={""}
              />
            );
          })}
        </Box>
      </FormGroup>
    </Box>
  );
}
export default GlobalSearchEntityFilter;
