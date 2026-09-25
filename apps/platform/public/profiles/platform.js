// Configuration Object
// biome-ignore lint:  keep this as var for now
var configProfile = {
  /* general items */

  documentationUrl: "https://platform-docs.opentargets.org",
  communityUrl: "https://community.opentargets.org",
  communityTicketUrl: "https://community.opentargets.org/c/community-feedback/bug-reports/34",

  /* colors */
  primaryColor: "#3489ca",
  secondaryColor: "#18405e",

  // colorRange: [],
  // custom colour scale: override value in constants.js

  /* partner preview options */

  // main flag to toggle partner preview on/off
  isPartnerPreview: false,

  // Page specific sections:
  // hide[Page]SectionsIds: hide the specified sections (comma separated ids, no spaces, e.g. 'bibliography,otProjects')
  // or leave as empty string to show all sections (all public sections, private sections depending on settings)
  //
  // partner[Page]SectionIds: specify the private widget on this page

  // disease page
  hideDiseaseSectionIds: [""],
  partnerDiseaseSectionIds: ["otProjects"],

  // target page
  hideTargetSectionIds: [""],
  partnerTargetSectionIds: [""],

  // drug page
  hideDrugSectionIds: [""],
  partnerDrugSectionIds: [""],

  // credible set page
  hideCredibleSetSectionIds: [""],
  partnerCredibleSetSectionIds: ["browserView"],

  // evidence page
  hideEvidenceSectionIds: [""],
  partnerEvidenceSectionIds: ["encore", "ot_crispr", "ot_crispr_validation"],

  // datatypes
  hideDataTypes: [""],
  partnerDataTypes: ["ot_partner", "ot_validation_lab"],

  // for datasources we only set those that are private (partner)
  // partnerDataSources: list any private datasource (shown with lock in facets)
  partnerDataSources: ["encore", "ot_crispr"],
};
