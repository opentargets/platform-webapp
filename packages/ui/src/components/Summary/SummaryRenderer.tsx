import type { Widget } from "sections";
import { v1 } from "uuid";
import usePermissions from "../../hooks/usePermissions";

type SummaryRendererProps = {
  widgets: Widget[];
  useKeys?: boolean;
  keyPrefix?: string;
};

function SummaryRenderer({ widgets, useKeys = true, keyPrefix = "summary" }: SummaryRendererProps) {
  const { isPartnerPreview } = usePermissions();
  return (
    <>
      {widgets.map((widget, index) => {
        const Summary = widget.Summary;
        const key = useKeys ? `${keyPrefix}-${v1()}` : `${keyPrefix}-${index}`;
        // If the widget is private and we are not in partner preview, don't render it
        if (widget.definition.isPrivate && !isPartnerPreview) {
          return null;
        }
        return <Summary key={key} />;
      })}
    </>
  );
}

export default SummaryRenderer;
