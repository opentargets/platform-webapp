import { CardHeader, GridLegacy, LinearProgress, Skeleton } from "@mui/material";
import { useNavigate } from "react-router";
import { scroller } from "react-scroll";
import PartnerLockIcon from "../PartnerLockIcon";
import { SCROLL_OFFSET } from "../Section/scrollOffset";
import {
  StyledAvatar,
  StyledCard,
  StyledSubheader,
  StyledSubtitle,
  StyledTitle,
} from "./SummaryItem.styles";
import { createShortName } from "./utils";

function SummaryItem<T>({
  definition,
  request,
  subText,
}: {
  definition: any;
  request: { loading: boolean; error?: any; data: T };
  subText?: React.ReactNode;
}) {
  const { loading, error, data } = request;
  const shortName = createShortName(definition);
  const hasData = !loading && !error && data && definition.hasData(data);
  const navigate = useNavigate();

  const handleClickSection = () => {
    scroller.scrollTo(definition.id, {
      duration: 500,
      delay: 100,
      smooth: true,
      offset: SCROLL_OFFSET,
    });
    navigate({ hash: `#${definition.id}` }, { replace: true, preventScrollReset: true });
  };

  return (
    <GridLegacy item xs={12} sm={6} md={4} lg={3} xl={2}>
      <StyledCard
        data-testid={`summary-${definition.id.toLowerCase().replace(/_/g, "")}`}
        hasData={hasData}
        onClick={handleClickSection}
        elevation={0}
        variant="outlined"
      >
        <CardHeader
          avatar={
            <StyledAvatar className="summaryItemAvatar" hasData={hasData} error={!!error}>
              {shortName}
            </StyledAvatar>
          }
          title={
            <>
              <StyledTitle
                className="summaryItemTitle"
                hasData={hasData}
                error={!!error}
                variant="body2"
              >
                {loading && <Skeleton width={100} />}
                {!loading && definition.name} {definition.isPrivate ? <PartnerLockIcon /> : null}
              </StyledTitle>
              {subText ? (
                <StyledSubtitle className="summaryItemSubtitle" hasData={hasData} variant="caption">
                  {subText}
                </StyledSubtitle>
              ) : null}

              <StyledSubheader className="summaryItemSubheader">
                {error && "An error occurred while loading this section"}
              </StyledSubheader>
            </>
          }
        />
        {loading && <LinearProgress />}
      </StyledCard>
    </GridLegacy>
  );
}

export default SummaryItem;
