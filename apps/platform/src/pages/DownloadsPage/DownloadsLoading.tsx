import { Box, Card, CardContent, Paper, Skeleton, Typography } from "ui";
import { v1 } from "uuid";
import { DEFAULT_RATIO } from "./hooks/useResizableSplit";

function DownloadsLoading() {
  const emptyDownloadsArray = new Array(12).fill("");

  return (
    <Box>
      <DownloadsHeaderLoading />
      <DownloadsTagsLoading />
      <DownloadsFilterLoading />

      <Box
        sx={{
          display: "grid",
          // Mirrors DownloadsPage's split grid: cards pane + divider gap +
          // graph pane, collapsing to a plain two-column layout below `md`
          // where the draggable divider doesn't render. The real page's split
          // isn't persisted (see useResizableSplit), so the skeleton can just
          // use the same fixed starting ratio every time.
          gridTemplateColumns: {
            xs: "minmax(0, 7fr) minmax(0, 3fr)",
            md: `${DEFAULT_RATIO}fr 28px ${1 - DEFAULT_RATIO}fr`,
          },
          gap: { xs: 3, md: 0 },
          alignItems: "start",
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 2,
            overflow: "hidden",
          }}
        >
          {emptyDownloadsArray.map(() => (
            <DownloadsCardLoading key={v1()} />
          ))}
        </Box>

        <Box sx={{ display: { xs: "none", md: "block" } }} />

        <Box sx={{ height: 420, overflow: "hidden" }}>
          <Skeleton variant="rounded" height="100%" />
        </Box>
      </Box>
    </Box>
  );
}

function DownloadsCardLoading() {
  return (
    <Card
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxShadow: "none",
        border: theme => `1px solid ${theme.palette.grey[300]}`,
      }}
    >
      <CardContent
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          height: 1,
        }}
      >
        <Box>
          <Skeleton variant="text" width="70%" height={32} sx={{ mb: 1 }} />
          <Skeleton variant="text" />
          <Skeleton variant="text" width="80%" />
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, my: 1 }}>
          <Skeleton variant="rounded" width={70} height={20} sx={{ borderRadius: 4 }} />
          <Skeleton variant="rounded" width={36} height={20} sx={{ borderRadius: 4 }} />
        </Box>
      </CardContent>
      <Box sx={{ display: "flex", flexDirection: "column", width: 1, pb: 3, px: 2, gap: 1 }}>
        <Skeleton variant="rounded" height={40} />
        <Skeleton variant="rounded" height={40} />
      </Box>
    </Card>
  );
}

function DownloadsFilterLoading() {
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
        px: 2,
        py: 1.5,
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 1.25,
        backgroundColor: "background.paper",
      }}
    >
      <Skeleton variant="rounded" width={220} height={40} />
      {chipsArray.map(() => (
        <Skeleton key={v1()} variant="rounded" width={90} height={24} sx={{ borderRadius: 4 }} />
      ))}
      <Box sx={{ flex: 1 }} />
      <Skeleton variant="text" width={80} />
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
