import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, Typography } from "@mui/material";
import Link from "../Link";

const docsLink = "https://platform-docs.opentargets.org/variant";

function VariantMessage({ inputValue }: { inputValue: string }) {
  return (
    <Box
      data-testid="global-search-variant-message"
      sx={{
        display: "flex",
        alignItems: "center",
        borderRadius: 0.5,
        gap: 1,
        pl: 2,
        pr: 1,
        py: 1,
        my: 1,
      }}
    >
      <Box>
        <FontAwesomeIcon icon={faInfoCircle} />
      </Box>
      <Typography variant="body2" fontStyle="italic">
        No exact variant match found. Only variants with known phenotypic associations are included.{" "}
        <Link external newTab to={docsLink}>
          Documentation
        </Link>
      </Typography>
    </Box>
  );
}
export default VariantMessage;
