import {
  Box,
  Card,
  CardActions,
  CardContent,
  GridLegacy,
  Paper,
  Skeleton,
  Typography,
} from "@mui/material";
import { v1 } from "uuid";

function DownloadsLoading() {
  const emptyDownloadsArray = new Array(36).fill("");

  return (
    <Box>
      <DownloadsHeaderLoading />
      <DownloadsTagsLoading />
      <GridLegacy container sx={{ display: "flex", justifyContent: "space-between" }}>
        <GridLegacy item xs={12} md={3} lg={2}>
          <DownloadsFilterLoading />
        </GridLegacy>
        <GridLegacy
          item
          xs={12}
          md={9}
          lg={10}
          sx={{ display: "flex", flexDirection: "column", gap: 1, pl: { md: 2 } }}
        >
          <Typography variant="h6" sx={{ display: "flex", fontWeight: "bold", mb: 2 }}>
            All Datasets <Skeleton width={20} sx={{ mx: 1, px: 1 }} />
          </Typography>
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 2,
            }}
          >
            {emptyDownloadsArray.map(e => (
              <DownloadsCardLoading key={v1()} />
            ))}
          </Box>
        </GridLegacy>
      </GridLegacy>
    </Box>
  );
}

function DownloadsCardLoading() {
  return (
    <Card
      sx={{
        width: "350px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
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
          width: 1,
        }}
      >
        <Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 1,
              gap: 1,
            }}
          >
            <Typography variant="h6" component="div" sx={{ fontWeight: "bold" }}>
              <Skeleton height={50} width={150} />
            </Typography>
            <Skeleton height={40} width={50} sx={{ borderRadius: 8 }} />
          </Box>

          <Skeleton variant="rounded" height={120} />
          <br />
          <Typography component="span" sx={{ color: "text.secondary", mb: 1.5 }}>
            <Skeleton height={40} width={50} sx={{ borderRadius: 8 }} />
          </Typography>
        </Box>
      </CardContent>
      <CardActions sx={{ display: "flex", width: 1, pb: 2, px: 2 }}>
        <Box sx={{ width: "50%" }}>
          <Skeleton height={50} />
        </Box>
        <Box sx={{ width: "50%" }}>
          <Skeleton height={50} />
        </Box>
      </CardActions>
    </Card>
  );
}

function DownloadsFilterLoading() {
  return (
    <Paper
      variant="outlined"
      elevation={0}
      sx={{ width: "100%", maxWidth: "350px", justifySelf: "center", mb: 2 }}
    >
      <Box sx={{ p: 3 }}>
        <Typography
          variant="h6"
          component="div"
          sx={{ wordBreak: "break-all", fontWeight: "bold", mb: 2 }}
        >
          Filters
        </Typography>
        <Skeleton height={50} width="100%" />
        <Typography variant="subtitle1" component="div" sx={{ fontWeight: "bold" }}>
          Data Categories
        </Typography>
        <Skeleton height={300} />
      </Box>
    </Paper>
  );
}

function DownloadsTagsLoading() {
  const chipsArray = new Array(4).fill(0);
  return (
    <Box sx={{ display: "flex", gap: 3, my: 1, flexWrap: "wrap" }}>
      {chipsArray.map(e => (
        <Box key={v1()} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Skeleton width={80} height={50} sx={{ borderRadius: 10 }} />
        </Box>
      ))}
    </Box>
  );
}

function DownloadsHeaderLoading() {
  return (
    <Box>
      <Typography variant="h2">
        <Skeleton width="500px" />
      </Typography>
      <Typography variant="body1">
        <Skeleton />
        <Skeleton />
        <Skeleton sx={{ display: { xs: "block", md: "none" } }} />
        <Skeleton sx={{ display: { xs: "block", lg: "none" } }} />
        <Skeleton sx={{ display: { xs: "block", xl: "none" } }} />
      </Typography>
    </Box>
  );
}

export default DownloadsLoading;
