import React from "react";
import {
  type ReportRequest,
  type ReportSectionDefinition,
  type ReportSectionViewType,
  useReportComponentState,
  AddToReportMenuButton,
  type AddSectionPayload,
} from "report-builder";
import { toStorableBodyProps } from "../providers/SectionBodyPropsContext";

interface AddToReportButtonProps {
  definition: ReportSectionDefinition;
  request: ReportRequest;
  entity: string;
  selectedView: ReportSectionViewType;
  tags?: string[];
  chipText?: string;
  variant?: "text" | "outlined" | "contained";
  size?: "small" | "medium" | "large";
  showLabel?: boolean;
  // Callback to capture component state (filters, selected rows, etc.)
  onCaptureState?: () => Record<string, any>;
  // Props the section Body was mounted with, replayed when the report rebuilds it
  bodyProps?: Record<string, unknown> | null;
}

/**
 * "Add to report" for a platform section (SectionItem, the associations toolkit).
 * Captures what the report needs to rebuild the section: the request (data +
 * variables), the entity it describes, the widget's state bag and its mount props.
 * The menu and dialog come from report-builder.
 */
export const AddToReportButton: React.FC<AddToReportButtonProps> = ({
  definition,
  request,
  entity,
  selectedView,
  tags,
  chipText,
  variant,
  size,
  showLabel,
  onCaptureState,
  bodyProps,
}) => {
  const reportComponentState = useReportComponentState();

  const capture = (): AddSectionPayload => {
    // The entity ID is the identifier for the current entity (disease ID, gene ID, etc.);
    // the label is its name/symbol (used in descriptions and visualizations)
    const entityData = request?.data?.[entity] as { id?: string; name?: string; symbol?: string } | undefined;
    return {
      definition,
      request,
      entityId: entityData?.id,
      entityLabel: entityData?.name || entityData?.symbol,
      selectedView,
      tags,
      chipText,
      componentState: onCaptureState?.() || reportComponentState?.getAllState() || {},
      bodyProps: toStorableBodyProps(bodyProps),
    };
  };

  return (
    <AddToReportMenuButton capture={capture} entityType={entity} variant={variant} size={size} showLabel={showLabel} />
  );
};

export default AddToReportButton;
