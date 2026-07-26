import { Stack, ThemeProvider, Typography } from "@mui/material";
import { theme } from "@ot/config";
import {
  BtnGroup,
  Button,
  ButtonNoBorder,
  ButtonPrimary,
  Chip,
  ChipList,
  LabelChip,
  LongText,
  NewChip,
  Tooltip,
} from "ui";

function GroupLabel({ children }: { children: string }) {
  return (
    <Typography variant="subtitle2" sx={{ color: "text.secondary", mb: 1 }}>
      {children}
    </Typography>
  );
}

function ButtonsShowcase() {
  return (
    <Stack spacing={3}>
      <div>
        <GroupLabel>Button — outlined (default)</GroupLabel>
        <Stack direction="row" spacing={2}>
          <Button variant="outlined">Outlined</Button>
          <Button variant="contained">Contained</Button>
          <Button variant="text">Text</Button>
        </Stack>
      </div>
      <div>
        <GroupLabel>ButtonPrimary — filled brand color</GroupLabel>
        <ButtonPrimary variant="contained">Save changes</ButtonPrimary>
      </div>
      <div>
        <GroupLabel>ButtonNoBorder — border hidden until hover (AOTF toolbar triggers)</GroupLabel>
        <ButtonNoBorder variant="outlined">Advanced filters</ButtonNoBorder>
      </div>
      <div>
        <GroupLabel>BtnGroup — tab-like switcher over arbitrary content</GroupLabel>
        <BtnGroup
          btnGroup={{
            table: { title: "Table", component: <Typography variant="body2">Table view</Typography> },
            chart: { title: "Chart", component: <Typography variant="body2">Chart view</Typography> },
          }}
        />
      </div>
    </Stack>
  );
}

function ChipsShowcase() {
  return (
    <Stack spacing={3}>
      <div>
        <GroupLabel>Chip — outlined/small default, full MUI ChipProps</GroupLabel>
        <Stack direction="row" spacing={1}>
          <Chip label="Default" />
          <Chip label="Clickable" clickable onClick={() => {}} />
          <Chip label="Filled medium" variant="filled" size="medium" color="primary" />
        </Stack>
      </div>
      <div>
        <GroupLabel>ChipList — horizontal list, each chip optionally linked + tooltipped</GroupLabel>
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
        <GroupLabel>LabelChip — label/value pair with optional link</GroupLabel>
        <LabelChip label="VEP" value="Missense variant" to="https://www.ensembl.org/info/genome/variation/prediction/predicted_data.html" />
      </div>
      <div>
        <GroupLabel>NewChip — small "new" badge</GroupLabel>
        <NewChip className="" />
      </div>
    </Stack>
  );
}

function TextTooltipsShowcase() {
  return (
    <Stack spacing={3}>
      <div>
        <GroupLabel>LongText — clamps to lineLimit, expands on click</GroupLabel>
        <div style={{ maxWidth: 420 }}>
          <LongText lineLimit={2}>
            Open Targets combines evidence from genetics, genomics, transcriptomics, drugs,
            animal models, and scientific literature to score and rank target-disease
            associations for drug target identification and prioritisation.
          </LongText>
        </div>
      </div>
      <div>
        <GroupLabel>Tooltip — themed wrapper around MUI Tooltip, optional "?" trigger</GroupLabel>
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
    </Stack>
  );
}

function UiShowcaseDemo() {
  return (
    <ThemeProvider theme={theme}>
      <Stack spacing={5} sx={{ p: 2 }}>
        <div>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Buttons
          </Typography>
          <ButtonsShowcase />
        </div>
        <div>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Chips & labels
          </Typography>
          <ChipsShowcase />
        </div>
        <div>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Text & tooltips
          </Typography>
          <TextTooltipsShowcase />
        </div>
      </Stack>
    </ThemeProvider>
  );
}

export default UiShowcaseDemo;
