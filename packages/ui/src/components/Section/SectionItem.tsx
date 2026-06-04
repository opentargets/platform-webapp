import classNames from "classnames";
import { Avatar, Box, Card, CardContent, Divider, Grid, Skeleton, Typography } from "@mui/material";

import ErrorBoundary from "../ErrorBoundary";
import SectionError from "./SectionError";
import sectionStyles from "./sectionStyles";
import { createShortName } from "../Summary/utils";
import PartnerLockIcon from "../PartnerLockIcon";
import SectionViewToggle from "./SectionViewToggle";
import { AddToReportButton } from "../Report";
import { ReactNode, useState, useEffect } from "react";
import { VIEW } from "@ot/constants";
import { registerSectionRenderer } from "../../hooks/useReportSectionRenderer";

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
  tags?: string[];
  chipText: string;
  entity: string;
  showEmptySection: boolean;
  showContentLoading: boolean;
  loadingMessage: string;
  defaultView: string;
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
  const classes = sectionStyles();
  const { loading, error, data } = request as any;
  const shortName = createShortName(definition);
  let hasData = false;
  const [selectedView, setSelectedView] = useState(defaultView);

  // Register render functions for this section so reports can re-render from storage
  // Must be before early return to follow Rules of Hooks
  useEffect(() => {
    registerSectionRenderer(definition.id, (storedDefinition, storedRequest) => ({
      renderBody,
      renderChart,
      renderDescription,
    }));
  }, [definition.id, renderBody, renderChart, renderDescription]);

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
    return <div className={classes.noData}> No data available for this {entity}. </div>;
  }

  return (
    <Grid item xs={12}>
      <section data-testid={`section-${definition.id.toLowerCase().replace(/_/g, '-')}`}>
        <div id={definition.id}>
          <Card elevation={0} variant="outlined">
            <ErrorBoundary>
              <Box className={classes.cardHeaderContainer}>
                {/* AVATAR */}
                <Avatar
                  className={classNames(classes.avatar, classes.avatarHasData, {
                    [classes.avatarError]: error,
                  })}
                >
                  {shortName}
                </Avatar>
                {/* HEADER, SUB-HEADER & CHIP */}
                <Box sx={{ flex: 1 }}>
                  <div
                    data-testid={`section-${definition.id.toLowerCase().replace(/_/g, '-')}-header`}
                    className={classNames(classes.title, classes.titleHasData, {
                      [classes.titleError]: error,
                    })}
                  >
                    {definition.name}
                    {definition.isPrivate && <PartnerLockIcon />}
                    {chipText && (
                      <Box sx={{ typography: "caption" }} className={classes.chip}>
                        {chipText}
                      </Box>
                    )}
                  </div>
                  <Typography
                    data-testid="section-description"
                    className={classNames(classes.description, classes.descriptionHasData, {
                      [classes.descriptionError]: error,
                    })}
                    variant="body2"
                  >
                    {renderDescription()}
                  </Typography>
                </Box>
                {/* CHART VIEW SWITCH & ADD TO REPORT */}
                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  {renderChart && (
                    <SectionViewToggle defaultValue={defaultView} viewChange={setSelectedView} />
                  )}
                  <AddToReportButton
                    definition={{ ...definition, entity } as unknown as any}
                    request={{ loading, error, data } as unknown as any}
                    renderedBody={renderBody}
                    renderedChart={renderChart}
                    description={renderDescription}
                    entity={entity}
                    selectedView={selectedView as unknown as "table" | "chart"}
                    tags={tags}
                    chipText={chipText}
                  />
                </Box>
              </Box>
              <Divider />
              <CardContent className={classes.cardContent}>{getSelectedView()}</CardContent>
            </ErrorBoundary>
          </Card>
        </div>
      </section>
    </Grid>
  );
}

export default SectionItem;
