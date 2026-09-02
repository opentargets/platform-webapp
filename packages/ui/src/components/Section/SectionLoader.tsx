import { Box, Card, CardContent, Divider, GridLegacy, Skeleton } from "@mui/material";
import { v1 } from "uuid";

type SectionContainerLoaderProps = {
  sectionsCount?: number;
};

function SectionLoader({ sectionsCount = 1 }: SectionContainerLoaderProps) {
  const loadingSections = Array.from(Array(sectionsCount));

  return loadingSections.map((_, i) => (
    <GridLegacy key={v1()} item xs={12}>
      <section data-testid="section-loader">
        <Card elevation={0} variant="outlined">
          <Box sx={{ p: 2, display: "flex", gap: 1, alignItems: "center" }}>
            <Skeleton animation="wave" variant="circular" width={40} height={40} />
            <Box sx={{ flex: 1 }}>
              <Skeleton animation="wave" height={30} width="20%" style={{ marginBottom: 1 }} />
              <Skeleton animation="wave" height={20} width="60%" />
            </Box>
          </Box>
          <Divider />
          <CardContent>
            <Skeleton key={v1()} height="390px" width="100%" />
          </CardContent>
        </Card>
      </section>
    </GridLegacy>
  ));
}
export default SectionLoader;
