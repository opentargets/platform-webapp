import { faProjectDiagram } from "@fortawesome/free-solid-svg-icons";

import { Header as HeaderBase } from "ui";

function EvidenceHeader({ loading, symbol, name }) {
  return (
    <HeaderBase
      loading={loading}
      title={`Evidence for ${symbol} in ${name}`}
      Icon={faProjectDiagram}
    />
  );
}

export default EvidenceHeader;
