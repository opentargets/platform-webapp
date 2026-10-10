import React, { useCallback, useMemo } from "react";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Collapse,
  FormControlLabel,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons";
import type { Report } from "../../../core";
import type {
  BlockExportOverride,
  DeepPartial,
  ExportDocument,
  ExportPlan,
  ExportSettings,
  ExportWarning,
  PaperSettings,
  PaperUnit,
} from "../types";
import { BlockRoleRow } from "./BlockRoleRow";
import { PagePreview, pageGeometry, usePaperPages } from "./PagePreview";
import { monoLabelSx } from "./SlidesMappingStep";
import { widgetAvatarText } from "./nodeMeta";
import type { MappedTarget } from "./useExportFlow";

const PREVIEW_SCALE = 0.5;
const EMPTY: ExportWarning[] = [];

const toggleGroupSx = {
  "& .MuiToggleButton-root": { textTransform: "none", fontSize: 12, py: 0.25, px: 1.25 },
} as const;

type PaperFlag = "abstract" | "numberFigures" | "methodsAppendix" | "dataAvailability" | "wideFiguresSpan";

interface PaperMappingStepProps {
  report: Report;
  doc: ExportDocument;
  plan: ExportPlan;
  settings: ExportSettings;
  warningsByNode: Map<string, ExportWarning[]>;
  blocksOpen: boolean;
  onBlocksOpenChange: (open: boolean) => void;
  updateSettings: (patch: DeepPartial<ExportSettings>) => void;
  setOverride: (target: MappedTarget, nodeId: string, patch: DeepPartial<BlockExportOverride> | undefined) => void;
  onRetry: () => void;
  retrying: boolean;
}

export const PaperMappingStep: React.FC<PaperMappingStepProps> = ({
  report,
  doc,
  plan,
  settings,
  warningsByNode,
  blocksOpen,
  onBlocksOpenChange,
  updateSettings,
  setOverride,
  onRetry,
  retrying,
}) => {
  const theme = useTheme();
  const isNarrow = useMediaQuery(theme.breakpoints.down("md"));
  const { paper } = settings;
  const units = plan.units as PaperUnit[];
  const { pageSize, columns } = paper;
  const geometry = useMemo(() => pageGeometry({ pageSize, columns }), [pageSize, columns]);
  const { pages, measurer } = usePaperPages(units, geometry);

  const setPaper = (patch: Partial<PaperSettings>) => updateSettings({ paper: patch });

  const onOverride = useCallback(
    (nodeId: string, patch: DeepPartial<BlockExportOverride> | undefined) => setOverride("paper", nodeId, patch),
    [setOverride]
  );

  const spansByNode = useMemo(() => {
    const out: Record<string, boolean> = {};
    plan.units.forEach((u) => {
      if (u.kind === "paperFigure" || u.kind === "paperTable") out[u.nodeId] = u.span;
    });
    return out;
  }, [plan]);

  const avatars = useMemo(() => {
    const out: Record<string, string | undefined> = {};
    doc.nodes.forEach((n) => {
      out[n.id] = widgetAvatarText(report, n.id);
    });
    return out;
  }, [doc, report]);

  const flag = (key: PaperFlag, label: string, disabled = false) => (
    <FormControlLabel
      key={key}
      disabled={disabled}
      control={<Checkbox size="small" checked={paper[key]} onChange={(e) => setPaper({ [key]: e.target.checked })} />}
      label={<Typography sx={{ fontSize: 13 }}>{label}</Typography>}
      sx={{ ml: 0, my: -0.25 }}
    />
  );

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: isNarrow ? "minmax(0,1fr)" : "300px minmax(0,1fr)",
        gridTemplateRows: isNarrow ? "auto auto" : "minmax(0,1fr)",
        flex: 1,
        height: isNarrow ? "auto" : "100%",
        minHeight: 0,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {measurer}

      {/* Left: settings */}
      <Box
        sx={{
          borderRight: isNarrow ? 0 : "1px solid",
          borderBottom: isNarrow ? "1px solid" : 0,
          borderColor: "grey.300",
          bgcolor: "grey.50",
          overflowY: "auto",
          minHeight: 0,
          p: 2,
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
        }}
      >
        <Box>
          <Box sx={{ ...monoLabelSx, mb: 1 }}>Layout</Box>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={paper.columns}
              onChange={(_, v: 1 | 2 | null) => v && setPaper({ columns: v })}
              sx={toggleGroupSx}
            >
              <ToggleButton value={2}>Two column</ToggleButton>
              <ToggleButton value={1}>One column</ToggleButton>
            </ToggleButtonGroup>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={paper.pageSize}
              onChange={(_, v: PaperSettings["pageSize"] | null) => v && setPaper({ pageSize: v })}
              sx={toggleGroupSx}
            >
              <ToggleButton value="A4">A4</ToggleButton>
              <ToggleButton value="Letter">Letter</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>

        <Box>
          <Box sx={{ ...monoLabelSx, mb: 0.5 }}>Structure</Box>
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            {flag("abstract", "Title & abstract")}
            {flag("numberFigures", "Number figures")}
            {flag("methodsAppendix", "Methods")}
            {flag("dataAvailability", "Data availability")}
            {flag("wideFiguresSpan", "Wide figures span", paper.columns === 1)}
          </Box>
        </Box>

        <Box>
          <Box sx={{ ...monoLabelSx, mb: 0.75 }}>References</Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
            <Typography sx={{ fontSize: 13, mr: 0.5 }}>
              {plan.references.length} reference{plan.references.length === 1 ? "" : "s"}
            </Typography>
            {(["vancouver", "apa"] as const).map((style) => (
              <Chip
                key={style}
                size="small"
                label={style === "apa" ? "APA" : "Vancouver"}
                color={paper.citationStyle === style ? "primary" : "default"}
                variant={paper.citationStyle === style ? "filled" : "outlined"}
                onClick={() => setPaper({ citationStyle: style })}
              />
            ))}
          </Box>
        </Box>

        <Box>
          <Button
            size="small"
            onClick={() => onBlocksOpenChange(!blocksOpen)}
            aria-expanded={blocksOpen}
            endIcon={<FontAwesomeIcon icon={blocksOpen ? faChevronUp : faChevronDown} size="xs" />}
            sx={{ ...monoLabelSx, px: 0, minWidth: 0 }}
          >
            Blocks ({doc.nodes.length})
          </Button>
          <Collapse in={blocksOpen} unmountOnExit>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 1 }}>
              {doc.nodes.map((node) => (
                <BlockRoleRow
                  key={node.id}
                  target="paper"
                  node={node}
                  effective={plan.roles[node.id]}
                  override={settings.overrides[node.id]?.paper}
                  warnings={warningsByNode.get(node.id) ?? EMPTY}
                  avatarText={avatars[node.id]}
                  twoColumn={paper.columns === 2}
                  spans={spansByNode[node.id]}
                  onOverride={onOverride}
                  onRetry={onRetry}
                  retrying={retrying}
                />
              ))}
            </Box>
          </Collapse>
        </Box>
      </Box>

      {/* Right: paginated preview */}
      <Box sx={{ display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0 }}>
        <Box sx={{ px: 2, py: 1, borderBottom: "1px solid", borderColor: "grey.300" }}>
          <Box sx={monoLabelSx}>
            Preview · {pages.length} page{pages.length === 1 ? "" : "s"}
          </Box>
        </Box>
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            bgcolor: "grey.100",
            p: 2,
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
            justifyContent: "center",
            alignContent: "flex-start",
          }}
        >
          {pages.map((pageUnits, i) => (
            <PagePreview
              key={pageUnits[0]?.id ?? i}
              units={pageUnits}
              geometry={geometry}
              pageNumber={i + 1}
              pageCount={pages.length}
              scale={PREVIEW_SCALE}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default PaperMappingStep;
