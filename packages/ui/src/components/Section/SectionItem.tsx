import { Box, Card, Divider, GridLegacy, Skeleton } from "@mui/material";
import { VIEW } from "@ot/constants";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Element } from "react-scroll";
import ErrorBoundary from "../ErrorBoundary";
import PartnerLockIcon from "../PartnerLockIcon";
import { createShortName } from "../Summary/utils";
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
import SectionViewToggle from "./SectionViewToggle";
import { AddToReportButton } from "../AddToReportButton";
import {
  ReportComponentStateProvider,
  useReportComponentState,
} from "../../providers/ReportComponentStateContext";
import { useReportSectionContext } from "../../providers/ReportSectionContext";
import { useSectionBodyProps } from "../../providers/SectionBodyPropsContext";
import {
  getLiveCaptureKey,
  registerLiveCapture,
} from "../../providers/LiveSectionStateRegistry";

/**
 * Registers this live section's state bag so the report builder can offer
 * "Update from live page" for report sections of the same entity + section.
 * Must render inside the section's ReportComponentStateProvider.
 */
function LiveCaptureRegistrar({ captureKey }: { captureKey: string }): null {
  const reportComponentState = useReportComponentState();
  const stateRef = useRef(reportComponentState);
  stateRef.current = reportComponentState;

  useEffect(
    () => registerLiveCapture(captureKey, () => stateRef.current?.getAllState() ?? {}),
    [captureKey]
  );

  return null;
}

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

  // If we're already inside a ReportComponentStateProvider (e.g. a report section
  // being reconstructed with its saved componentState), reuse it rather than
  // shadowing it with a fresh, empty one. On a normal page there's no ancestor
  // provider, so we create one below purely to let this section's widget(s)
  // save state into, ready to be captured by "Add to Report".
  const existingReportComponentState = useReportComponentState();
  // Only set when this section is rendered inside a report (drawer / reconstruction)
  const isInReport = !!useReportSectionContext();
  const bodyProps = useSectionBodyProps();


  if (data && entity && data[entity]) {
    hasData = definition.hasData((data as any)[entity]);
  }

  if (!hasData && !showEmptySection && !loading) return null;

  const liveEntityId: string | undefined = data?.[entity]?.id;

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

  const sectionContent = (
    <GridLegacy item xs={12}>
      <section
        id={definition.id}
        data-testid={`section-${definition.id.toLowerCase().replace(/_/g, "-")}`}
      >
        <Element name={definition.id}>
          <Card elevation={0} variant="outlined">
            <ErrorBoundary>
              <CardHeaderContainer>
                {/* AVATAR */}
                <StyledAvatar>{shortName}</StyledAvatar>
                {/* HEADER, SUB-HEADER & CHIP */}
                <Box sx={{ flex: 1 }}>
                  <StyledTitle
                    data-testid={`section-${definition.id.toLowerCase().replace(/_/g, "-")}-header`}
                    error={!!error}
                  >
                    {definition.name}
                    {definition.isPrivate && <PartnerLockIcon />}
                    {chipText && <StyledChip sx={{ typography: "caption" }}>{chipText}</StyledChip>}
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
                  {!isInReport && (
                    <AddToReportButton
                      definition={{ ...definition, entity } as unknown as any}
                      request={{ loading, error, data, variables } as unknown as any}
                      entity={entity}
                      selectedView={selectedView === VIEW.chart ? "chart" : "table"}
                      tags={tags}
                      chipText={chipText}
                      bodyProps={bodyProps}
                    />
                  )}
                </Box>
              </CardHeaderContainer>
              {/* Live pages only: SectionBody may provide the state bag, so check the report context */}
              {!isInReport && liveEntityId && (
                <LiveCaptureRegistrar
                  captureKey={getLiveCaptureKey(entity, definition.id, liveEntityId)}
                />
              )}
              <Divider />
              <StyledCardContent>{getSelectedView()}</StyledCardContent>
            </ErrorBoundary>
          </Card>
        </Element>
      </section>
    </GridLegacy>
  );

  if (existingReportComponentState) {
    return sectionContent;
  }

  return <ReportComponentStateProvider>{sectionContent}</ReportComponentStateProvider>;
}

export default SectionItem;
