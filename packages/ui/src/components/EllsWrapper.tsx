import { ReactElement } from "react";

type EllsWrapperProps = {
  title?: string;
  children?: ReactElement | string;
};

function EllsWrapper({ children, title }: EllsWrapperProps): ReactElement {
  return (
    <div
      style={{
        display: "inline-block",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        maxWidth: "100%",
        verticalAlign: "bottom",
      }}
      title={title || (children as string)}
    >
      {children}
    </div>
  );
}

export default EllsWrapper;
