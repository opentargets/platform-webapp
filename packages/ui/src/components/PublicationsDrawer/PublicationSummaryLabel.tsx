import { Typography } from "@mui/material";

function PublicationSummaryLabel() {
  return (
    <div style={{ position: "absolute", right: "2%" }}>
      <b>
        <Typography variant="caption">Powered by OpenAI</Typography>
      </b>
    </div>
  );
}

export default PublicationSummaryLabel;
