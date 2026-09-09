import {
  faBackwardStep,
  faChevronLeft,
  faChevronRight,
  faForwardStep,
} from "@fortawesome/free-solid-svg-icons";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, IconButton } from "@mui/material";

export function PaginationActionsComplete({ count, page, rowsPerPage, onPageChange }) {
  const handleFirstPageButtonClick = (event) => {
    onPageChange(event, 0);
  };

  const handleBackButtonClick = (event) => {
    onPageChange(event, page - 1);
  };

  const handleNextButtonClick = (event) => {
    onPageChange(event, page + 1);
  };

  const handleLastPageButtonClick = (event) => {
    onPageChange(event, Math.max(0, Math.ceil(count / rowsPerPage) - 1));
  };

  return (
    <Box sx={{ flexShrink: 0 }}>
      <IconButton
        data-testid="pagination-first-button"
        aria-label="First result page of table"
        onClick={handleFirstPageButtonClick}
        disabled={page === 0}
      >
        <FontAwesomeIcon size="2xs" icon={faBackwardStep} />
      </IconButton>
      <IconButton
        data-testid="pagination-previous-button"
        aria-label="Previous result page of table"
        onClick={handleBackButtonClick}
        disabled={page === 0}
      >
        <FontAwesomeIcon size="2xs" icon={faChevronLeft} />
      </IconButton>
      <IconButton
        data-testid="pagination-next-button"
        aria-label="Next result page of table"
        onClick={handleNextButtonClick}
        disabled={page >= Math.ceil(count / rowsPerPage) - 1}
      >
        <FontAwesomeIcon size="2xs" icon={faChevronRight} />
      </IconButton>
      <IconButton
        data-testid="pagination-last-button"
        aria-label="Last result page of table"
        onClick={handleLastPageButtonClick}
        disabled={page >= Math.ceil(count / rowsPerPage) - 1}
      >
        <FontAwesomeIcon size="2xs" icon={faForwardStep} />
      </IconButton>
    </Box>
  );
}
