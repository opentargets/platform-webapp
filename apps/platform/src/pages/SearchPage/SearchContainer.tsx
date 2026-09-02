import {
  Grid,
  Card,
  Typography,
  Checkbox,
  FormGroup,
  FormControlLabel,
  TablePagination,
  Box,
} from "@mui/material";
import { makeStyles } from "@mui/styles";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartBar,
  faDna,
  faMapPin,
  faPrescriptionBottleAlt,
  faStethoscope,
} from "@fortawesome/free-solid-svg-icons";
import { ErrorBoundary, BrokenSearchIcon, Link } from "ui";

import DiseaseDetail from "./DiseaseDetail";
import DiseaseResult from "./DiseaseResult";
import DrugDetail from "./DrugDetail";
import DrugResult from "./DrugResult";
import TargetDetail from "./TargetDetail";
import TargetResult from "./TargetResult";
import VariantDetail from "./VariantDetail";
import VariantResult from "./VariantResult";
import StudyResult from "./StudyResult";
import { grey } from "@mui/material/colors";

const getCounts = entities => {
  const counts = {
    target: 0,
    disease: 0,
    variant: 0,
    drug: 0,
    study: 0,
  };

  entities.forEach(entity => {
    counts[entity.name] = entity.total;
  });

  return counts;
};

const useStyles = makeStyles(theme => ({
  label: {
    marginLeft: "-6px",
  },
  labelIcon: {
    color: theme.palette.primary.main,
    marginRight: "2px",
  },
}));

const SearchFilters = ({ entities, entitiesCount, setEntity }) => {
  const counts = getCounts(entitiesCount);
  const classes = useStyles();

  return (
    <>
      <FormControlLabel
        className={classes.label}
        control={<Checkbox checked={entities.includes("target")} onChange={setEntity("target")} />}
        label={
          <>
            <FontAwesomeIcon icon={faDna} fixedWidth className={classes.labelIcon} />
            <Typography variant="body2" display="inline">
              Target ({counts.target})
            </Typography>
          </>
        }
      />
      <FormControlLabel
        className={classes.label}
        control={
          <Checkbox checked={entities.includes("variant")} onChange={setEntity("variant")} />
        }
        label={
          <>
            <FontAwesomeIcon icon={faMapPin} fixedWidth className={classes.labelIcon} />
            <Typography variant="body2" display="inline">
              Variant ({counts.variant})
            </Typography>
          </>
        }
      />
      <FormControlLabel
        className={classes.label}
        control={<Checkbox checked={entities.includes("study")} onChange={setEntity("study")} />}
        label={
          <>
            <FontAwesomeIcon icon={faChartBar} fixedWidth className={classes.labelIcon} />
            <Typography variant="body2" display="inline">
              Study ({counts.study})
            </Typography>
          </>
        }
      />
      <FormControlLabel
        className={classes.label}
        control={
          <Checkbox checked={entities.includes("disease")} onChange={setEntity("disease")} />
        }
        label={
          <>
            <FontAwesomeIcon icon={faStethoscope} fixedWidth className={classes.labelIcon} />
            <Typography variant="body2" display="inline">
              Disease or phenotype ({counts.disease})
            </Typography>
          </>
        }
      />
      <FormControlLabel
        className={classes.label}
        control={<Checkbox checked={entities.includes("drug")} onChange={setEntity("drug")} />}
        label={
          <>
            <FontAwesomeIcon
              icon={faPrescriptionBottleAlt}
              fixedWidth
              className={classes.labelIcon}
            />
            <Typography variant="body2" display="inline">
              Drug ({counts.drug})
            </Typography>
          </>
        }
      />
    </>
  );
};

function SearchResults({ results, page, onPageChange }) {
  const TYPE_NAME = "__typename";
  return (
    <Box>
      <TablePagination
        component="div"
        rowsPerPageOptions={[]}
        rowsPerPage={10}
        count={results.total}
        page={page - 1}
        onPageChange={onPageChange}
      />
      {results.hits.map(({ highlights, object }) => {
        if (object[TYPE_NAME] === "Target")
          return <TargetResult key={object.id} data={object} highlights={highlights} />;
        if (object[TYPE_NAME] === "Disease")
          return <DiseaseResult key={object.id} data={object} highlights={highlights} />;
        if (object[TYPE_NAME] === "Variant")
          return <VariantResult key={object.id} data={object} highlights={highlights} />;
        if (object[TYPE_NAME] === "Study")
          return <StudyResult key={object.id} data={object} highlights={highlights} />;
        return <DrugResult key={object.id} data={object} highlights={highlights} />;
      })}

      <TablePagination
        component="div"
        rowsPerPageOptions={[]}
        rowsPerPage={10}
        count={results.total}
        page={page - 1}
        onPageChange={onPageChange}
      />
    </Box>
  );
}

function TopHitDetail({ topHit }) {
  let COMPONENT = null;
  const TYPE_NAME = "__typename";
  if (topHit[TYPE_NAME] === "Target") COMPONENT = <TargetDetail data={topHit} />;
  else if (topHit[TYPE_NAME] === "Disease") COMPONENT = <DiseaseDetail data={topHit} />;
  else if (topHit[TYPE_NAME] === "Variant") COMPONENT = <VariantDetail data={topHit} />;
  else if (topHit[TYPE_NAME] === "Drug") COMPONENT = <DrugDetail data={topHit} />;
  return (
    <Card elevation={0}>
      <ErrorBoundary>{COMPONENT}</ErrorBoundary>
    </Card>
  );
}
function NoResultsContainer({ q }) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "left",
        mb: 10,
      }}
    >
      <Box sx={{ fontSize: "5em", mb: 5 }}>
        <BrokenSearchIcon color={grey[400]} />
      </Box>
      <Box sx={{ typography: "h6", textAlign: "left", mb: 5 }}>
        We could not find a match in the Platform for {" "}
        <strong> &quot;{q}&quot;</strong>
      </Box>
      <Box sx={{ typography: "body2", textAlign: "left", mt: 2 }}>
        Note that you can only search for: targets, diseases/phenotypes, drugs, variants, or studies.
        <br />
        <br />
        You could try:
        <ul>
          <li>Checking for any accidentally misspelt terms</li>
          <li>Broadening your search by using more general terms</li>
          <li>Searching for a therapeutic area and refining from there</li>
        </ul>
        <br />
        You can refer to our{" "}
        <Link external to="https://platform-docs.opentargets.org">
          Documentation
        </Link>{" "}
        to see how best to find the term you are looking for.
        <br />
        <br/>
        If you think we are missing a term, please get in touch on the{" "}
        <Link external to="https://community.opentargets.org">
          Open Targets Community
        </Link>
        .
      </Box>
    </Box>
  );
}

function SearchContainer({ q, page, entities, data, onPageChange, onSetEntity }) {
  const { entities: entitiesCount } = data.search.aggregations;
  const topHit = data.topHit.hits[0]?.object;

  return (
    <>
      <Typography variant="h5" gutterBottom>
        {data.search.total} results for &quot;<strong>{q}</strong>&quot;
      </Typography>
      <Grid container spacing={2} sx={{ display: "flex", height: "100%" }}>
        <Grid item md={3}>
          <Typography variant="body2">Refine by:</Typography>
          <FormGroup>
            <SearchFilters
              entities={entities}
              entitiesCount={entitiesCount}
              setEntity={onSetEntity}
            />
          </FormGroup>
        </Grid>
        <Grid
          item
          md={6}
          sx={{
            display: "flex",
            justifyContent: "center",
          }}
        >
          {data.search.hits.length > 0 ? (
            <SearchResults page={page} results={data.search} onPageChange={onPageChange} />
          ) : (
            <NoResultsContainer q={q} />
          )}
        </Grid>

        {topHit ? (
          <Grid item md={3}>
            {" "}
            <TopHitDetail topHit={topHit} />{" "}
          </Grid>
        ) : null}
      </Grid>
    </>
  );
}

export default SearchContainer;
