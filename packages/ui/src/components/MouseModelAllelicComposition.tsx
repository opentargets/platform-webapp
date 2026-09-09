import { Typography } from "@mui/material";
import type { ReactNode } from "react";

type MouseModelAllelicCompositionProps = {
  allelicComposition: string;
  geneticBackground: string;
};

function MouseModelAllelicComposition({
  allelicComposition,
  geneticBackground,
}: MouseModelAllelicCompositionProps): ReactNode {
  const regex = /(.*)<(.*)>\/([^<]*)<?([^>]*)?>?/;
  const match = regex.exec(allelicComposition);
  return (
    <>
      <Typography variant="body2">
        {match !== null ? (
          <>
            {match[1]}
            <sup>{match[2]}</sup>/{match[3]}
            <sup>{match[4]}</sup>
          </>
        ) : (
          allelicComposition
        )}
      </Typography>
      <Typography variant="caption">{geneticBackground}</Typography>
    </>
  );
}

export default MouseModelAllelicComposition;
