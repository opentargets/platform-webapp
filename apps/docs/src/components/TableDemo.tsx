import { createTheme, ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import { ThemeProvider as StylesThemeProvider } from "@mui/styles";
import { DataTable } from "ui";

const theme = createTheme({
  shape: { borderRadius: 2 },
  typography: { fontFamily: '"Inter", sans-serif' },
  palette: {
    primary: { main: "#3489ca" },
    secondary: { main: "#18405e" },
    text: { primary: "#5A5F5F" },
  },
});

const columns = [
  { id: "target", label: "Target", sortable: true },
  { id: "disease", label: "Disease", sortable: true },
  {
    id: "score",
    label: "Score",
    numeric: true,
    sortable: true,
    renderCell: (row: { score: number }) => row.score.toFixed(3),
  },
  { id: "dataType", label: "Data type", sortable: true },
  { id: "sources", label: "Sources", numeric: true, sortable: true },
];

const rows = [
  {
    target: "BRCA2",
    disease: "Breast carcinoma",
    score: 0.921,
    dataType: "Genetic association",
    sources: 7,
  },
  {
    target: "EGFR",
    disease: "Lung adenocarcinoma",
    score: 0.887,
    dataType: "Somatic mutation",
    sources: 9,
  },
  {
    target: "TP53",
    disease: "Colorectal carcinoma",
    score: 0.874,
    dataType: "Somatic mutation",
    sources: 11,
  },
  { target: "BRAF", disease: "Melanoma", score: 0.862, dataType: "Somatic mutation", sources: 8 },
  {
    target: "KRAS",
    disease: "Pancreatic carcinoma",
    score: 0.845,
    dataType: "Somatic mutation",
    sources: 6,
  },
  {
    target: "PTEN",
    disease: "Glioblastoma",
    score: 0.831,
    dataType: "Genetic association",
    sources: 5,
  },
  {
    target: "APC",
    disease: "Colorectal carcinoma",
    score: 0.817,
    dataType: "Somatic mutation",
    sources: 7,
  },
  {
    target: "MYC",
    disease: "Diffuse large B-cell lymphoma",
    score: 0.798,
    dataType: "Affected pathway",
    sources: 4,
  },
  {
    target: "VEGFA",
    disease: "Ovarian carcinoma",
    score: 0.779,
    dataType: "Known drug",
    sources: 3,
  },
  {
    target: "HER2",
    disease: "Gastric carcinoma",
    score: 0.762,
    dataType: "Known drug",
    sources: 6,
  },
  {
    target: "CDKN2A",
    disease: "Lung squamous cell carcinoma",
    score: 0.741,
    dataType: "Somatic mutation",
    sources: 5,
  },
  {
    target: "RB1",
    disease: "Retinoblastoma",
    score: 0.728,
    dataType: "Genetic association",
    sources: 4,
  },
  {
    target: "PIK3CA",
    disease: "Cervical carcinoma",
    score: 0.714,
    dataType: "Somatic mutation",
    sources: 7,
  },
  {
    target: "NRAS",
    disease: "Thyroid gland carcinoma",
    score: 0.696,
    dataType: "Somatic mutation",
    sources: 3,
  },
  { target: "IDH1", disease: "Glioma", score: 0.683, dataType: "Known drug", sources: 5 },
  {
    target: "FGFR2",
    disease: "Endometrial carcinoma",
    score: 0.671,
    dataType: "Genetic association",
    sources: 4,
  },
  { target: "ALK", disease: "Neuroblastoma", score: 0.659, dataType: "Known drug", sources: 6 },
  {
    target: "MET",
    disease: "Papillary renal cell carcinoma",
    score: 0.644,
    dataType: "Genetic association",
    sources: 3,
  },
  { target: "CDK4", disease: "Liposarcoma", score: 0.628, dataType: "Known drug", sources: 4 },
  {
    target: "SMAD4",
    disease: "Pancreatic carcinoma",
    score: 0.611,
    dataType: "Somatic mutation",
    sources: 5,
  },
];

export default function TableDemo() {
  return (
    <MuiThemeProvider theme={theme}>
      <StylesThemeProvider theme={theme}>
        <DataTable
          columns={columns}
          rows={rows}
          sortBy="score"
          order="desc"
          showGlobalFilter
          pageSize={10}
          hover
        />
      </StylesThemeProvider>
    </MuiThemeProvider>
  );
}
