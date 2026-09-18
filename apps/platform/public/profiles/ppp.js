// Configuration Object
// biome-ignore lint:  keep this as var for now
var configProfile = {
  /* general items */

  documentationUrl: "https://platform-docs.opentargets.org",
  helpdeskEmail: "partner-support@opentargets.org",
  communityUrl: "https://community.opentargets.org",
  communityTicketUrl: "https://community.opentargets.org/c/community-feedback/bug-reports/34",
  // config navbar main menu (hamburger)
  // mainMenuItems: [],
  // homepage logo subtitle (tagline)
  otLogoTagline: "Beta",

  /* colors */

  // primaryColor: '#2f7bb5',
  primaryColor: "#3489ca",
  secondaryColor: "#18405e",
  // custom colour scale: override value in constants.js
  colorRange: [
    "#e5edf4",
    "#ccdcea",
    "#b2cbe0",
    "#99b9d6",
    "#7fa8cc",
    "#6697c1",
    "#4c85b7",
    "#3274ad",
    "#1963a3",
    "#005299",
  ],

  /* partner preview options */

  // main flag to toggle partner preview on/off
  isPartnerPreview: true,

  // Page specific sections:
  // hide[Page]SectionsIds: hide the specified sections (comma separated ids, no spaecs, e.g. 'bibliography,otProjects')
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
  // partnerCredibleSetSectionIds: ["browserView"],
  partnerCredibleSetSectionIds: [],

  // evidence page
  hideEvidenceSectionIds: [""],
  partnerEvidenceSectionIds: ["encore", "ot_crispr", "ot_crispr_validation"],

  // datatypes
  hideDataTypes: [""],
  partnerDataTypes: ["ot_partner", "ot_validation_lab"],

  // for datasources we only set those that are private (partner)
  // partnerDataSources: list any private datasource (shown with lock in facets)
  partnerDataSources: ["encore", "ot_crispr", "ot_crispr_validation"],
};
