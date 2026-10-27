import { Box } from "ui";
import CopyIconButton from "./CopyIconButton";
import { MONO_FONT, RADIUS } from "./tokens";

interface CopyFieldProps {
  value: string;
  label?: string;
}

/** A read-only mono value (a path, an id) on a grey field with a copy button at its right. */
function CopyField({ value, label = "Copy file location" }: CopyFieldProps) {
  return (
    <Box
      sx={theme => ({
        display: "flex",
        alignItems: "center",
        gap: 1,
        padding: "6px 6px 6px 10px",
        borderRadius: RADIUS,
        backgroundColor: theme.palette.grey[100],
        minWidth: 0,
      })}
    >
      <Box
        component="code"
        title={value}
        sx={theme => ({
          flex: 1,
          minWidth: 0,
          fontFamily: MONO_FONT,
          fontSize: ".6875rem",
          color: theme.palette.grey[800],
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        })}
      >
        {value}
      </Box>
      <CopyIconButton textToCopy={value} label={label} />
    </Box>
  );
}

export default CopyField;
