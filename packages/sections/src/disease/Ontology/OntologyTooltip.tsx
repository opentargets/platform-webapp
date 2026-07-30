import { StyledMUITooltip } from "ui";

function OntologyTooltip({ children, title, placement = "top" }) {
  return (
    <StyledMUITooltip placement={placement} title={title}>
      {children}
    </StyledMUITooltip>
  );
}

export default OntologyTooltip;
