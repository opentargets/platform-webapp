import { Suspense, useMemo } from "react";
import type { Widget } from "sections";
import usePermissions from "../../hooks/usePermissions";
import SectionLoader from "./SectionLoader";

type SectionsRendererProps = {
  id: string | { ensgId: string; efoId: string };
  label: string | { symbol: string; name: string };
  entity: string;
  widgets: Widget[];
};

function SectionsRenderer({ id, label, entity, widgets }: SectionsRendererProps) {
  const { isPartnerPreview } = usePermissions();

  // widget.getBodyComponent() creates a brand-new React.lazy() wrapper on every
  // call, so it must only be invoked once per widget. Calling it inline during
  // render (as before) gave every Body a new component identity on every render of
  // this component, forcing React to unmount/remount every section body - and
  // re-fire its data-fetching effects from scratch - on every re-render, not just
  // on real navigation between entities.
  const bodyComponents = useMemo(
    () => widgets.map((widget) => ({ widget, Body: widget.getBodyComponent() })),
    [widgets]
  );

  return (
    <>
      {bodyComponents.map(({ widget, Body }) => {
        const isPrivate = widget.definition.isPrivate;
        if (isPrivate && !isPartnerPreview) {
          return null;
        }
        return (
          <Suspense key={widget.definition.id} fallback={<SectionLoader />}>
            <Body id={id} label={label} entity={entity} />
          </Suspense>
        );
      })}
    </>
  );
}

export default SectionsRenderer;
