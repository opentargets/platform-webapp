/* eslint-disable no-underscore-dangle */
import { Component } from "react";
import { Button, Grid, Typography } from "@mui/material";
import { v1 } from "uuid";

import Abstract from "./Abstract";
import BibliographyDetailPanel from "./BibliographyDetailPanel";
import SimplePublication from "./SimplePublication";
import { getPublicationAbstract, getSimilarPublications } from "./Api";

/**
 * This renders a full publication block in the bibliography details.
 * Props and corresponding field in LINK response:
 *  - pmId: hits[].hits._source.pub_id
 *  - title: hits[].hits._source.title
 *  - authors: hits[].hits._source.authors
 *  - journal: {
 *      title: hits[].hits._source.journal.title,
 *      date: hits[].hits._source.pub_date,
 *      ref: hits[].hits._source.journal_reference,
 *    }
 */
class Publication extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showAbstract: false,
      showSimilar: false,
      abstract: "",
      similar: null,
    };
  }

  // Fetches abstract data as needed and return component
  buildAbstract = () => {
    const { abstract } = this.state;
    if (!abstract) {
      this.getAbstract();
      return null;
    }
    return (
      <BibliographyDetailPanel>
        <Abstract abstract={abstract} />
      </BibliographyDetailPanel>
    );
  };

  // Fetches similar papers data as needed and return components
  buildSimilar = () => {
    const { similar } = this.state;
    if (!similar) {
      this.getSimilar();
      return null;
    }
    return (
      <BibliographyDetailPanel>
        <Typography variant="subtitle2" gutterBottom>
          Similar articles
        </Typography>
        <Grid
          container
          direction="column"
          justifyContent="flex-start"
          alignItems="stretch"
          spacing={2}
        >
          {similar.map(hit => (
            <Grid item xs={12} key={v1()}>
              <SimplePublication
                variant="small"
                pmId={hit._source.pub_id}
                title={hit._source.title}
                authors={
                  (hit._source.authors || []).map(a => ({
                    lastName: a.LastName,
                    initials: a.Initials,
                  })) || []
                }
                journal={{
                  title: hit._source.journal.title,
                  date: hit._source.pub_date,
                  ref: hit._source.journal_reference,
                }}
              />
            </Grid>
          ))}
        </Grid>
      </BibliographyDetailPanel>
    );
  };

  // Get the abstract data from API
  getAbstract = () => {
    const { pmId } = this.props;
    getPublicationAbstract(pmId).then(
      resp => {
        this.setState({
          abstract: resp.abstract,
        });
      },
      () => {
        this.setState({
          abstract: "",
        });
      }
    );
  };

  // Get the abstract data from API
  getSimilar = () => {
    const { pmId } = this.props;
    getSimilarPublications(pmId).then(
      resp => {
        this.setState({
          similar: resp.hits.hits,
        });
      },
      () => {
        this.setState({
          similar: null,
        });
      }
    );
  };

  render() {
    const { pmId, title, authors, journal, hasAbstract = true } = this.props;
    const { showAbstract, showSimilar } = this.state;

    return (
      <>
        {/* Publication basic details */}
        <SimplePublication pmId={pmId} title={title} authors={authors} journal={journal} />

        {/* Show more details */}
        <div>
          <div>
            {hasAbstract ? (
              <>
                <Button
                  variant="outlined"
                  size="small"
                  color="primary"
                  onClick={() => {
                    this.setState({ showAbstract: !showAbstract });
                  }}
                >
                  {showAbstract ? "- Hide abstract" : "+ Show abstract"}
                </Button>{" "}
              </>
            ) : (
              <>
                <Button variant="outlined" color="primary" size="small" disabled>
                  No abstract available
                </Button>{" "}
              </>
            )}
            <Button
              variant="outlined"
              color="primary"
              size="small"
              onClick={() => {
                this.setState({ showSimilar: !showSimilar });
              }}
            >
              {showSimilar ? "- Hide similar" : "+ Show similar"}
            </Button>
          </div>

          {/* Abstract details */}
          {showAbstract ? this.buildAbstract() : null}

          {/* Similar papers details */}
          {showSimilar ? this.buildSimilar() : null}
        </div>
      </>
    );
  }
}

export default Publication;
