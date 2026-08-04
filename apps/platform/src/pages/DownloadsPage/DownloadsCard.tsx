import { Box, Button, Card, CardActions, CardContent, Chip, Tooltip, Typography } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCode, faDatabase, faDiagramProject } from "@fortawesome/free-solid-svg-icons";
import { OtLongText } from "ui";
import { v1 } from "uuid";
import { DownloadsContext } from "./context/DownloadsContext";
import { useContext } from "react";
import { setActiveFilter } from "./context/downloadsActions";
import { Link } from "react-router-dom";
import { getCategoryColor, tintHex } from "./categoryColors";

/** Shared by both card-action buttons so Schema and Access Data always match in width and height */
const cardActionButtonSx = { gap: 1, minHeight: 40,  "& .MuiButton-startIcon": { margin: 0 } };

interface DownloadsCardProps {
  data: Record<string, unknown>;
  /** Number of schema relationships this dataset has - shown as a link into the graph view */
  connections?: number;
  /** Called with the dataset's (RecordSet) id when the connections link is clicked */
  onViewConnections?: (id: string) => void;
  /** True while this card's matching node is hovered in the network pane */
  highlighted?: boolean;
  /** Called on mouse enter/leave so the matching network node can be raised */
  onHoverChange?: (hovering: boolean) => void;
}

function DownloadsCard({
  data,
  connections,
  onViewConnections,
  highlighted = false,
  onHoverChange,
}: DownloadsCardProps) {
  const { state, dispatch } = useContext(DownloadsContext);
  const columnId = data["@id"].replace("-fileset", "");

  function handleChangeFilter(e) {
    const currentFilters = [...state.selectedFilters];
    if (currentFilters.includes(e.target.innerText)) {
      return;
    } else {
      currentFilters.push(e.target.innerText);
      dispatch(setActiveFilter(currentFilters));
    }
  }

  function hasCategories() {
    if (Object.hasOwnProperty.call(data, "categories") && data.categories.length ) return true;
    return false;
  }

  const highlightColor = hasCategories() ? getCategoryColor(data.categories[0]) : undefined;

  return (
    <Card
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxShadow: "none",
        border: theme =>
          `1px solid ${highlighted ? highlightColor || theme.palette.primary.main : theme.palette.grey[300]}`,
        transition: "border-color 120ms ease",
        ...(highlighted && {
          boxShadow: theme =>
            `0 0 0 2px ${tintHex(highlightColor || theme.palette.primary.main, 0.35)}`,
        }),
        "&:hover": {
          boxShadow: theme => theme.boxShadow.lg,
        },
      }}
    >
      <CardContent
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          height: 1,
        }}
      >
        <Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "start",
              justifyContent: "space-between",
              mb: 1,
              gap: 1,
            }}
          >
            <Typography variant="h6" component="div" sx={{ fontWeight: "bold" }}>
              {data.name}
            </Typography>
          </Box>

          <OtLongText variant="body2" lineLimit={2} displayText="... more">
            {data.description}
          </OtLongText>
        </Box>

        <Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 1,
              my: 1,
            }}
          >
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {hasCategories() &&
                data.categories.map(c => (
                  <Chip
                    key={v1()}
                    size="small"
                    label={c}
                    clickable
                    onClick={handleChangeFilter}
                    sx={{
                      backgroundColor: tintHex(getCategoryColor(c), 0.12),
                      color: getCategoryColor(c),
                      border: `1px solid ${getCategoryColor(c)}`,
                      fontWeight: 500,
                    }}
                  />
                ))}
            </Box>

            {typeof connections === "number" && (
              <Tooltip
                title="Number of schema relationships to other datasets - click to view in the graph"
                arrow
              >
                <Chip
                  size="small"
                  variant="outlined"
                  clickable={Boolean(onViewConnections)}
                  onClick={() => onViewConnections?.(columnId)}
                  onMouseEnter={() => onHoverChange?.(true)}
                  onMouseLeave={() => onHoverChange?.(false)}
                  icon={<FontAwesomeIcon icon={faDiagramProject} size="xs" />}
                  label={connections}
                  sx={{
                    color: "text.secondary",
                    borderColor: theme => theme.palette.grey[300],
                    height: 24,
                    "& .MuiChip-icon": { fontSize: 11, ml: 0.75, mr: -0.25 },
                    "& .MuiChip-label": { px: 0.75 },
                  }}
                />
              </Tooltip>
            )}
          </Box>
        </Box>
      </CardContent>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          width: 1,
          pb: 3,
          px: 2,
          gap: 1,
        }}
      >
        <Link to={`/downloads/${columnId}/schema`} style={{ display: "block", width: "100%" }}>
          <Button variant="outlined" color="primary" fullWidth sx={cardActionButtonSx}>
            <FontAwesomeIcon icon={faCode} />
            Schema
          </Button>
        </Link>
        <Link to={`/downloads/${columnId}/access`} style={{ display: "block", width: "100%" }}>
          <Button variant="outlined" color="primary" fullWidth sx={cardActionButtonSx}>
            <FontAwesomeIcon icon={faDatabase} />
            Access Data
          </Button>
        </Link>
      </Box>
    </Card>
  );
}
export default DownloadsCard;
