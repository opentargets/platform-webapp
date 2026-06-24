import { Suspense } from "react";
import { styled } from "@mui/material/styles";
import { SectionLoader } from "ui";
import { ENTITIES } from "../../associationsUtils";

import prioritisationColumns from "../../static_datasets/prioritisationColumns";
import targetSections from "../../../../sections/targetSections";
import evidenceSections from "../../../../sections/evidenceSections";

import { grey } from "@mui/material/colors";
import { Box } from "@mui/material";

interface ContainerProps {
  table?: string;
}

const Container = styled("div", {
  shouldForwardProp: prop => prop !== "table",
})<ContainerProps>(({ table, theme }) => ({
  paddingTop: theme.spacing(2),
  paddingBottom: theme.spacing(2),
  paddingLeft: table === "interactors" ? theme.spacing(6) : theme.spacing(3),
  paddingRight: table === "interactors" ? theme.spacing(6) : theme.spacing(3),
  background: grey[100],
}));

function LoadingSection() {
  return (
    <Box sx={{ m: 3 }}>
      <SectionLoader />
    </Box>
  );
}

function SectionNotFound() {
  return <div>Section not found</div>;
}

const getComponentConfig = (
  displayedTable: string,
  row: any,
  entity: string,
  id: string,
  section: string[]
) => {
  switch (displayedTable) {
    case "prioritisations":
      return {
        Component: targetSections.get(section[1]),
        componentId: entity === ENTITIES.DISEASE ? row.id : id,
        label: row.original.targetSymbol,
        entityOfSection: "target",
        componentProps: prioritisationColumns.find(el => el.id === section[0])?.sectionProps,
      };
    case "associations":
      return {
        Component: evidenceSections.get(section[1]),
        componentId: {
          ensgId: entity === ENTITIES.DISEASE ? row.id : id,
          efoId: entity === ENTITIES.DISEASE ? id : row.id,
        },
        label: {
          symbol: row.original.targetSymbol,
          name: row.original.diseaseName,
        },
        entityOfSection: "disease",
        componentProps: {},
      };
    default:
      return { Component: SectionNotFound };
  }
};

interface SectionRenderProps {
  id: string;
  entity: string;
  row: any;
  table: string;
  entityToGet: string;
  nameProperty: string;
  displayedTable: string;
  cols?: Array<{ id: string }>;
  section?: string[] | null;
}

export function SectionRender({
  id,
  entity,
  row,
  table,
  entityToGet,
  nameProperty,
  displayedTable,
  cols = [],
  section,
}: SectionRenderProps) {
  if (!section || !cols.some(c => c.id === section[0])) {
    return null;
  }

  const {
    Component,
    componentId,
    label = row.original[entityToGet][nameProperty],
    entityOfSection = entity,
    componentProps,
  } = getComponentConfig(displayedTable, row, entity, id, section);

  if (!Component) return <SectionNotFound />;

  return (
    <Container data-testid={`evidence-section-${section[1]}`} table={table}>
      <Component id={componentId} label={label} entity={entityOfSection} {...componentProps} />
    </Container>
  );
}

interface SectionRendererWrapperProps {
  children: React.ReactNode;
  section?: string[] | null;
}

export function SectionRendererWrapper({ children, section }: SectionRendererWrapperProps) {
  if (!section) return null;
  return <Suspense fallback={<LoadingSection />}>{children}</Suspense>;
}
