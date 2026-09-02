import { ReactElement, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Box,
  Divider,
  Skeleton,
  styled,
  Tooltip,
  tooltipClasses,
  TooltipProps,
} from "@mui/material";
import { useLazyQuery } from "@apollo/client";
import {
  getEntityDescription,
  getEntityIcon,
  getEntityQuery,
  getQueryVariables,
} from "./utils/asyncTooltipUtil";
import { GenomicLocationPresentationType, IGeneomicLocation, naLabel } from "@ot/constants";

import StudyPublication from "../StudyPublication";
import { OtGenomicLocation } from "../..";

const DELAY_REQUEST = 1000;

const HtmlTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: theme.palette.common.white,
    maxWidth: 400,
    // boxShadow: theme.boxShadow.default,
    cursor: "pointer",
    border: `1px solid ${theme.palette.grey[300]}`,
    borderRadius: 4,
  },

  [`& .${tooltipClasses.arrow}`]: {
    color: theme.palette.common.white,
  },

  [`& .${tooltipClasses.arrow}::before`]: {
    border: `1px solid ${theme.palette.grey[300]}`,
  },
}));

type OtAsyncTooltipProps = {
  children: ReactElement;
  entity: string;
  id: string;
};

function OtAsyncTooltip({ children, entity, id }: OtAsyncTooltipProps): ReactElement {
  const variables = getQueryVariables(entity, id);

  const query = getEntityQuery(entity);
  const [open, setOpen] = useState(false);
  const [aborterRef] = useState(new AbortController());
  const [getTooltipData, { loading, data }] = useLazyQuery(query, {
    fetchPolicy: "network-only",
    context: { fetchOptions: { signal: aborterRef.signal } },
  });

  function getTooltipContent() {
    let entityAccessor = entity;
    if (loading || !data) return <AsyncTooltipLoadingView />;
    if (entity === "credible-set") entityAccessor = "credibleSet";
    return <AsyncTooltipDataView entity={entity} data={data?.[entityAccessor]} />;
  }

  function abortApiCall() {
    aborterRef.abort();
  }

  function handleClose() {
    setOpen(false);
    abortApiCall();
  }

  function handleOpen() {
    getTooltipData({ variables });
    setOpen(true);
  }

  useEffect(() => {
    return () => {
      abortApiCall();
    };
  }, []);



  const tooltipContent = getTooltipContent();

  return (
    <HtmlTooltip
      arrow
      placement="bottom-end"
      enterDelay={DELAY_REQUEST}
      enterNextDelay={DELAY_REQUEST}
      enterTouchDelay={DELAY_REQUEST}
      open={open}
      onClose={handleClose}
      onOpen={handleOpen}
      title={tooltipContent}
    >
      {children}
    </HtmlTooltip>
  );
}

function AsyncTooltipLoadingView(): ReactElement {
  return (
    <Box sx={{ width: 300 }}>
      <Box>
        <Skeleton />
        <Skeleton />
      </Box>
      <Skeleton />
      <Skeleton />
    </Box>
  );
}

type TooltipData = {
  id?: string;
  name?: string;
  description?: string | string[];
  mostSevereConsequence?: { label?: string };
  publicationFirstAuthor?: string;
  publicationDate?: string;
  publicationJournal?: string;
  genomicLocation?: IGeneomicLocation;
};

function AsyncTooltipDataView({
  entity,
  data,
}: {
  entity: string;
  data: TooltipData;
}): ReactElement {
  const showSubText = !!(data?.mostSevereConsequence?.label || data?.publicationFirstAuthor);

  const hasGeneLoc = entity === "target" && data?.genomicLocation?.chromosome;

  function getSubtext() {
    let finalSubText;

    // variant subtext
    const mostSevereConsequence = data?.mostSevereConsequence?.label;
    if (mostSevereConsequence) finalSubText = `Most severe consequence: ${mostSevereConsequence}`;

    // study subtext
    const publicationData = data?.publicationFirstAuthor;
    if (publicationData)
      finalSubText = (
        <StudyPublication
          publicationDate={data?.publicationDate || ""}
          publicationFirstAuthor={data?.publicationFirstAuthor || ""}
          publicationJournal={data?.publicationJournal || ""}
        />
      );

    return finalSubText;
  }

  function getLabel() {
    if (entity === "credible-set") return "Credible set";
    return data?.name || data?.id || naLabel;
  }

  return (
    <Box sx={{ p: 1 }}>
      <Box
        sx={{
          p: 1,
          py: 0,
          fontSize: "0.7rem",
          color: theme => theme.palette.grey[700],
          textDecoration: "underline",
        }}
      >
        {`${entity}/${data?.id}`}
      </Box>
      <Box sx={{ display: "flex", gap: 1, py: 1 }}>
        <Box sx={{ p: 1, color: theme => theme.palette.primary.main }}>
          <FontAwesomeIcon size="2x" icon={getEntityIcon(entity)}></FontAwesomeIcon>
        </Box>
        <Box sx={{ pt: 0.4, flex: 1 }}>
          <Box
            sx={{
              typography: "subtitle2",
              color: theme => theme.palette.grey[900],
              textTransform: "capitalize",
              fontWeight: "bold",
            }}
          >
            {getLabel()}
          </Box>
          <Box sx={{ typography: "body2", color: theme => theme.palette.grey[800] }}>
            {getEntityDescription(entity, data as Record<string, unknown>)}
          </Box>
        </Box>
      </Box>
          {hasGeneLoc && (
            <Box sx={{ mt: 1, px:1, typography: "body2" }} component="span">
              <Divider />
              <OtGenomicLocation type={GenomicLocationPresentationType.PLAIN} geneLoc={data?.genomicLocation!} />
            </Box>
          )}
      {showSubText && (
        <>
          <Divider />
          <Box
            sx={{ typography: "caption", color: theme => theme.palette.grey[900], pt: 1, pl: 1 }}
          >
            {getSubtext()}
          </Box>
        </>
      )}
    </Box>
  );
}

export default OtAsyncTooltip;
