import { faDna, faStethoscope } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Card, CardContent, CardHeader, Skeleton, Typography } from "@mui/material";
import {
  Link,
  usePlatformApi,
  ProfileDescription,
  ProfileHeader as BaseProfileHeader,
  ProfileChipList,
} from "ui";

import { makeStyles } from "@mui/styles";

const useStyles = makeStyles(theme => ({
  card: { height: "100%" },
  cardContent: {
    borderTop: `1px solid ${theme.palette.grey[300]}`,
  },
}));

/**
 * Disease synonyms are organized by "relation", each with a list of "terms".
 * The same term can appear under different relations.
 */
const parseSynonyms = diseaseSynonyms => {
  const t = [];
  diseaseSynonyms.forEach(s => {
    s.terms.forEach(syn => {
      const thisSyn = t.find(tItem => tItem.label === syn);
      if (!thisSyn) {
        // if the synonyms is not already in the list, we add it
        t.push({ label: syn, tooltip: [s.relation] });
      } else {
        // if it already exist, just add the relation to it
        // (i.e. it will have multiple relations)
        thisSyn.tooltip.push(s.relation);
      }
    });
  });
  // convert the tooltip array to a string for display in the Tooltip component
  t.map(tItem => {
    const syn = tItem;
    syn.tooltip = tItem.tooltip.join(", ");
    return syn;
  });
  return t;
};

function ProfileHeader() {
  const classes = useStyles();
  const { loading, error, data } = usePlatformApi();

  // TODO: Errors!
  if (error) return null;

  const { id: efoId, name, description: diseaseDescription } = data?.disease || {};
  const targetDescription = data?.target.functionDescriptions?.[0];

  const diseaseSynonyms = parseSynonyms(data?.disease.synonyms || []);

  const { id: ensgId, approvedSymbol } = data?.target || {};

  const targetSynonyms = data?.target?.synonyms?.reduce((accumulator, synonymous) => {
    if (accumulator.find(x => x.label === synonymous.label)) {
      return accumulator;
    }
    accumulator.push({
      ...synonymous,
      tooltip: synonymous.label,
    });
    return accumulator;
  }, []);

  return (
    <BaseProfileHeader>
      {loading ? (
        <Skeleton variant="rect" height="15rem" />
      ) : (
        <Card className={classes.card} elevation={0}>
          <CardHeader
            title={
              <Typography variant="h5">
                <Link to={`/target/${ensgId}`}>
                  <FontAwesomeIcon icon={faDna} /> {approvedSymbol}
                </Link>
              </Typography>
            }
          />
          <CardContent className={classes.cardContent}>
            <ProfileDescription>{targetDescription}</ProfileDescription>
            <ProfileChipList title="Synonyms">{targetSynonyms}</ProfileChipList>
          </CardContent>
        </Card>
      )}
      {loading ? (
        <Skeleton variant="rect" height="15rem" />
      ) : (
        <Card className={classes.card} elevation={0}>
          <CardHeader
            title={
              <Typography variant="h5">
                <Link to={`/disease/${efoId}`}>
                  <FontAwesomeIcon icon={faStethoscope} /> {name}
                </Link>
              </Typography>
            }
          />
          <CardContent className={classes.cardContent}>
            <ProfileDescription>{diseaseDescription}</ProfileDescription>
            {diseaseSynonyms.length > 0 ? (
              <ProfileChipList title="Synonyms">{diseaseSynonyms}</ProfileChipList>
            ) : null}
          </CardContent>
        </Card>
      )}
    </BaseProfileHeader>
  );
}

export default ProfileHeader;
