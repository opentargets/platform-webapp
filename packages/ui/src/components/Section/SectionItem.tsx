import { Box, Card, Divider, GridLegacy, Skeleton } from "@mui/material";
import { Element } from "react-scroll";

import ErrorBoundary from "../ErrorBoundary";
import SectionError from "./SectionError";
import {
  CardHeaderContainer,
  NoData,
  StyledAvatar,
  StyledCardContent,
  StyledChip,
  StyledDescription,
  StyledTitle,
} from "./SectionItem.styles";
import { createShortName } from "../Summary/utils";
import PartnerLockIcon from "../PartnerLockIcon";
import SectionViewToggle from "./SectionViewToggle";
import { AddToReportButton } from "../Report";
import { ReactNode, useState } from "react";
import { VIEW } from "@ot/constants";

type definitionType = {
  id: string;
  name: string;
  shortName?: string;
  hasData: any;
  isPrivate?: boolean;
};

type SectionItemProps = {
  definition: definitionType;
  request: Record<string, unknown>;
  renderDescription: () => ReactNode;
  renderChart?: () => ReactNode;
  renderBody: () => ReactNode;
  // check tags
  tags?: string[];
  chipText?: string;
  entity: string;
  showEmptySection?: boolean;
  // check use
  showContentLoading?: boolean;
  loadingMessage?: string;
  defaultView?: string;
};

function SectionItem({
  definition,
  request,
  renderDescription,
  renderBody,
  chipText,
  entity,
  showEmptySection = false,
  showContentLoading = false,
  loadingMessage = "Loading data. This may take some time...",
  renderChart,
  defaultView = VIEW.table,
  tags = [],
}: SectionItemProps): ReactNode {
   const { loading, error, data, variables } = request as any;
  const shortName = createShortName(definition);
  let hasData = false;
  const [selectedView, setSelectedView] = useState(defaultView);


  if (data && entity && data[entity]) {
    hasData = definition.hasData((data as any)[entity]);
  }

  if (!hasData && !showEmptySection && !loading) return null;

  function getSelectedView(): ReactNode {
    if (error) return <SectionError message={String(error)} />;
    if (showContentLoading && loading)
      return (
        <>
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            {loadingMessage}
          </Box>
          <Skeleton sx={{ height: 390 }} variant="rectangular" />
        </>
      );
    if (selectedView === VIEW.table) return renderBody();
    if (selectedView === VIEW.chart && renderChart) return renderChart();
    // if (!loading && !hasData && showEmptySection)
    return <NoData> No data available for this {entity}. </NoData>;
  }

  return (
    <GridLegacy item xs={12}>
      <section data-testid={`section-${definition.id.toLowerCase().replace(/_/g, '-')}`}>
        <div id={definition.id}>
          <Card elevation={0} variant="outlined">
            <ErrorBoundary>
              <CardHeaderContainer>
                {/* AVATAR */}
                <StyledAvatar>{shortName}</StyledAvatar>
                {/* HEADER, SUB-HEADER & CHIP */}
                <Box sx={{ flex: 1 }}>
                  <StyledTitle
                    data-testid={`section-${definition.id.toLowerCase().replace(/_/g, '-')}-header`}
                    error={!!error}
                  >
                    {definition.name}
                    {definition.isPrivate && <PartnerLockIcon />}
                    {chipText && (
                      <StyledChip sx={{ typography: "caption" }}>{chipText}</StyledChip>
                    )}
                  </StyledTitle>
                  <StyledDescription data-testid="section-description" variant="body2">
                    {renderDescription()}
                  </StyledDescription>
                </Box>
                {/* CHART VIEW SWITCH & ADD TO REPORT */}
                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  {renderChart && (
                    <SectionViewToggle defaultValue={defaultView} viewChange={setSelectedView} />
                  )}
                  <AddToReportButton
                    definition={{ ...definition, entity } as unknown as any}
                    request={{ loading, error, data, variables } as unknown as any}
                    renderedBody={renderBody}
                    renderedChart={renderChart}
                    description={renderDescription}
                    entity={entity}
                    selectedView={selectedView as unknown as "table" | "chart"}
                    tags={tags}
                    chipText={chipText}
                  />
                </Box>
              </CardHeaderContainer>
              <Divider />
              <StyledCardContent>{getSelectedView()}</StyledCardContent>
            </ErrorBoundary>
          </Card>
        </div>
      </section>
    </GridLegacy>
  );
}

export default SectionItem;
