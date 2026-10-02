import type { CollectHooks, Provenance, ReportSection } from "../../../core";
import { formatComponentState } from "../../CapturedStateChips";

/** First day of a "YY.MM" release, used to tell whether a snapshot predates it. */
export const releaseStartTime = (release?: string): number | undefined => {
  const match = release?.match(/^(\d{2,4})\.(\d{1,2})/);
  if (!match) return undefined;
  const year = Number(match[1]) < 100 ? 2000 + Number(match[1]) : Number(match[1]);
  return Date.UTC(year, Number(match[2]) - 1, 1);
};

const stringVar = (variables: Record<string, unknown> | undefined, ...keys: string[]) => {
  for (const key of keys) {
    const value = variables?.[key];
    if (typeof value === "string" && value) return value;
  }
  return undefined;
};

export const widgetProvenance = (
  section: ReportSection,
  opts: { dataRelease?: string; hooks?: CollectHooks }
): Provenance => {
  const { hooks } = opts;
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
    filters: formatComponentState(section.componentState, hooks?.widget?.(section)?.describeState),
    dataRelease: opts.dataRelease,
    sourceLabel: hooks?.sourceLabel?.(section) ?? section.definition.name,
    retrievedAt: section.stateCapturedAt ?? section.addedAt,
    deepLink: hooks?.widgetDeepLink?.(section),
  };
};

/** Default endpoint label: its host name. Hosts override it through CollectHooks.endpointLabel. */
export const defaultEndpointLabel = (endpoint: string): string => {
  try {
    return new URL(endpoint).host;
  } catch {
    return endpoint;
  }
};
