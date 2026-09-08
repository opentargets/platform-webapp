import { InputLabel, Box } from "@mui/material";
import { useLiterature } from "./LiteratureContext";

function CountInfo() {
  const { pageSize, litsCount, loadingEntities } = useLiterature();
  const getLabelText = () => {
    if (loadingEntities) return "Loading count...";
    return `Showing ${litsCount > pageSize ? pageSize : litsCount} of ${litsCount} results`;
  };

  return (
    <Box sx={{ mt: 4, mr: 3 }}>
      <InputLabel>{getLabelText()}</InputLabel>
    </Box>
  );
}

export default CountInfo;
