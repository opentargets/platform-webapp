import { ReactNode } from "react";
import { registerSectionComponent } from "../providers/SectionRegistry";
import { ReportSectionDefinition } from "../types/report";

/**
 * HOC to auto-register a section component for report reconstruction
 * Use this to wrap section Body components
 */
export const withSectionRegistration = <P extends object>(
  Body: React.ComponentType<P>,
  definition: ReportSectionDefinition
) => {
  // Register the component when module loads
  registerSectionComponent(definition.id, Body, definition);

  return Body;
};
