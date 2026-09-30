import { createContext, useContext } from "react";
import type { ComponentType } from "react";
import { ReportComponentStateProvider } from "./ReportComponentStateContext";

/**
 * The props a section Body was mounted with (id, label, entity and any extras such
 * as `studyId` or `leadVariantId`). "Add to Report" saves them so a report can
 * rebuild the Body after a reload exactly as the page mounted it; the entity id alone
 * isn't enough (evidence Bodies take `{ ensgId, efoId }`, some pages pass extra props,
 * and several tables key their saved state on these props).
 */
export type SectionBodyProps = Record<string, unknown>;

const SectionBodyPropsContext = createContext<SectionBodyProps | null>(null);

export const useSectionBodyProps = () => useContext(SectionBodyPropsContext);

export const SectionBodyPropsProvider = SectionBodyPropsContext.Provider;

/**
 * Mounts a section Body and exposes its props to the SectionItem inside it. Also
 * holds the section's report state bag, so state kept in the Body itself (tabs,
 * filters: see useReportState) is captured by "Add to Report" along with the
 * SectionItem's tables; SectionItem reuses this bag rather than making its own.
 */
export function SectionBody({
  Body,
  ...props
}: { Body: ComponentType<any> } & SectionBodyProps) {
  return (
    <SectionBodyPropsContext.Provider value={props}>
      <ReportComponentStateProvider>
        <Body {...props} />
      </ReportComponentStateProvider>
    </SectionBodyPropsContext.Provider>
  );
}

/** Plain-data copy for storage: drops functions and React elements. */
export const toStorableBodyProps = (props: SectionBodyProps | null | undefined) => {
  if (!props) return undefined;
  try {
    return JSON.parse(
      JSON.stringify(props, (_key, value) =>
        typeof value === "function" || (value && typeof value === "object" && "$$typeof" in value)
          ? undefined
          : value
      )
    ) as SectionBodyProps;
  } catch {
    return undefined;
  }
};
