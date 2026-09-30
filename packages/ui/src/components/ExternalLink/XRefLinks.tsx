import { Box } from "@mui/material";
import { useState } from "react";

import Link from "../Link";

type XRefLinksProps = {
  label: string;
  urlBuilder?: (id: string) => string;
  urlStem: string;
  ids: string[];
  names?: string[];
  limit: number;
};

function XRefLinks({ label, urlBuilder, urlStem, ids, names, limit }: XRefLinksProps) {
  const [showMore, setShowMore] = useState(false);
  const displayNone = {
    display: "none",
  };

  return (
    <span data-testid={`header-external-links-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      {label}:{" "}
      {ids.map((id, i) => (
        <span key={id} style={i > limit - 1 && !showMore ? displayNone : {}}>
          <Link external to={urlBuilder?.(id) ?? `${urlStem}${id}`}>
            {names?.[i] ?? id}
          </Link>
          {i < ids.length - 1 ? ", " : ""}
        </span>
      ))}
      {ids.length > limit ? (
        <span>
          {showMore ? "" : "... "}[{" "}
          <Box
            component="span"
            sx={{ color: "primary.main", cursor: "pointer" }}
            onClick={() => setShowMore(!showMore)}
          >
            {showMore ? " hide" : " show more"}
          </Box>{" "}
          ]
        </span>
      ) : null}
    </span>
  );
}

export default XRefLinks;
