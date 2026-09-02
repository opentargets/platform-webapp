import { Box } from "@mui/material";
import type { ReactNode } from "react";
import CopyToClipboard from "./CopyToClipboard";

type CodeBlockPropTypes = {
  children: ReactNode;
  textToCopy?: string | null;
};

function CodeBlock({ children, textToCopy }: CodeBlockPropTypes) {
  return (
    <Box
      sx={{
        background: (theme) => theme.palette.grey[100],
        pb: textToCopy ? 3 : 1,
        borderRadius: 3,
        px: 3,
        pt: 1,
        display: "flex",
        minWidth: "100%",
        width: "fit-content",
      }}
    >
      <Box component="code" sx={{ width: 1 }}>
        {textToCopy && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "end",
              pb: 1,
              w: 1,
            }}
          >
            <CopyToClipboard textToCopy={textToCopy} />{" "}
          </Box>
        )}
        {children}
      </Box>
    </Box>
  );
}
export default CodeBlock;
