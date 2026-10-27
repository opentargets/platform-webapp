import { Box, Paper, Skeleton, Typography } from "ui";
import { v1 } from "uuid";
import { RADIUS } from "./components/tokens";

function DownloadsLoading() {
  const emptyDownloadsArray = new Array(12).fill("");

  return (
    <Box>
      <DownloadsHeaderLoading />
      <DownloadsTagsLoading />
      <DownloadsToolbarLoading />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 2,
          overflow: "hidden",
        }}
      >
        {emptyDownloadsArray.map(() => (
          <DatasetCardLoading key={v1()} />
        ))}
      </Box>
    </Box>
  );
}

function DatasetCardLoading() {
  return (
    <Box
      sx={theme => ({
        display: "flex",
        flexDirection: "column",
        gap: 1.25,
        padding: 2,
        border: `1px solid ${theme.palette.grey[300]}`,
        borderRadius: RADIUS,
      })}
    >
      <Box>
        <Skeleton variant="text" width="70%" height={24} />
        <Skeleton variant="text" width="40%" height={16} />
      </Box>
      <Box>
        <Skeleton variant="text" />
        <Skeleton variant="text" width="80%" />
      </Box>
      <Skeleton variant="rounded" width={90} height={14} sx={{ borderRadius: 4 }} />
      <Box sx={{ display: "flex", gap: 0.75, mt: "auto" }}>
        <Skeleton variant="rounded" width={84} height={30} />
        <Skeleton variant="rounded" width={100} height={30} />
        <Box sx={{ flex: 1 }} />
        <Skeleton variant="rounded" width={68} height={30} />
      </Box>
    </Box>
  );
}

function DownloadsToolbarLoading() {
  const chipsArray = new Array(6).fill(0);
  return (
    <Paper
      variant="outlined"
      elevation={0}
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        mb: 3,
        padding: "12px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 1.25,
        borderRadius: RADIUS,
        backgroundColor: "background.paper",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Skeleton variant="rounded" width={260} height={32} />
        <Skeleton variant="text" width={60} />
        <Box sx={{ flex: 1 }} />
        <Skeleton variant="rounded" width={170} height={40} />
        <Skeleton variant="rounded" width={96} height={32} />
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
        <Skeleton variant="text" width={56} />
        {chipsArray.map(() => (
          <Skeleton key={v1()} variant="rounded" width={90} height={24} sx={{ borderRadius: 12 }} />
        ))}
      </Box>
    </Paper>
  );
}

function DownloadsTagsLoading() {
  const chipsArray = new Array(4).fill(0);
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3, p: 1, flexWrap: "wrap" }}>
      {chipsArray.map(() => (
        <Skeleton key={v1()} variant="rounded" width={100} height={28} sx={{ borderRadius: 4 }} />
      ))}
    </Box>
  );
}

function DownloadsHeaderLoading() {
  return (
    <Box>
      <Typography variant="h4" component="h1" paragraph>
        <Skeleton width="320px" />
      </Typography>
      <Typography paragraph>
        <Skeleton />
        <Skeleton width="60%" />
      </Typography>
    </Box>
  );
}

export default DownloadsLoading;
