import { type Suggestion, searchSuggestions } from "../../../../ot-constants/src/searchSuggestions";
import type { SearchEntity } from "../search/searchData";

/**
 * What the app shell (header menu, footer, home page) must show for a public deployment.
 * These lists are written out on purpose, not imported from the app's constants: a link
 * that is dropped or changed by accident has to fail a test.
 */

export type MenuLink = { name: string; href: string; external: boolean };

/** The main menu of a public deployment, in the order the header shows it. */
export const MAIN_MENU: readonly MenuLink[] = [
  { name: "Metrics", href: "/metrics", external: false },
  {
    name: "Documentation",
    href: "https://platform-docs.opentargets.org/getting-started",
    external: true,
  },
  { name: "Data downloads", href: "/downloads", external: false },
  { name: "API", href: "/api", external: false },
  { name: "Community", href: "https://community.opentargets.org/", external: true },
];

/** Menu entries that only the Partner Preview Platform shows. */
export const PARTNER_ONLY_MENU = [
  "Projects",
  "GSEA Analysis",
  "PPP Documentation",
  "Contact us",
] as const;

export type FooterSection = { heading: string; links: readonly { label: string; href: string }[] };

/** Footer columns in page order. The "Follow us" icons and the licence line are listed apart. */
export const FOOTER_SECTIONS: readonly FooterSection[] = [
  {
    heading: "About",
    links: [
      { label: "Community forum", href: "https://community.opentargets.org" },
      {
        label: "Privacy notice",
        href: "https://www.ebi.ac.uk/data-protection/privacy-notice/embl-ebi-public-website/",
      },
      { label: "Terms of use", href: "https://platform-docs.opentargets.org/licence/terms-of-use" },
    ],
  },
  {
    heading: "Help",
    links: [
      { label: "Documentation", href: "https://platform-docs.opentargets.org" },
      { label: "Community", href: "https://community.opentargets.org" },
    ],
  },
  {
    heading: "Partners",
    links: [
      { label: "EMBL-EBI", href: "https://www.ebi.ac.uk" },
      { label: "Genentech", href: "https://www.gene.com" },
      { label: "GSK", href: "https://www.gsk.com" },
      { label: "MSD", href: "https://www.msd.com/" },
      { label: "Pfizer", href: "https://pfizer.com" },
      { label: "Sanofi", href: "https://www.sanofi.com" },
      { label: "Wellcome Sanger Institute", href: "https://www.sanger.ac.uk" },
    ],
  },
  {
    heading: "About Open Targets",
    links: [
      { label: "Science", href: "https://www.opentargets.org/science" },
      { label: "Publications", href: "https://www.opentargets.org/publications" },
      { label: "Jobs", href: "https://www.opentargets.org/jobs" },
      { label: "Blog", href: "https://blog.opentargets.org" },
    ],
  },
];

export const FOOTER_SOCIAL: readonly { name: string; href: string }[] = [
  { name: "Go to OpenTargets twitter", href: "https://twitter.com/opentargets" },
  { name: "Go to OpenTargets linkedin", href: "https://www.linkedin.com/company/open-targets" },
  { name: "Go to OpenTargets youtube", href: "https://www.youtube.com/opentargets" },
  { name: "Go to OpenTargets github", href: "https://github.com/opentargets" },
];

export const FOOTER_LICENSE = {
  platformHref: "https://platform.opentargets.org/",
  cc0Href: "http://creativecommons.org/publicdomain/zero/1.0?ref=chooser-v1",
};

/** The five "Get started" panels at the bottom of the home page. */
export const HELP_PANELS: readonly { label: string; href: string }[] = [
  { label: "Download all of our open datasets", href: "/downloads" },
  { label: "Access data with our GraphQL API", href: "/api" },
  { label: "Check out our Platform documentation", href: "https://platform-docs.opentargets.org/" },
  {
    label: "Read our latest Platform publications",
    href: "https://platform-docs.opentargets.org/citation",
  },
  { label: "Join the Open Targets Community", href: "https://community.opentargets.org/" },
];

/** Entities of the suggestion chips, in the order the home page lists them (two each). */
export const CHIP_ENTITIES: readonly SearchEntity[] = [
  "target",
  "disease",
  "drug",
  "variant",
  "study",
];

const POOLS: Record<SearchEntity, readonly Suggestion[]> = {
  target: searchSuggestions.targets,
  disease: searchSuggestions.diseases,
  drug: searchSuggestions.drugs,
  variant: searchSuggestions.variants,
  study: searchSuggestions.studies,
};

/** The suggestion the app has for this id, or undefined when the chip is not one of them. */
export function suggestionFor(entity: SearchEntity, id: string): Suggestion | undefined {
  return POOLS[entity].find((suggestion) => suggestion.id === id);
}

/** Entity of a chip link, read from its route. */
export function entityOfHref(href: string): SearchEntity {
  const entity = href.split("/")[1];
  if (
    entity === "target" ||
    entity === "disease" ||
    entity === "drug" ||
    entity === "variant" ||
    entity === "study"
  )
    return entity;
  throw new Error(`"${href}" is not an entity route`);
}

/** Id of a chip link, read from its route. */
export function idOfHref(href: string): string {
  return href.split("/")[2];
}

/** What the API's `meta` query returns, shaped as the page shows it. */
export type MetaVersions = {
  data: { month: string; year: string; revision: string };
  api: { month: string; year: string; revision: string };
};

/** Months in the order `Date.toLocaleString` names them, for the home page's "Last update". */
export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;
