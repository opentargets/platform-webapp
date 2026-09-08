import { CardContent, Typography } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMapPin } from "@fortawesome/free-solid-svg-icons";
import { Link, DisplayVariantId, LongText } from "ui";

function VariantDetail({ data }) {
  return (
    <CardContent>
      <Typography
        color="primary"
        variant="h5"
        sx={{
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        <Link to={`/variant/${data.id}`}>
          <DisplayVariantId
            variantId={data.id}
            referenceAllele={data.referenceAllele}
            alternateAllele={data.alternateAllele}
            expand={false}
          />
        </Link>
      </Typography>
      <Typography color="primary">
        <FontAwesomeIcon icon={faMapPin} /> Variant
      </Typography>
      <LongText lineLimit={4}>{data.variantDescription}</LongText>
      {data.rsIds.length > 0 && (
        <>
          <Typography variant="subtitle1">Ensembl</Typography>
          <Typography variant="body2">{data.rsIds.join(", ")}</Typography>
        </>
      )}
      <Typography variant="subtitle1">GRCh38</Typography>
      <Typography variant="body2">
        {data.chromosome}:{data.position}
      </Typography>
      <Typography variant="subtitle1">Reference Allele</Typography>
      <Typography component="div" variant="body2">
        <LongText lineLimit={2}>
          <span style={{ textWrap: "wrap", wordWrap: "break-word" }}>{data.referenceAllele}</span>
        </LongText>
      </Typography>
      <Typography variant="subtitle1">Alternate Allele</Typography>
      <Typography component="div" variant="body2">
        <LongText lineLimit={2}>
          <span style={{ textWrap: "wrap", wordWrap: "break-word" }}>{data.alternateAllele}</span>
        </LongText>
      </Typography>
      {data.mostSevereConsequence && (
        <>
          <Typography variant="subtitle1">Most Severe Consequence</Typography>
          <Typography variant="body2">
            {data.mostSevereConsequence.label.replace(/_/g, " ")}
          </Typography>
        </>
      )}
    </CardContent>
  );
}

export default VariantDetail;
