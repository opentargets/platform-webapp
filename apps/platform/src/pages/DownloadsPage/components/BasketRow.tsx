import { useState } from "react";
import { Box, Typography } from "ui";
import { Link, useLocation } from "react-router";
import { DownloadRow } from "../types/downloadTypes";
import {
  getDatasetId,
  getLocationLink,
  getLocationTypes,
  LOCATION_LABELS,
  LocationType,
} from "../context/downloadsSelectors";
import CategoryDot from "./CategoryDot";
import CopyField from "./CopyField";
import { RADIUS } from "./tokens";

interface BasketRowProps {
  dataset: DownloadRow;
  locationURLs: Record<string, string>;
  onRemove: (id: string) => void;
}

const linkSx = (theme: any) => ({
  border: 0,
  padding: 0,
  background: "none",
  cursor: "pointer",
  font: "inherit",
  fontSize: ".75rem",
  color: theme.palette.primary.main,
  textDecoration: "none",
  whiteSpace: "nowrap",
  "&:hover": { textDecoration: "underline" },
});

const pickerSx = (theme: any) => ({
  flex: "none",
  height: 24,
  padding: "0 4px",
  fontFamily: "inherit",
  fontSize: ".6875rem",
  fontWeight: 500,
  color: theme.palette.grey[700],
  backgroundColor: "#fff",
  border: `1px solid ${theme.palette.grey[300]}`,
  borderRadius: RADIUS,
  cursor: "pointer",
  "&:hover": { borderColor: theme.palette.grey[500] },
});

/** The dropdown of every location a dataset is published in; a plain label when there is only one. */
function LocationPicker({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: LocationType[];
  value: LocationType;
  onChange: (location: LocationType) => void;
}) {
  if (options.length < 2) {
    return (
      <Box component="span" sx={theme => ({ ...pickerSx(theme), display: "inline-flex", alignItems: "center", cursor: "default" })}>
        {LOCATION_LABELS[value]}
      </Box>
    );
  }
  return (
    <Box
      component="select"
      value={value}
      onChange={e => onChange(e.target.value as LocationType)}
      aria-label={`${name} file location`}
      sx={pickerSx}
    >
      {options.map(location => (
        <option key={location} value={location}>
          {LOCATION_LABELS[location]}
        </option>
      ))}
    </Box>
  );
}

/** One basket item: its category, name, Schema and Remove links, and its file location to copy. */
function BasketRow({ dataset, locationURLs, onRemove }: BasketRowProps) {
  const id = getDatasetId(dataset);
  const { search } = useLocation();
  const category = dataset.categories?.[0];
  const locations = getLocationTypes(dataset);
  const [location, setLocation] = useState<LocationType>(locations[0]);
  // the default (GCP-first) location if the picked one is no longer published
  const shown = locations.includes(location) ? location : locations[0];

  return (
    <Box
      component="li"
      sx={theme => ({
        display: "flex",
        flexDirection: "column",
        gap: 0.75,
        padding: "10px 20px",
        borderBottom: `1px solid ${theme.palette.grey[200]}`,
        listStyle: "none",
      })}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
        {category && <CategoryDot category={category} />}
        <Typography
          component="span"
          sx={theme => ({
            flex: 1,
            minWidth: 0,
            fontSize: ".875rem",
            fontWeight: 500,
            color: theme.palette.grey[800],
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          })}
          title={dataset.name}
        >
          {dataset.name}
        </Typography>
        <Box component={Link} to={{ pathname: `/downloads/${id}/schema`, search }} sx={linkSx}>
          Schema
        </Box>
        <Box
          component="button"
          type="button"
          onClick={() => onRemove(id)}
          aria-label={`Remove ${dataset.name} from basket`}
          sx={linkSx}
        >
          Remove
        </Box>
      </Box>
      <CopyField
        value={getLocationLink(dataset, locationURLs, shown)}
        label={`Copy ${dataset.name} ${LOCATION_LABELS[shown]} file location`}
        leading={<LocationPicker name={dataset.name} options={locations} value={shown} onChange={setLocation} />}
      />
    </Box>
  );
}

export default BasketRow;
