import {
  Box,
  Checkbox,
  FormControlLabel,
  FormGroup,
  InputAdornment,
  Paper,
  TextField,
  Typography,
  Chip,
  Divider,
  Radio,
  RadioGroup,
} from "ui";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faTrash } from "@fortawesome/free-solid-svg-icons";

export const SORT_OPTIONS = [
  { value: "integrated_into_PPP", label: "Integrated into PPP" },
  { value: "project_name", label: "Project Name" },
  { value: "project_status", label: "Project Status" },
  { value: "open_targets_therapeutic_area", label: "Therapeutic Area" },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]["value"];

export type ProjectFilters = {
  search: string;
  sortBy: SortValue;
  project_status: string[];
  open_targets_therapeutic_area: string[];
  integration: string[];
};

export const EMPTY_FILTERS: ProjectFilters = {
  search: "",
  sortBy: "integrated_into_PPP",
  project_status: [],
  open_targets_therapeutic_area: [],
  integration: [],
};

type FilterKey = keyof Omit<ProjectFilters, "search" | "sortBy">;

type FilterGroup = {
  key: FilterKey;
  label: string;
  options: string[];
};

type Props = {
  filters: ProjectFilters;
  filterGroups: FilterGroup[];
  onChange: (filters: ProjectFilters) => void;
};

function ProjectsFilter({ filters, filterGroups, onChange }: Props) {
  function handleSearch(value: string) {
    onChange({ ...filters, search: value });
  }

  function handleCheckbox(key: FilterKey, value: string) {
    const current = filters[key];
    const next = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    onChange({ ...filters, [key]: next });
  }

  function handleClear() {
    onChange(EMPTY_FILTERS);
  }

  const hasActive =
    filters.search ||
    Object.entries(filters)
      .filter(([k]) => k !== "sortBy")
      .some(([, v]) => Array.isArray(v) && v.length > 0);

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
            fontWeight: "bold",
            mb: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          Filters
          {hasActive && (
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
              onClick={handleClear}
            />
          )}
        </Typography>

        <Box sx={{ mb: 3 }}>
          <TextField
            value={filters.search}
            onChange={e => handleSearch(e.target.value)}
            size="small"
            fullWidth
            placeholder="Search..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <FontAwesomeIcon icon={faSearch} />
                </InputAdornment>
              ),
            }}
            sx={{ "& .MuiInputBase-input": { fontSize: "0.875rem" } }}
          />
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" component="div" sx={{ fontWeight: "bold" }}>
            Sort by
          </Typography>
          <RadioGroup
            value={filters.sortBy}
            onChange={e => onChange({ ...filters, sortBy: e.target.value as SortValue })}
          >
            {SORT_OPTIONS.map(opt => (
              <FormControlLabel
                key={opt.value}
                value={opt.value}
                control={<Radio size="small" />}
                label={<Typography variant="body2">{opt.label}</Typography>}
              />
            ))}
          </RadioGroup>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {filterGroups.map(group => (
          <Box key={group.key}>
            <Typography variant="subtitle1" component="div" sx={{ fontWeight: "bold" }}>
              {group.label}
            </Typography>
            <FormGroup sx={{ mb: 1 }}>
              {group.options.map(option => (
                <FormControlLabel
                  key={option}
                  control={
                    <Checkbox
                      size="small"
                      checked={filters[group.key].includes(option)}
                      onChange={() => handleCheckbox(group.key, option)}
                    />
                  }
                  label={<Typography variant="body2">{option}</Typography>}
                />
              ))}
            </FormGroup>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}

export default ProjectsFilter;
