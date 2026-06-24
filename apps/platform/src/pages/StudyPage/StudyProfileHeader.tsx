import { Fragment } from "react";
import {
  usePlatformApi,
  Link,
  Field,
  ProfileHeader as BaseProfileHeader,
  DetailPopover,
  SummaryStatsTable,
  LabelChip,
  DisplaySampleSize,
  PublicationsDrawer,
  StudyPublication,
} from "ui";
import { Box } from "@mui/material";
import { populationMap } from "@ot/constants";
import { getSortedAncestries, getStudyTypeDisplay, formatPercentage } from "@ot/utils";

import STUDY_PROFILE_HEADER_FRAGMENT from "./StudyProfileHeader.gql";

function ProfileHeader() {
  const { loading, error, data } = usePlatformApi();

  // TODO: Errors!
  if (error) return null;

  const {
    studyType,
    publicationFirstAuthor,
    publicationDate,
    publicationJournal,
    pubmedId,
    hasSumstats,
    sumstatQCValues,
    nSamples,
    initialSampleSize,
    traitFromSource,
    backgroundTraits,
    diseases,
    projectId,
    target,
    nCases,
    nControls,
    cohorts,
    ldPopulationStructure,
    qualityControls,
    analysisFlags,
    biosample,
    condition,
  } = data?.study || {};

  return (
    <BaseProfileHeader>
      <Box>
        <Field testId="field-study-type" loading={loading} title="Study type">
          {getStudyTypeDisplay(studyType)}
        </Field>
        {studyType === "gwas" && (
          <>
            <Field testId="field-reported-trait" loading={loading} title="Reported trait">
              {traitFromSource}
            </Field>
            {diseases?.length > 0 && (
              <Field testId="field-disease-or-phenotype" loading={loading} title="Disease or phenotype">
                {diseases.map(({ id, name }, index) => (
                  <Fragment key={id}>
                    {index > 0 ? ", " : null}
                    <Link to={`../disease/${id}`}>{name}</Link>
                  </Fragment>
                ))}
              </Field>
            )}
            {backgroundTraits?.length > 0 && (
              <Field testId="field-background-trait" loading={loading} title="Background trait">
                {backgroundTraits.map(({ id, name }, index) => (
                  <Fragment key={id}>
                    {index > 0 ? ", " : null}
                    <Link to={`../disease/${id}`}>{name}</Link>
                  </Fragment>
                ))}
              </Field>
            )}
          </>
        )}
        {studyType !== "gwas" && ( // QTL
          <>
            {projectId && (
              <Field testId="field-project" loading={loading} title="Project">
                {projectId?.replace(/_/gi, " ")}
              </Field>
            )}
            {target?.id && (
              <Field testId="field-affected-gene" loading={loading} title="Affected gene">
                <Link to={`../target/${target.id}`}>{target.approvedSymbol}</Link>
              </Field>
            )}
            {biosample?.biosampleId && (
              <Field testId="field-affected-cell-tissue" loading={loading} title="Affected cell/tissue">
                <Link external to={`https://www.ebi.ac.uk/ols4/search?q=${biosample.biosampleId}`}>
                  {biosample.biosampleName}
                </Link>
              </Field>
            )}
            <Field testId="field-condition" loading={loading} title="Condition">
              {condition}
            </Field>
          </>
        )}
        {publicationFirstAuthor && (
          <Field testId="field-publication" loading={loading} title="Publication">
            <StudyPublication
              publicationFirstAuthor={publicationFirstAuthor}
              publicationDate={publicationDate}
              publicationJournal={publicationJournal}
            />
          </Field>
        )}
        {pubmedId && (
          <Field testId="field-pubmed" loading={loading} title="PubMed">
            <PublicationsDrawer name={pubmedId} entries={[{ name: pubmedId }]} />
          </Field>
        )}
      </Box>

      <Box>
        <Field testId="field-summary-statistics" loading={loading} title="Summary statistics">
          {!hasSumstats ? (
            "Not Available"
          ) : sumstatQCValues?.length > 0 ? (
            <DetailPopover title="Available">
              <SummaryStatsTable sumstatQCValues={sumstatQCValues} />
            </DetailPopover>
          ) : (
            "Available"
          )}
        </Field>
        {qualityControls?.length > 0 && (
          <Box data-testid="field-qc-warnings">
            <DetailPopover title="QC warnings">
              <ul
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.25rem",
                  padding: 0,
                  margin: "0 0 0 1rem",
                }}
              >
                {qualityControls.map(warning => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </DetailPopover>
          </Box>
        )}
        {nSamples && (
          <Field testId="field-sample-size" loading={loading} title="Sample size">
            <DisplaySampleSize
              nSamples={nSamples}
              cohorts={cohorts}
              initialSampleSize={initialSampleSize}
            />
          </Field>
        )}
        <Field testId="field-n-cases" loading={loading} title="N cases">
          {/* do not show anything when value 0 */}
          {nCases ? nCases?.toLocaleString() : null}
        </Field>
        <Field testId="field-n-controls" loading={loading} title="N controls">
          {/* do not show anything when value 0 */}
          {nCases ? nControls?.toLocaleString() : null}
        </Field>
        <Field testId="field-analysis" loading={loading} title="Analysis">
          {analysisFlags?.join(", ")}
        </Field>

        <Box display="flex" sx={{ gap: 1 }}>
          {getSortedAncestries({ arr: ldPopulationStructure }).map(
            ({ ldPopulation, relativeSampleSize }) => (
              <LabelChip
                key={ldPopulation}
                data-testid={`chip-ld-population-${ldPopulation}`}
                label={ldPopulation.toUpperCase()}
                value={`${formatPercentage(relativeSampleSize)}%`}
                tooltip={`LD reference population: ${populationMap[ldPopulation]}`}
              />
            )
          )}
        </Box>
      </Box>
    </BaseProfileHeader>
  );
}

ProfileHeader.fragments = {
  profileHeader: STUDY_PROFILE_HEADER_FRAGMENT,
};

export default ProfileHeader;
