import { styled, useTheme } from "@mui/material/styles";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDna } from "@fortawesome/free-solid-svg-icons";
import { Highlights, Link } from "ui";

import { clearDescriptionCodes } from "@ot/utils";
import TargetDescription from "../TargetPage/TargetDescription";

const StyledLink = styled(Link)({
  fontSize: "20px",
  fontWeight: 500,
});

function TargetResult({ data, highlights }) {
  const theme = useTheme();
  const targetDescription = clearDescriptionCodes(
    data.functionDescriptions,
    theme.palette.primary.main
  );

  return (
    <div style={{ marginBottom: "30px" }}>
      <StyledLink to={`/target/${data.id}/associations`}>
        <FontAwesomeIcon icon={faDna} color={theme.palette.primary.main} /> {data.approvedSymbol}
      </StyledLink>
      {data.functionDescriptions.length > 0 ? (
        <TargetDescription
          descriptions={targetDescription}
          targetId={data.id}
          showLabel={false}
          lineLimit={4}
        />
      ) : null}
      <Highlights highlights={highlights} />
    </div>
  );
}

export default TargetResult;
