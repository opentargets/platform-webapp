import { faStar } from "@fortawesome/free-regular-svg-icons";
import { faStar as faStarSolid } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useTheme } from "@mui/material/styles";

type ClinvarStarsProps = {
  num: number;
  length?: number;
};

function ClinvarStars({ num, length = 4 }: ClinvarStarsProps) {
  const theme = useTheme();

  const stars = [];
  for (let i = 0; i < length; i++) {
    stars.push(
      <FontAwesomeIcon
        key={i}
        color={theme.palette.primary.main}
        icon={num > i ? faStarSolid : faStar}
      />
    );
  }

  return stars;
}

export default ClinvarStars;
