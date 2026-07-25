import { Box, Card, Divider, Grid, Skeleton } from "@mui/material";
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
import { ReactNode, useEffect, useState } from "react";
import { VIEW } from "@ot/constants";
import { SummaryLoader } from "../PublicationsDrawer";

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
}: SectionItemProps): ReactNode {
  const { loading, error, data } = request;
  const shortName = createShortName(definition);
  let hasData = false;
  const [selectedView, setSelectedView] = useState(defaultView);
  const [showDelayLoadingMessage, setShowDelayLoadingMessage] = useState(false);

  // TODO: refactor to avoid re-renders

  // useEffect(() => {
  //   const delayLoaderTimer = setTimeout(() => setShowDelayLoadingMessage(true), 5000);

  //   return () => {
  //     clearTimeout(delayLoaderTimer);
  //   };
  // }, []);

  if (data && entity && data[entity]) {
    hasData = definition.hasData(data[entity]);
  }

  if (!hasData && !showEmptySection && !loading) return null;

  function getSelectedView(): ReactNode {
    if (error) return <SectionError error={error} />;
    if (showContentLoading && loading)
      return (
        <>
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            {showDelayLoadingMessage && loadingMessage}
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
    <Grid item xs={12}>
      <section data-testid={`section-${definition.id.toLowerCase().replace(/_/g, '-')}`}>
        <Element name={definition.id}>
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
                {/* CHART VIEW SWITCH */}
                <Box>
                  {renderChart && (
                    <SectionViewToggle defaultValue={defaultView} viewChange={setSelectedView} />
                  )}
                </Box>
              </CardHeaderContainer>
              <Divider />
              <StyledCardContent>{getSelectedView()}</StyledCardContent>
            </ErrorBoundary>
          </Card>
        </Element>
      </section>
    </Grid>
  );
}

export default SectionItem;
