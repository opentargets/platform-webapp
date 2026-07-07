import { useState, useEffect } from "react";
import { createTheme, ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import { ThemeProvider as StylesThemeProvider } from "@mui/styles";
import { getAlphaFoldConfidence } from "@ot/constants";
import { Viewer, ViewerProvider, ViewerInteractionProvider } from "ui";

type Structure = { structureData: string; info: object };

// TP53 (P04637) — 393 residues, well-known, manageable size
const CIF_URL = "https://alphafold.ebi.ac.uk/files/AF-P04637-F1-model_v6.cif";

// createTheme fills in all MUI defaults (background.paper, grey, etc.)
// which makeStyles inside Tooltip.jsx expects to be present
const theme = createTheme({
  shape: { borderRadius: 2 },
  typography: { fontFamily: '"Inter", sans-serif' },
  palette: {
    primary: { main: "#3489ca" },
    secondary: { main: "#18405e" },
    text: { primary: "#5A5F5F" },
  },
});

function reducer<S>(state: S): S {
  return state;
}

export default function ViewerDemo() {
  const [data, setData] = useState<Structure[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");

  useEffect(() => {
    fetch(CIF_URL)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then(cif => {
        setData([{ structureData: cif, info: {} }]);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  if (status === "loading") {
    return (
      <div style={{ height: 520, display: "flex", alignItems: "center", justifyContent: "center", color: "#5A5F5F" }}>
        Loading AlphaFold structure for TP53…
      </div>
    );
  }

  if (status === "error") {
    return (
      <div style={{ height: 100, display: "flex", alignItems: "center", justifyContent: "center", color: "#ec2746" }}>
        Could not fetch structure from AlphaFold EBI.
      </div>
    );
  }

  return (
    <MuiThemeProvider theme={theme}>
      <StylesThemeProvider theme={theme}>
        <ViewerProvider initialState={{}} reducer={reducer}>
          <ViewerInteractionProvider initialState={{}} reducer={reducer}>
            <Viewer
              data={data}
              height="520px"
              drawAppearance={[
                {
                  style: {
                    cartoon: {
                      colorfunc: (atom: { b: number }) => getAlphaFoldConfidence(atom, "color"),
                      arrows: true,
                    },
                  },
                },
              ]}
            />
          </ViewerInteractionProvider>
        </ViewerProvider>
      </StylesThemeProvider>
    </MuiThemeProvider>
  );
}
