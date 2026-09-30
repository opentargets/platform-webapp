import type { ReactElement } from "react";
import Link from "./Link";
import OTTooltip from "./Tooltip";

type DirectionOfEffectTooltipProps = {
  docsUrl: string;
};

function DirectionOfEffectTooltip({ docsUrl }: DirectionOfEffectTooltipProps): ReactElement {
  return (
    <OTTooltip
      showHelpIcon
      title={
        <Link external to={docsUrl} footer={false}>
          More info on our assessment method
        </Link>
      }
      style={{}}
    >
      Direction of Effect
    </OTTooltip>
  );
}

export default DirectionOfEffectTooltip;
