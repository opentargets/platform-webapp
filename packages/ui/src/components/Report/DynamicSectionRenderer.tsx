import React, { ReactNode } from "react";
import { ReportSection } from "../types/report";

/**
 * Dynamic Section Renderer
 * Re-renders a report section from stored metadata
 * Used when displaying reports after page reload
 */
export const DynamicSectionRenderer: React.FC<{
  section: ReportSection;
}> = ({ section }) => {
  const { definition, request } = section;

  // Dynamically import and render the section component
  // The component will register itself in the renderer registry
  // Then useReportSectionContent will find it
  
  // For now, return a placeholder
  // In practice, you'd use dynamic imports or a registry of section components
  
  return (
    <div style={{
      backgroundColor: "#f5f5f5",
      padding: "16px",
      border: "1px solid #e0e0e0",
      borderRadius: "4px",
      minHeight: "200px",
    }}>
      <p>
        Rendering: {definition.name} ({definition.entity})
      </p>
      <p>Section ID: {definition.id}</p>
      <pre style={{ fontSize: "12px", overflow: "auto" }}>
        {JSON.stringify({ data: request.data }, null, 2)}
      </pre>
    </div>
  );
};

/**
 * Registry to map section definition IDs to their component renderers
 * Register components here so they can be dynamically rendered
 */
const sectionComponentRegistry = new Map<
  string,
  React.ComponentType<{
    definition: any;
    request: any;
    renderDescription: () => ReactNode;
    renderChart?: () => ReactNode;
    renderBody: () => ReactNode;
    tags?: string[];
    chipText: string;
    entity: string;
    showEmptySection: boolean;
    showContentLoading: boolean;
    loadingMessage: string;
    defaultView: string;
  }>
>();

/**
 * Register a section component so it can be dynamically rendered
 */
export const registerSectionComponent = (
  definitionId: string,
  Component: React.ComponentType<any>
) => {
  sectionComponentRegistry.set(definitionId, Component);
};

/**
 * Get a registered section component
 */
export const getSectionComponent = (definitionId: string) => {
  return sectionComponentRegistry.get(definitionId);
};
