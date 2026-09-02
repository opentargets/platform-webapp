import { Suspense, useState, lazy } from "react";
import { LoadingBackdrop, Link, PrivateWrapper } from "ui";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Grid,
  Typography,
  styled,
} from "@mui/material";
import { makeStyles } from "@mui/styles";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { fetcher } from "@ot/utils";

import "graphiql/graphiql.min.css";

import TARGET_ASSOCS from "./TargetAssocs.gql";
import DISEASE_ASSOCS from "./DiseaseAssocs.gql";
import TARGET_DISEASE_EVIDENCE from "./TargetDiseaseEvidence.gql";
import TARGET_ANNOTATION from "./TargetAnnotation.gql";
import DISEASE_ANNOTATION from "./DiseaseAnnotation.gql";
import DRUG_ANNOTATION from "./DrugAnnotation.gql";
import SEARCH_ANNOTATION from "./SearchAnnotation.gql";
import SEARCH_ASSOCS from "./SearchAssocs.gql";
import CREDIBLE_SET_ANNOTATION from "./CredibleSetAnnotation.gql";
import DISEASE_ANNOTATION_GWAS from "./DiseaseAnnotationGWAS.gql";
import STUDY_ANNOTATION from "./StudyAnnotation.gql";
import VARIANT_ANNOTATION from "./VariantAnnotation.gql";
import PPPCRISPRQUERY from "./PPPCrisprQuery.gql";
import PPPACCOUNTDISEASES from "./PPPAssociatedDisease.gql";
import TARGETQTLCREDIBLESSETS from "./TargetQTLCredibleSetsQuery.gql";
import NOVELTYTIMESERIES from "./NoveltyTimeSeries.gql";

const QueryButton = styled(Button)`
  color: #fff;
  border: none;
`;
// lazy load GraphiQL and remove Logo and Toolbar
const GraphiQL = lazy(() =>
  import("graphiql").then(module => {
    // eslint-disable-next-line
    module.default.Logo = function () {
      return null;
    };
    // eslint-disable-next-line
    module.default.Toolbar = function () {
      return null;
    };
    return module;
  })
);

const useStyles = makeStyles({
  container: {
    minHeight: "600px !important",
  },
  buttonMargin: {
    marginBottom: "12px",
  },
});

function APIPage() {
  const classes = useStyles();
  const [query, setQuery] = useState("");

  return (
    <>
      <Typography variant="h4" paragraph>
        API
      </Typography>
      <Typography paragraph>
        The Open Targets Platform is powered by a GraphQL API that supports graphical queries for a
        single entity or target-disease association across our knowledge graph. Read our{" "}
        <Link external to="https://platform-docs.opentargets.org/data-access/graphql-api">
          GraphQL API documentation
        </Link>{" "}
        and visit the{" "}
        <Link external to="https://community.opentargets.org">
          Open Targets Community
        </Link>{" "}
         for more how-to guides and tutorials. You can also access the Open targets data through our {" "}
        <Link external to="https://platform-docs.opentargets.org/data-access/model-context-protocol">
        MCP
        </Link>{" "}, enabling more integrated 
        interactions with the Platform.
      </Typography>
      <Typography paragraph>
        Please note that our API is optimised for a single query. For more programmatic or
        systematic analyses, please use{" "}
        <Link external to="https://platform-docs.opentargets.org/data-access/datasets">
          our dataset downloads
        </Link>{" "}
        or{" "}
        <Link external to="https://platform-docs.opentargets.org/data-access/google-bigquery">
          Google BigQuery instance
        </Link>
        .
      </Typography>
      <Grid className={classes.container} container spacing={3}>
        <Grid item md={3} xl={2}>
          <Typography variant="h5" paragraph>
            Example queries
          </Typography>
          <PrivateWrapper>
            <Accordion sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<FontAwesomeIcon icon={faChevronDown} />}>
                <Typography variant="subtitle2" color="secondary">Partner Preview specific queries</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <div>
                  <Typography variant="subtitle2" display="block" paragraph>
                    Explore prepublication OT CRISPR evidence that supports a specific target-disease association
                  </Typography>
                  <QueryButton
                    className={classes.buttonMargin}
                    variant="contained"
                    color="primary"
                    onClick={() => setQuery(PPPCRISPRQUERY.loc.source.body)}
                  >
                    Run sample query
                  </QueryButton>
                  <Typography variant="subtitle2" display="block" paragraph>
                     Explore all targets associated with Parkinson disease through prepublication data from OT CRISPR projects
                  </Typography>
                  <QueryButton
                    variant="contained"
                    color="primary"
                    onClick={() => setQuery(PPPACCOUNTDISEASES.loc.source.body)}
                  >
                    Run sample query
                  </QueryButton>
                  <Typography variant="subtitle2" display="block" paragraph>
                    Explore molQTL credible sets for INSL6, including the ones from OTAR projects studies such as OTAR2057 IBDverse and OTAR2065 Neuroinflammation
                  </Typography>
                  <QueryButton
                    className={classes.buttonMargin}
                    variant="contained"
                    color="primary"
                    onClick={() => setQuery(TARGETQTLCREDIBLESSETS.loc.source.body)}
                  >
                    Run sample query
                  </QueryButton>
                  <Typography variant="subtitle2" display="block" paragraph>
                    Explore the novelty time series for the PCSK9–Hypercholesterolemia association
                  </Typography>
                  <QueryButton
                    className={classes.buttonMargin}
                    variant="contained"
                    color="primary"
                    onClick={() => setQuery(NOVELTYTIMESERIES.loc.source.body)}
                  >
                    Run sample query
                  </QueryButton>
                </div>
              </AccordionDetails>
            </Accordion>
          </PrivateWrapper>
          <Accordion>
            <AccordionSummary expandIcon={<FontAwesomeIcon icon={faChevronDown} />}>
              <Typography variant="subtitle2">Target-disease association</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <div>
                <Typography variant="subtitle2" display="block" paragraph>
                  Find targets associated with a specific disease or phenotype
                </Typography>
                <QueryButton
                  className={classes.buttonMargin}
                  variant="contained"
                  color="primary"
                  onClick={() => setQuery(DISEASE_ASSOCS.loc.source.body)}
                >
                  Run sample query
                </QueryButton>
                <Typography variant="subtitle2" display="block" paragraph>
                  Find diseases and phenotypes associated with a specific target
                </Typography>
                <QueryButton
                  variant="contained"
                  color="primary"
                  onClick={() => setQuery(TARGET_ASSOCS.loc.source.body)}
                >
                  Run sample query
                </QueryButton>
              </div>
            </AccordionDetails>
          </Accordion>
          <Accordion>
            <AccordionSummary expandIcon={<FontAwesomeIcon icon={faChevronDown} />}>
              <Typography variant="subtitle2">Target-disease evidence</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <div>
                <Typography variant="subtitle2" display="block" paragraph>
                  Explore evidence that supports a specific target-disease association
                </Typography>
                <QueryButton
                  className={classes.buttonMargin}
                  variant="contained"
                  color="primary"
                  onClick={() => setQuery(TARGET_DISEASE_EVIDENCE.loc.source.body)}
                >
                  Run sample query
                </QueryButton>
              </div>
            </AccordionDetails>
          </Accordion>
          <Accordion>
            <AccordionSummary expandIcon={<FontAwesomeIcon icon={faChevronDown} />}>
              <Typography variant="subtitle2">Target annotation</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <div>
                <Typography variant="subtitle2" display="block" paragraph>
                  Find tractability and safety information for a specific target
                </Typography>
                <QueryButton
                  className={classes.buttonMargin}
                  variant="contained"
                  color="primary"
                  onClick={() => setQuery(TARGET_ANNOTATION.loc.source.body)}
                >
                  Run sample query
                </QueryButton>
                <Typography variant="subtitle2" display="block" paragraph>
                  Explore molQTL credible sets for INSL6, including the ones from OTAR projects studies
                </Typography>
                <QueryButton
                  className={classes.buttonMargin}
                  variant="contained"
                  color="primary"
                  onClick={() => setQuery(TARGETQTLCREDIBLESSETS.loc.source.body)}
                >
                  Run sample query
                </QueryButton>
              </div>
            </AccordionDetails>
          </Accordion>
          <Accordion>
            <AccordionSummary expandIcon={<FontAwesomeIcon icon={faChevronDown} />}>
              <Typography variant="subtitle2">Disease annotation</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <div>
                <Typography variant="subtitle2" display="block" paragraph>
                  Find clinical signs and symptoms for a specific disease
                </Typography>
                <QueryButton
                  className={classes.buttonMargin}
                  variant="contained"
                  color="primary"
                  onClick={() => setQuery(DISEASE_ANNOTATION.loc.source.body)}
                >
                  Run sample query
                </QueryButton>
                <Typography variant="subtitle2" display="block" paragraph>
                  GWAS associated with a specified disease
                </Typography>
                <QueryButton
                  className={classes.buttonMargin}
                  variant="contained"
                  color="primary"
                  onClick={() => setQuery(DISEASE_ANNOTATION_GWAS.loc.source.body)}
                >
                  Run sample query
                </QueryButton>
              </div>
            </AccordionDetails>
          </Accordion>
          <Accordion>
            <AccordionSummary expandIcon={<FontAwesomeIcon icon={faChevronDown} />}>
              <Typography variant="subtitle2">Drug annotation</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <div>
                <Typography variant="subtitle2" display="block" paragraph>
                  Find approval status and withdrawn and black-box warning for a specific drug
                </Typography>
                <QueryButton
                  className={classes.buttonMargin}
                  variant="contained"
                  color="primary"
                  onClick={() => setQuery(DRUG_ANNOTATION.loc.source.body)}
                >
                  Run sample query
                </QueryButton>
              </div>
            </AccordionDetails>
          </Accordion>
          <Accordion>
            <AccordionSummary expandIcon={<FontAwesomeIcon icon={faChevronDown} />}>
              <Typography variant="subtitle2">Variant annotation</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <div>
                <Typography variant="subtitle2" display="block" paragraph>
                  Credible sets from quantitative trait loci associated with molecular traits
                  containing a specified variant
                </Typography>
                <QueryButton
                  className={classes.buttonMargin}
                  variant="contained"
                  color="primary"
                  onClick={() => setQuery(VARIANT_ANNOTATION.loc.source.body)}
                >
                  Run sample query
                </QueryButton>
              </div>
            </AccordionDetails>
          </Accordion>
          <Accordion>
            <AccordionSummary expandIcon={<FontAwesomeIcon icon={faChevronDown} />}>
              <Typography variant="subtitle2">Study annotation</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <div>
                <Typography variant="subtitle2" display="block" paragraph>
                  Information about a specified study
                </Typography>
                <QueryButton
                  className={classes.buttonMargin}
                  variant="contained"
                  color="primary"
                  onClick={() => setQuery(STUDY_ANNOTATION.loc.source.body)}
                >
                  Run sample query
                </QueryButton>
              </div>
            </AccordionDetails>
          </Accordion>
          <Accordion>
            <AccordionSummary expandIcon={<FontAwesomeIcon icon={faChevronDown} />}>
              <Typography variant="subtitle2">Credible set Annotation</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <div>
                <Typography variant="subtitle2" display="block" paragraph>
                  Colocalisation metrics for overlapping GWAS credible sets
                </Typography>
                <QueryButton
                  className={classes.buttonMargin}
                  variant="contained"
                  color="primary"
                  onClick={() => setQuery(CREDIBLE_SET_ANNOTATION.loc.source.body)}
                >
                  Run sample query
                </QueryButton>
              </div>
            </AccordionDetails>
          </Accordion>
          <Accordion>
            <AccordionSummary expandIcon={<FontAwesomeIcon icon={faChevronDown} />}>
              <Typography variant="subtitle2">Search page</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <div>
                <Typography variant="subtitle2" display="block" paragraph>
                  Example query for KRAS
                </Typography>
                <QueryButton
                  className={classes.buttonMargin}
                  variant="contained"
                  color="primary"
                  onClick={() => setQuery(SEARCH_ANNOTATION.loc.source.body)}
                >
                  Run sample query
                </QueryButton>
                <Typography variant="subtitle2" display="block" paragraph>
                  Example query to get how many entries there are in each entity category for PCSK9
                </Typography>
                <QueryButton
                  className={classes.buttonMargin}
                  variant="contained"
                  color="primary"
                  onClick={() => setQuery(SEARCH_ASSOCS.loc.source.body)}
                >
                  Run sample query
                </QueryButton>
              </div>
            </AccordionDetails>
          </Accordion>
        </Grid>
        <Grid item md={9} xl={10}>
          <Suspense fallback={<LoadingBackdrop />}>
            <GraphiQL fetcher={fetcher} query={query} />
          </Suspense>
        </Grid>
      </Grid>
    </>
  );
}

export default APIPage;
