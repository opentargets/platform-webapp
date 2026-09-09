import { Box, Typography } from "ui";
import { styled } from "@mui/material/styles";

const StyledMatchInnerContainer = styled(Box)(({ theme }) => ({
  background: theme.palette.grey[200],
  marginLeft: ".5rem",
  padding: ".5rem",
  whiteSpace: "normal",
}));

const StyledMark = styled("mark", {
  shouldForwardProp: prop => prop !== "markType",
})<{ markType?: "disease" | "target" | null }>(({ theme, markType }) => ({
  ...(markType === "disease" && { backgroundColor: theme.palette.secondary.light }),
  ...(markType === "target" && { backgroundColor: theme.palette.primary.light }),
}));

function SentenceMatch({ match }) {
  const breaks = [match.dStart, match.dEnd + 1, match.tStart, match.tEnd + 1].sort((a, b) => a - b);

  const whichMatch = index => {
    if (index === match.dStart) return "disease";
    if (index === match.tStart) return "target";

    return null;
  };

  return (
    <tr>
      <td>
        <Typography variant="subtitle2">In: {match.section}</Typography>
      </td>
      <td>
        <StyledMatchInnerContainer>
          {match.text.slice(0, breaks[0])}
          <StyledMark markType={whichMatch(breaks[0])}>
            {match.text.slice(breaks[0], breaks[1])}
          </StyledMark>
          {match.text.slice(breaks[1], breaks[2])}
          <StyledMark markType={whichMatch(breaks[2])}>
            {match.text.slice(breaks[2], breaks[3])}
          </StyledMark>
          {match.text.slice(breaks[3])}
        </StyledMatchInnerContainer>
      </td>
    </tr>
  );
}

export default SentenceMatch;
