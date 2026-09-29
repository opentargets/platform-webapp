import { gql, type ApolloClient } from "@apollo/client";
import type { ReportSection } from "../../../../types/report";
import { formatComponentState } from "../../CapturedStateChips";
import type { Provenance } from "../types";

const DATA_RELEASE_QUERY = gql`
  query ExportDataRelease {
    meta {
      dataVersion {
        year
        month
        iteration
      }
    }
  }
`;

let releasePromise: Promise<string | undefined> | null = null;

/** Platform data release (e.g. "26.06") from the API meta query; cached for the session. */
export async function fetchDataRelease(client: ApolloClient<unknown>): Promise<string | undefined> {
  if (!releasePromise) {
    releasePromise = client
      .query<{ meta?: { dataVersion?: { year?: string; month?: string; iteration?: string | null } } }>({
        query: DATA_RELEASE_QUERY,
        fetchPolicy: "cache-first",
      })
      .then(({ data }) => {
        const version = data?.meta?.dataVersion;
        if (!version?.year || !version?.month) return undefined;
        const base = `${version.year}.${String(version.month).padStart(2, "0")}`;
        return version.iteration && version.iteration !== "0" ? `${base}.${version.iteration}` : base;
      })
      .catch(() => {
        // Let a later dialog open retry
        releasePromise = null;
        return undefined;
      });
  }
  return releasePromise;
}

/** First day of a "YY.MM" release, used to tell whether a snapshot predates it. */
export const releaseStartTime = (release?: string): number | undefined => {
  const match = release?.match(/^(\d{2,4})\.(\d{1,2})/);
  if (!match) return undefined;
  const year = Number(match[1]) < 100 ? 2000 + Number(match[1]) : Number(match[1]);
  return Date.UTC(year, Number(match[2]) - 1, 1);
};

// Registry entity name → platform route segment (see apps/platform App.tsx routes)
const ENTITY_ROUTES: Record<string, string> = {
  target: "target",
  disease: "disease",
  drug: "drug",
  variant: "variant",
  study: "study",
  credibleSet: "credible-set",
  evidence: "evidence",
};

const stringVar = (variables: Record<string, unknown> | undefined, ...keys: string[]) => {
  for (const key of keys) {
    const value = variables?.[key];
    if (typeof value === "string" && value) return value;
  }
  return undefined;
};

/** Entity page id for a widget; evidence pages are keyed by target + disease. */
const widgetEntityPath = (section: ReportSection): string | undefined => {
  const entity = section.definition.entity;
  const route = ENTITY_ROUTES[entity];
  if (!route) return undefined;
  const variables = section.request?.variables;
  if (entity === "evidence") {
    const ensemblId = stringVar(variables, "ensemblId", "ensgId");
    const efoId = stringVar(variables, "efoId");
    return ensemblId && efoId ? `/${route}/${ensemblId}/${efoId}` : undefined;
  }
  const id = section.entityId;
  return id ? `/${route}/${encodeURIComponent(id)}` : undefined;
};

export const platformOrigin = (origin?: string): string =>
  origin ?? (typeof window !== "undefined" ? window.location.origin : "https://platform.opentargets.org");

/** Platform URL for the widget's entity page, anchored at the section (SectionItem uses definition.id). */
export const widgetDeepLink = (section: ReportSection, origin?: string): string | undefined => {
  const path = widgetEntityPath(section);
  return path ? `${platformOrigin(origin)}${path}#${section.definition.id}` : undefined;
};

export const widgetProvenance = (
  section: ReportSection,
  opts: { dataRelease?: string; platformOrigin?: string }
): Provenance => {
  const entityId =
    section.entityId ??
    (section.definition.entity === "evidence"
      ? [stringVar(section.request?.variables, "ensemblId", "ensgId"), stringVar(section.request?.variables, "efoId")]
          .filter(Boolean)
          .join(" · ") || undefined
      : undefined);
  return {
    entity: entityId
      ? { type: section.definition.entity, id: entityId, label: section.entityLabel }
      : undefined,
    filters: formatComponentState(section.componentState),
    dataRelease: opts.dataRelease,
    sourceLabel: `Open Targets Platform · ${section.definition.name}`,
    retrievedAt: section.stateCapturedAt ?? section.addedAt,
    deepLink: widgetDeepLink(section, opts.platformOrigin),
  };
};

/** "Open Targets Platform API" for OT endpoints, else the endpoint's host. */
export const endpointLabel = (endpoint: string): string => {
  try {
    const host = new URL(endpoint).host;
    return /opentargets\.(org|io|xyz)$/.test(host) ? "Open Targets Platform API" : host;
  } catch {
    return endpoint;
  }
};

export const isOpenTargetsEndpoint = (endpoint: string): boolean =>
  endpointLabel(endpoint) === "Open Targets Platform API";
