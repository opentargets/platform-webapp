import { useLazyQuery } from "@apollo/client";
import { faCaretDown, faCaretUp } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, Popover, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import { useState } from "react";
import { v1 } from "uuid";
import HeatmapTable from "./HeatmapTable";
import L2G_QUERY from "./Locus2GeneQuery.gql";

const PopoverContent = styled("div")({
  minWidth: "750px",
});

function L2GScoreIndicator({ score, targetId, studyLocusId }) {
  const [anchorEl, setAnchorEl] = useState(null);

  const variables = {
    studyLocusId: studyLocusId,
  };

  const [loadIndicatorData, { loading, data }] = useLazyQuery(L2G_QUERY, {
    variables: {
      studyLocusId,
    },
  });

  const handleClick = (event) => {
    loadIndicatorData();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? v1() : undefined;

  return (
    <>
      <Box
        sx={{ display: "flex", justifyContent: "end", gap: 1, cursor: "pointer" }}
        aria-describedby={id}
        onClick={handleClick}
      >
        <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
          {score.toFixed(3)}
        </Typography>
        <Box sx={{ height: 1, maxHeight: "45px" }} aria-label="Advanced options">
          {open ? <FontAwesomeIcon icon={faCaretUp} /> : <FontAwesomeIcon icon={faCaretDown} />}
        </Box>
      </Box>
      <Popover
        id={id}
        disableScrollLock
        anchorEl={anchorEl}
        onClose={handleClose}
        open={open}
        elevation={1}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        sx={{
          mt: 0.4,
        }}
      >
        {loading && (
          <PopoverContent>
            <Typography variant="body2">Loading...</Typography>
          </PopoverContent>
        )}
        {!loading && data && (
          <PopoverContent>
            <HeatmapTable
              fixedGene={targetId}
              loading={loading}
              data={data?.credibleSet.l2GPredictions}
              query={L2G_QUERY.loc.source.body}
              variables={variables}
              disabledExport
            />
          </PopoverContent>
        )}
      </Popover>
    </>
  );
}

export default L2GScoreIndicator;
