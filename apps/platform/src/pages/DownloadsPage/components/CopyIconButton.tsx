import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faCopy } from "@fortawesome/free-solid-svg-icons";
import { Box, Tooltip } from "ui";
import { RADIUS } from "./tokens";

interface CopyIconButtonProps {
  textToCopy: string;
  label?: string;
  size?: number;
}

/**
 * The 24×24 copy affordance used by CopyField and AccessScriptBlock. Same
 * clipboard call as `ui/CopyToClipboard`, but feedback is an inline "Copied"
 * tooltip instead of a page-level snackbar, which would sit behind the drawer.
 */
function CopyIconButton({ textToCopy, label = "Copy", size = 24 }: CopyIconButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
    } catch {
      /* clipboard blocked - nothing to show */
    }
  };

  return (
    <Tooltip title={copied ? "Copied" : label} arrow open={copied || undefined}>
      <Box
        component="button"
        type="button"
        onClick={copy}
        aria-label={label}
        sx={theme => ({
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "none",
          width: size,
          height: size,
          padding: 0,
          cursor: "pointer",
          backgroundColor: "#fff",
          border: `1px solid ${theme.palette.grey[300]}`,
          borderRadius: RADIUS,
          color: copied ? theme.palette.primary.dark : theme.palette.grey[700],
          fontSize: 12,
          "&:hover": { borderColor: theme.palette.grey[500] },
        })}
      >
        <FontAwesomeIcon icon={copied ? faCheck : faCopy} />
      </Box>
    </Tooltip>
  );
}

export default CopyIconButton;
