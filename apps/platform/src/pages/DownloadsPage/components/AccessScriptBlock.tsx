import { useMemo } from "react";
import { Box, BtnGroup, Typography } from "ui";
import type { singleBtnGroupObj } from "ui/src/components/BtnGroup";
import { GcpLocationMemo } from "../DownloadsAccessOptions";
import {
  buildAccessScript,
  getCommonScripts,
  getSupportedScripts,
  SCRIPT_LABELS,
  SCRIPT_TYPES,
  ScriptType,
} from "../context/downloadsSelectors";
import { DownloadRow } from "../types/downloadTypes";
import CopyIconButton from "./CopyIconButton";
import { MONO_FONT, RADIUS } from "./tokens";

interface AccessScriptBlockProps {
  rows: DownloadRow[];
  locationURLs: Record<string, string>;
}

export const sectionLabelSx = (theme: any) => ({
  fontSize: ".6875rem",
  fontWeight: 600,
  letterSpacing: ".06em",
  textTransform: "uppercase" as const,
  color: theme.palette.grey[500],
});

/** The Access dialog's script tabs, generalised to every dataset in the basket. */
function AccessScriptBlock({ rows, locationURLs }: AccessScriptBlockProps) {
  const common = useMemo(() => getCommonScripts(rows), [rows]);

  // Tabs: the script types every item supports; failing that, one tab per
  // type for the subset that does, with a note about the subset.
  const tabs = useMemo(() => {
    const types: ScriptType[] = common.length
      ? common
      : SCRIPT_TYPES.filter(type => rows.some(row => getSupportedScripts(row).includes(type)));
    return types.map(type => {
      const subset = rows.filter(row => getSupportedScripts(row).includes(type));
      return { type, subset, partial: subset.length !== rows.length };
    });
  }, [common, rows]);

  if (!rows.length || !tabs.length) return null;

  const btnGroup: Record<string, singleBtnGroupObj> = Object.fromEntries(
    tabs.map(({ type, subset, partial }) => [
      type,
      {
        title: SCRIPT_LABELS[type],
        component: (
          <ScriptBody
            type={type}
            script={buildAccessScript(type, subset, locationURLs)}
            note={partial ? `${subset.length} of ${rows.length} datasets are available here` : null}
          />
        ),
      },
    ])
  );

  return (
    <Box sx={{ padding: "14px 20px 20px", display: "flex", flexDirection: "column", gap: 1 }}>
      <Typography component="h3" sx={theme => ({ ...sectionLabelSx(theme), m: 0 })}>
        Access script · all {rows.length} {rows.length === 1 ? "dataset" : "datasets"}
      </Typography>
      <Box
        sx={theme => ({
          // BtnGroup draws its own grey[400] box with a 6px radius; the spec
          // wants the divider colour and 2px here
          "& > .MuiBox-root": {
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: RADIUS,
          },
        })}
      >
        {/* BtnGroup keeps the active tab in its own state - remount when the
            tab set changes so it can never point at a tab that went away */}
        <BtnGroup key={tabs.map(t => t.type).join("|")} btnGroup={btnGroup} />
      </Box>
    </Box>
  );
}

function ScriptBody({ type, script, note }: { type: ScriptType; script: string; note: string | null }) {
  const lines = script.split("\n");
  return (
    <Box sx={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 1 }}>
      {type === "gcp" && <GcpLocationMemo />}
      {note && (
        <Typography sx={theme => ({ fontSize: ".75rem", color: theme.palette.grey[600] })}>{note}</Typography>
      )}
      <Box
        sx={theme => ({
          position: "relative",
          backgroundColor: theme.palette.grey[100],
          borderRadius: RADIUS,
          padding: "10px 40px 10px 12px",
        })}
      >
        <Box
          component="pre"
          sx={theme => ({
            m: 0,
            fontFamily: MONO_FONT,
            fontSize: ".6875rem",
            lineHeight: 1.6,
            color: theme.palette.grey[800],
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
          })}
        >
          {lines.map((line, i) => {
            const continuation = /^\s/.test(line);
            return (
              <Box
                key={`${i}-${line}`}
                component="span"
                sx={{ display: "block", pl: continuation ? 2 : 0 }}
              >
                {line.trimStart()}
              </Box>
            );
          })}
        </Box>
        <Box sx={{ position: "absolute", top: 8, right: 8 }}>
          <CopyIconButton textToCopy={script} label={`Copy ${SCRIPT_LABELS[type]} script`} />
        </Box>
      </Box>
    </Box>
  );
}

export default AccessScriptBlock;
