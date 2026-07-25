import { Grid, LinearProgress, Skeleton, Typography } from "@mui/material";
import { scroller } from "react-scroll";

import {
  StyledAvatar,
  StyledCard,
  StyledCardHeader,
  StyledSubheader,
  StyledSubtitle,
  StyledTitle,
} from "./SummaryItem.styles";
import { createShortName } from "./utils";
import PartnerLockIcon from "../PartnerLockIcon";

function SummaryItem<T>({ definition, request, subText }: { definition: any; request: { loading: boolean; error?: any; data: T }; subText?: React.ReactNode }) {
  const { loading, error, data } = request;
  const shortName = createShortName(definition);
  const hasData = !loading && !error && data && definition.hasData(data);

  const handleClickSection = () => {
    scroller.scrollTo(definition.id, {
      duration: 500,
      delay: 100,
      smooth: true,
    });
  };

  return (
    <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
      <StyledCard
        data-testid={`summary-${definition.id.toLowerCase().replace(/_/g, "")}`}
        hasData={hasData}
        onClick={handleClickSection}
        elevation={0}
        variant="outlined"
      >
        <StyledCardHeader
          avatar={
            <StyledAvatar hasData={hasData} error={!!error}>
              {shortName}
            </StyledAvatar>
          }
          title={
            <>
              <StyledTitle hasData={hasData} error={!!error} variant="body2">
                {loading && <Skeleton width={100} />}
                {!loading && definition.name} {definition.isPrivate ? <PartnerLockIcon /> : null}
              </StyledTitle>
              {subText ? (
                <StyledSubtitle hasData={hasData} variant="caption">
                  {subText}
                </StyledSubtitle>
              ) : null}

              <StyledSubheader>
                {error && (
                  <Typography variant="body2">
                    An error occurred while loading this section
                  </Typography>
                )}
              </StyledSubheader>
            </>
          }
        />
        {loading && <LinearProgress />}
      </StyledCard>
    </Grid>
  );
}

export default SummaryItem;
