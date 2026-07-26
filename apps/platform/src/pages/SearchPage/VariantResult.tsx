import { styled, useTheme } from "@mui/material/styles";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMapPin } from "@fortawesome/free-solid-svg-icons";
import { Highlights, Link, DisplayVariantId, LongText, Box, Typography } from "ui";

const StyledLink = styled(Link)({
  fontSize: "20px",
  fontWeight: 500,
});

function VariantResult({ data, highlights }) {
  const theme = useTheme();

  return (
    <div style={{ marginBottom: "30px" }}>
      <StyledLink to={`/variant/${data.id}`}>
        <FontAwesomeIcon icon={faMapPin} color={theme.palette.primary.main} />{" "}
        <DisplayVariantId
          variantId={data.id}
          referenceAllele={data.referenceAllele}
          alternateAllele={data.alternateAllele}
          expand={false}
        />
      </StyledLink>

      <Typography variant="body2" component="div">
        <LongText lineLimit={4}>{data.variantDescription}</LongText>
      </Typography>
      {data.rsIds.length > 0 && (
        <Typography variant="body2">Ensembl: {data.rsIds.join(", ")}</Typography>
      )}
      <Highlights highlights={highlights} />
    </div>
  );
}

export default VariantResult;
