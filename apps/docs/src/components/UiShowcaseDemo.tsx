import { theme } from "@ot/config";
import type { ReactNode } from "react";
import {
  Box,
  BtnGroup,
  Button,
  ButtonNoBorder,
  ButtonPrimary,
  Chip,
  ChipList,
  LabelChip,
  LongText,
  NewChip,
  Stack,
  ThemeProvider,
  Tooltip,
  Typography,
} from "ui";

function ComponentLabel({ children }: { children: string }) {
  return (
    <Typography variant="monoText" display="block" sx={{ color: "text.secondary", mb: 1 }}>
      {children}
    </Typography>
  );
}

function ShowcaseCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "#d7e6f2",
        borderRadius: 0,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box sx={{ bgcolor: "#eef5fb", px: 2, py: 1 }}>
        <Typography
          variant="monoText"
          sx={{
            color: "secondary.main",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontWeight: 700,
          }}
        >
          {title}
        </Typography>
      </Box>
      <Stack spacing={3} sx={{ p: 2, flex: 1 }}>
        {children}
      </Stack>
    </Box>
  );
}

function ButtonsShowcase() {
  return (
    <ShowcaseCard title="Buttons">
      <div>
        <ComponentLabel>Button — outlined (default)</ComponentLabel>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <Button variant="outlined">Outlined</Button>
          <Button variant="contained">Contained</Button>
          <Button variant="text">Text</Button>
        </Stack>
      </div>
      <div>
        <ComponentLabel>ButtonPrimary — filled brand color</ComponentLabel>
        <ButtonPrimary variant="contained">Save changes</ButtonPrimary>
      </div>
      <div>
        <ComponentLabel>ButtonNoBorder — border hidden until hover (AOTF toolbar triggers)</ComponentLabel>
        <ButtonNoBorder variant="outlined">Advanced filters</ButtonNoBorder>
      </div>
      <div>
        <ComponentLabel>BtnGroup — tab-like switcher over arbitrary content</ComponentLabel>
        <BtnGroup
          btnGroup={{
            table: { title: "Table", component: <Typography variant="body2">Table view</Typography> },
            chart: { title: "Chart", component: <Typography variant="body2">Chart view</Typography> },
          }}
        />
      </div>
    </ShowcaseCard>
  );
}

function ChipsShowcase() {
  return (
    <ShowcaseCard title="Chips & labels">
      <div>
        <ComponentLabel>Chip — outlined/small default, full MUI ChipProps</ComponentLabel>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Chip label="Default" />
          <Chip label="Clickable" clickable onClick={() => {}} />
          <Chip label="Filled medium" variant="filled" size="medium" color="primary" />
        </Stack>
      </div>
      <div>
        <ComponentLabel>ChipList — horizontal list, each chip optionally linked + tooltipped</ComponentLabel>
        <Stack direction="row" spacing={0} flexWrap="wrap">
          <ChipList
            items={[
              { label: "GWAS", tooltip: "Genome-wide association study" },
              { label: "UniProt", url: "https://www.uniprot.org", tooltip: "External source" },
            ]}
          />
        </Stack>
      </div>
      <div>
        <ComponentLabel>LabelChip — label/value pair with optional link</ComponentLabel>
        <LabelChip label="VEP" value="Missense variant" to="https://www.ensembl.org/info/genome/variation/prediction/predicted_data.html" />
      </div>
      <div>
        <ComponentLabel>NewChip — small "new" badge (currently unused in this monorepo)</ComponentLabel>
        <NewChip className="" />
      </div>
    </ShowcaseCard>
  );
}

function TextTooltipsShowcase() {
  return (
    <ShowcaseCard title="Text & tooltips">
      <div>
        <ComponentLabel>LongText — clamps to lineLimit, expands on click</ComponentLabel>
        <Box sx={{ maxWidth: 420 }}>
          <LongText lineLimit={2}>
            Open Targets combines evidence from genetics, genomics, transcriptomics, drugs,
            animal models, and scientific literature to score and rank target-disease
            associations for drug target identification and prioritisation.
          </LongText>
        </Box>
      </div>
      <div>
        <ComponentLabel>Tooltip — themed wrapper around MUI Tooltip, optional "?" trigger</ComponentLabel>
        <Stack direction="row" spacing={3} alignItems="center">
          <Tooltip title="Hover for detail">
            <span>Hover me</span>
          </Tooltip>
          <Typography variant="body2">
            Score
            <Tooltip title="Association score, 0 to 1" showHelpIcon>
              <span />
            </Tooltip>
          </Typography>
        </Stack>
      </div>
    </ShowcaseCard>
  );
}

function UiShowcaseDemo() {
  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 3,
        }}
      >
        <ButtonsShowcase />
        <ChipsShowcase />
        <TextTooltipsShowcase />
      </Box>
    </ThemeProvider>
  );
}

export default UiShowcaseDemo;
