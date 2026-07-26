import {
  faChartBar,
  faDna,
  faMapPin,
  faPrescriptionBottleMedical,
  faStethoscope,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { styled } from "@mui/material/styles";
import { Link, useSearchState, GridLegacy, Chip } from "ui";

const StyledChip = styled(Chip)(({ theme }) => ({
  border: 1,
  fontSize: "12px",
  fontWeight: "bold",
  boxShadow: 0,
  "&:hover": {
    color: theme.palette.primary.dark,
    background: theme.palette.grey[100],
  },
  "&:hover .MuiChip-icon": {
    color: theme.palette.primary.dark,
  },
}));

interface SearchSuggestion {
  id: string;
  name: string;
}

function HomePageSuggestions() {
  const { searchSuggestions } = useSearchState() as { searchSuggestions: SearchSuggestion[] };
  return (
    <GridLegacy container justifyContent="center" gap={1.5} sx={{ mt: 4 }}>
      <Link asyncTooltip to={`/target/${searchSuggestions[0].id}/associations`}>
        <StyledChip
          variant="filled"
          size="medium"
          sx={{ pl: 1, borderRadius: 2 }}
          icon={<FontAwesomeIcon icon={faDna} />}
          label={searchSuggestions[0].name}
        />
      </Link>
      <Link asyncTooltip to={`/target/${searchSuggestions[1].id}/associations`}>
        <StyledChip
          variant="filled"
          size="medium"
          sx={{ pl: 1, borderRadius: 2 }}
          icon={<FontAwesomeIcon icon={faDna} />}
          label={searchSuggestions[1].name}
        />
      </Link>
      <Link asyncTooltip to={`/disease/${searchSuggestions[2].id}/associations`}>
        <StyledChip
          variant="filled"
          size="medium"
          sx={{ pl: 1, borderRadius: 2 }}
          icon={<FontAwesomeIcon icon={faStethoscope} />}
          label={searchSuggestions[2].name}
        />
      </Link>
      <Link asyncTooltip to={`/disease/${searchSuggestions[3].id}/associations`}>
        <StyledChip
          variant="filled"
          size="medium"
          sx={{ pl: 1, borderRadius: 2 }}
          icon={<FontAwesomeIcon icon={faStethoscope} />}
          label={searchSuggestions[3].name}
        />
      </Link>
      <Link asyncTooltip to={`/drug/${searchSuggestions[4].id}`}>
        <StyledChip
          variant="filled"
          size="medium"
          sx={{ pl: 1, borderRadius: 2 }}
          icon={<FontAwesomeIcon icon={faPrescriptionBottleMedical} />}
          label={searchSuggestions[4].name}
        />
      </Link>
      <Link asyncTooltip to={`/drug/${searchSuggestions[5].id}`}>
        <StyledChip
          variant="filled"
          size="medium"
          sx={{ pl: 1, borderRadius: 2 }}
          icon={<FontAwesomeIcon icon={faPrescriptionBottleMedical} />}
          label={searchSuggestions[5].name}
        />
      </Link>
      <Link asyncTooltip to={`/variant/${searchSuggestions[6].id}`}>
        <StyledChip
          variant="filled"
          size="medium"
          sx={{ pl: 1, borderRadius: 2 }}
          icon={<FontAwesomeIcon icon={faMapPin} />}
          label={searchSuggestions[6].name}
        />
      </Link>
      <Link asyncTooltip to={`/variant/${searchSuggestions[7].id}`}>
        <StyledChip
          variant="filled"
          size="medium"
          sx={{ pl: 1, borderRadius: 2 }}
          icon={<FontAwesomeIcon icon={faMapPin} />}
          label={searchSuggestions[7].name}
        />
      </Link>
      <Link asyncTooltip to={`/study/${searchSuggestions[8].id}`}>
        <StyledChip
          variant="filled"
          size="medium"
          sx={{ pl: 1, borderRadius: 2 }}
          icon={<FontAwesomeIcon icon={faChartBar} />}
          label={searchSuggestions[8].name}
        />
      </Link>
      <Link asyncTooltip to={`/study/${searchSuggestions[9].id}`}>
        <StyledChip
          variant="filled"
          size="medium"
          sx={{ pl: 1, borderRadius: 2 }}
          icon={<FontAwesomeIcon icon={faChartBar} />}
          label={searchSuggestions[9].name}
        />
      </Link>
    </GridLegacy>
  );
}
export default HomePageSuggestions;
