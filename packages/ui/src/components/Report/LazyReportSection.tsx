import React, { ReactNode } from "react";
import { ReportSection } from "../../types/report";
import SectionItem from "../Section/SectionItem";

/**
 * Lazy Report Section - Re-renders a stored section
 * This allows sections to register themselves and provide render functions
 * when a report is loaded from localStorage
 */
export const LazyReportSection: React.FC<{
  section: ReportSection;
}> = ({ section }) => {
  const { definition, request } = section;

  // Re-render the SectionItem with stored data
  // This allows it to register render functions naturally
  return (
    <SectionItem
      definition={definition}
      request={request}
      renderDescription={() => <div>Description pending...</div>}
      renderBody={() => <div>Content pending...</div>}
      renderChart={() => <div>Chart pending...</div>}
      entity={definition.entity}
      tags={[]}
      chipText=""
      showEmptySection={true}
      showContentLoading={false}
      loadingMessage="Loading..."
      defaultView="table"
    />
  );
};
