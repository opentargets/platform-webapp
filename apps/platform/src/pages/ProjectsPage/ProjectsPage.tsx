import { useMemo, useState } from "react";
import { Box, Grid, Typography } from "@mui/material";
import { Link } from "ui";
import ProjectCard from "./ProjectCard";
import ProjectsFilter, { EMPTY_FILTERS } from "./ProjectsFilter";
import projectsData from "./projects-data.json";

const FILTER_GROUPS = [
  {
    key: "integration",
    label: "Integration",
    options: ["PPP only", "PPP", "Public"],
  },
  {
    key: "project_status",
    label: "Project Status",
    options: [...new Set(projectsData.map(p => p.project_status))].sort(),
  },
  {
    key: "open_targets_therapeutic_area",
    label: "Research & Development Area",
    options: [...new Set(projectsData.map(p => p.open_targets_therapeutic_area))].sort(),
  },
];

function sortProjects(projects, sortBy) {
  return [...projects].sort((a, b) => {
    if (sortBy === "integrated_into_PPP") {
      if (a.integrated_into_PPP === b.integrated_into_PPP) return 0;
      return a.integrated_into_PPP === "Y" ? -1 : 1;
    }
    return (a[sortBy] ?? "").localeCompare(b[sortBy] ?? "");
  });
}

function matchesFilters(project, filters) {
  const q = filters.search.toLowerCase();
  if (q) {
    const haystack = [
      project.project_name,
      project.otar_code,
      project.project_lead,
      project.project_status,
      project.open_targets_therapeutic_area,
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  if (filters.project_status.length > 0 && !filters.project_status.includes(project.project_status))
    return false;
  if (
    filters.open_targets_therapeutic_area.length > 0 &&
    !filters.open_targets_therapeutic_area.includes(project.open_targets_therapeutic_area)
  )
    return false;
  if (filters.integration.length > 0) {
    const ok = filters.integration.every(
      i =>
        (i === "PPP" && project.integrated_into_PPP === "Y") ||
        (i === "PPP only" &&
          project.integrated_into_PPP === "Y" &&
          project.integrated_into_Public === "N") ||
        (i === "Public" && project.integrated_into_Public === "Y")
    );
    if (!ok) return false;
  }
  return true;
}

function ProjectPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const filteredProjects = useMemo(
    () => sortProjects(projectsData.filter(p => matchesFilters(p, filters)), filters.sortBy),
    [filters]
  );

  return (
    <>
      <Typography variant="h4" component="h1" paragraph>
        Open Targets Projects
      </Typography>
      <Typography paragraph>
        The cards below contain key information on the OTAR projects, their status and data
        availability into the PPP.
      </Typography>
      <Typography paragraph>
        For further information, please see{" "}
        <Link to="http://home.opentargets.org/data-available" external newTab>
          here
        </Link>{" "}
        or contact us at{" "}
        <Link to="mailto: datarequests@opentargets.org" external>
          datarequests@opentargets.org
        </Link>
        .
      </Typography>
      <Typography paragraph>
        PPP specific documentation can be found{" "}
        <Link to="http://home.opentargets.org/ppp-documentation" external newTab>
          here
        </Link>
      </Typography>

      <Grid container sx={{ display: "flex", justifyContent: "space-between" }}>
        <Grid item xs={12} md={3} lg={2} sx={{ display: "flex", justifyContent: "center" }}>
          <ProjectsFilter
            filters={filters}
            filterGroups={FILTER_GROUPS}
            onChange={setFilters}
          />
        </Grid>
        <Grid
          item
          xs={12}
          md={9}
          lg={10}
          sx={{ display: "flex", flexDirection: "column", gap: 1, pl: { md: 2 } }}
        >
          <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>
            All Projects ({filteredProjects.length})
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 2 }}>
            {filteredProjects.map(project => (
              <ProjectCard key={project.otar_code} data={project} />
            ))}
          </Box>
        </Grid>
      </Grid>
    </>
  );
}

export default ProjectPage;
