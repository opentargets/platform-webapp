import { Fragment } from "react";
import {
  usePlatformApi,
  Field,
  ProfileHeader as BaseProfileHeader,
  Link,
  ScientificNotation,
  Tooltip,
  PublicationsDrawer,
  ClinvarStars,
  LabelChip,
  DetailPopover,
  SummaryStatsTable,
  DisplaySampleSize,
  StudyPublication,
  Box,
  Typography,
} from "ui";
import CREDIBLE_SET_PROFILE_HEADER_FRAGMENT from "./ProfileHeader.gql";
import { epmcUrl, getSortedAncestries } from "@ot/utils";
import { credsetConfidenceMap, populationMap } from "@ot/constants";

function ProfileHeader() {
  const { loading, error, data } = usePlatformApi();

  // TODO: Errors!
  if (error) return null;

  const credibleSet = data?.credibleSet;
  const leadVariant = credibleSet?.locus?.rows?.[0] || {};
  const beta = leadVariant.beta ?? credibleSet?.beta;
  const standardError = leadVariant.standardError ?? credibleSet?.standardError;
  const study = credibleSet?.study;
  const target = study?.target;

  const { pValueMantissa, pValueExponent } =
    typeof leadVariant?.pValueMantissa === "number" &&
    typeof leadVariant?.pValueExponent === "number"
      ? leadVariant
      : credibleSet ?? {};

  return (
    <BaseProfileHeader>
      <Box>
        <Typography variant="subtitle1" mt={0}>
          Lead Variant
        </Typography>
        {typeof pValueMantissa === "number" && typeof pValueExponent === "number" && (
          <Field loading={loading} title="P-value">
            <ScientificNotation number={[pValueMantissa, pValueExponent]} />
          </Field>
        )}
        {typeof beta === "number" && (
          <Field
            loading={loading}
            title={
              <Tooltip
                title={
                  <Typography variant="caption">Beta with respect to the ALT allele</Typography>
                }
                showHelpIcon
              >
                Beta
              </Tooltip>
            }
          >
            {beta.toPrecision(3)}
          </Field>
        )}
        {typeof standardError === "number" && (
          <Field
            loading={loading}
            title={
              <Tooltip
                title={
                  <Typography variant="caption">
                    Standard error: Estimate of the standard deviation of the sampling distribution
                    of the beta
                  </Typography>
                }
                showHelpIcon
              >
                Standard error
              </Tooltip>
            }
          >
            {standardError.toPrecision(3)}
          </Field>
        )}
        {typeof credibleSet?.effectAlleleFrequencyFromSource === "number" && (
          <Field
            loading={loading}
            title={
              <Tooltip
                title={
                  <Typography variant="caption">
                    Frequency of the effect allele in studied population
                  </Typography>
                }
                showHelpIcon
              >
                Effective allele frequency
              </Tooltip>
            }
          >
            {credibleSet.effectAlleleFrequencyFromSource.toPrecision(3)}
          </Field>
        )}
        {typeof leadVariant?.posteriorProbability === "number" && (
          <Field
            loading={loading}
            title={
              <Tooltip
                title={
                  <Typography variant="caption">
                    Posterior inclusion probability from fine-mapping that this variant is causal
                  </Typography>
                }
                showHelpIcon
              >
                Posterior probability
              </Tooltip>
            }
          >
            {leadVariant.posteriorProbability.toPrecision(3)}
          </Field>
        )}

        <Typography variant="subtitle1" mt={1}>
          Fine-mapping
        </Typography>
        {credibleSet?.locusStart && (
          <Field loading={loading} title="Locus">
            {credibleSet?.variant?.chromosome}:{credibleSet?.locusStart}-{credibleSet?.locusEnd}
          </Field>
        )}
        <Field loading={loading} title="Method">
          {credibleSet?.finemappingMethod}
        </Field>
        <Field
          loading={loading}
          title={
            <Tooltip
              title="Fine-mapping confidence based on the quality of the linkage-disequilibrium information available and fine-mapping method"
              showHelpIcon
            >
              Confidence
            </Tooltip>
          }
        >
          <Tooltip title={credibleSet?.confidence}>
            <span>
              <ClinvarStars num={credsetConfidenceMap[credibleSet?.confidence]} />
            </span>
          </Tooltip>
        </Field>
        <Field
          loading={loading}
          title={
            <Tooltip
              title={
                <Typography variant="caption">
                  Minimum pairwise correlation (R<sup>2</sup>) observed between all variants in the
                  credible set
                </Typography>
              }
              showHelpIcon
            >
              Minimum R<sup>2</sup>
            </Tooltip>
          }
        >
          {credibleSet?.purityMinR2?.toPrecision(3)}
        </Field>
        {credibleSet?.qualityControls?.length > 0 && (
          <Box>
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
                {credibleSet.qualityControls.map(warning => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </DetailPopover>
          </Box>
        )}
      </Box>

      <Box>
        <Typography variant="subtitle1" mt={0}>
          {study?.studyType.replace(/(qtl|gwas)/gi, match => match.toUpperCase())} Study
        </Typography>
        {study?.studyType === "gwas" && (
          <>
            <Field loading={loading} title="Reported trait">
              {study?.traitFromSource}
            </Field>
            {study?.diseases?.length > 0 && (
              <Field loading={loading} title="Disease or phenotype">
                {study.diseases.map(({ id, name }, index) => (
                  <Fragment key={id}>
                    {index > 0 ? ", " : null}
                    <Link to={`../disease/${id}`}>{name}</Link>
                  </Fragment>
                ))}
              </Field>
            )}
            {study?.backgroundTraits?.length > 0 && (
              <Field loading={loading} title="Background trait">
                {study.backgroundTraits.map(({ id, name }, index) => (
                  <Fragment key={id}>
                    {index > 0 ? ", " : null}
                    <Link to={`../disease/${id}`}>{name}</Link>
                  </Fragment>
                ))}
              </Field>
            )}
          </>
        )}
        {study?.studyType !== "gwas" && (
          <>
            {study?.projectId && (
              <Field loading={loading} title="Project">
                {study?.projectId?.replace(/_/gi, " ")}
              </Field>
            )}
            {target?.id && (
              <Field loading={loading} title="Affected gene">
                <Link to={`../target/${target.id}`}>{target.approvedSymbol}</Link>
              </Field>
            )}
            {study?.biosample?.biosampleId && (
              <Field loading={loading} title="Affected cell/tissue">
                <Link
                  external
                  to={`https://www.ebi.ac.uk/ols4/search?q=${study.biosample.biosampleId}`}
                >
                  {study.biosample.biosampleName}
                </Link>
              </Field>
            )}
          </>
        )}
        {study?.publicationFirstAuthor && (
          <Field loading={loading} title="Publication">
            <StudyPublication
              publicationFirstAuthor={study.publicationFirstAuthor}
              publicationDate={study.publicationDate}
              publicationJournal={study.publicationJournal}
            />
          </Field>
        )}
        {study?.pubmedId && (
          <Field loading={loading} title="PubMed">
            <PublicationsDrawer entries={[{ name: study.pubmedId, url: epmcUrl(study.pubmedId) }]}>
              {study.pubmedId}
            </PublicationsDrawer>
          </Field>
        )}
        <Field loading={loading} title="Analysis">
          {study?.analysisFlags?.join(", ")}
        </Field>
        <Field loading={loading} title="Summary statistics">
          {!study?.hasSumstats ? (
            "Not Available"
          ) : study?.sumstatQCValues ? (
            <DetailPopover title="Available">
              <SummaryStatsTable sumstatQCValues={study.sumstatQCValues} />
            </DetailPopover>
          ) : (
            "Available"
          )}
        </Field>
        {study?.nSamples && (
          <Field loading={loading} title="Sample size">
            <DisplaySampleSize
              nSamples={study.nSamples}
              cohorts={study?.cohorts}
              initialSampleSize={study?.initialSampleSize}
            />
          </Field>
        )}
        {study?.ldPopulationStructure?.length > 0 && (
          <Box display="flex" sx={{ gap: 1 }}>
            {getSortedAncestries({ arr: study.ldPopulationStructure }).map(
              ({ ldPopulation, relativeSampleSize }) => (
                <LabelChip
                  key={ldPopulation}
                  label={ldPopulation.toUpperCase()}
                  value={`${(relativeSampleSize * 100).toFixed(0)}%`}
                  tooltip={`LD reference population: ${populationMap[ldPopulation]}`}
                />
              )
            )}
          </Box>
        )}
      </Box>
    </BaseProfileHeader>
  );
}

ProfileHeader.fragments = {
  profileHeader: CREDIBLE_SET_PROFILE_HEADER_FRAGMENT,
};

export default ProfileHeader;
