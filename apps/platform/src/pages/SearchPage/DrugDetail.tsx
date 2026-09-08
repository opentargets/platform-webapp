import { CardContent, Typography } from "@mui/material";
import { ProfileChipList } from "ui";
import { styled } from "@mui/material/styles";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPrescriptionBottleAlt } from "@fortawesome/free-solid-svg-icons";
import { parseDrugLabels } from "@ot/utils";

import { LongText, Chip, Link, LongList } from "ui";

const StyledLink = styled(Link)({
  display: "block",
});

function DrugDetail({ data }) {
  return (
    <CardContent>
      <Typography color="primary" variant="h5">
        <Link to={`/drug/${data.id}`}>{data.name}</Link>
      </Typography>
      <Typography color="primary">
        <FontAwesomeIcon icon={faPrescriptionBottleAlt} /> Drug
      </Typography>
      <LongText lineLimit={4}>{data.description}</LongText>

      <Typography sx={{ fontWeight: 500 }} variant="subtitle1">
        Drug Type
      </Typography>
      <Typography variant="body2">{data.drugType}</Typography>
      <Typography sx={{ fontWeight: 500 }} variant="subtitle1">
        Maximum Clinical Stage
      </Typography>
      <Typography variant="body2">{data.maximumClinicalStage}</Typography>
      {data.indications && data.indications.rows.length > 0 && (
        <>
          <Typography sx={{ fontWeight: 500 }} variant="subtitle1">
            Indications
          </Typography>
          <LongList
            terms={data.indications.rows}
            maxTerms={5}
            render={(indication, index) => (
              <StyledLink key={index} to={`/disease/${indication.disease.id}`}>
                {indication.disease.name}
              </StyledLink>
            )}
          />
        </>
      )}
      {data.synonyms.length > 0 && (
        <ProfileChipList title="Synonyms" maxTerms={5} titleVariant="subtitle1">
          {parseDrugLabels(data.synonyms)}
        </ProfileChipList>
      )}
      {data.tradeNames.length > 0 && (
        <ProfileChipList title="Trade names" maxTerms={5} titleVariant="subtitle1">
          {parseDrugLabels(data.tradeNames)}
        </ProfileChipList>
      )}
    </CardContent>
  );
}

export default DrugDetail;
