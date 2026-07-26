import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUpRightFromSquare, faCircleCheck, faCircleNotch } from "@fortawesome/free-solid-svg-icons";
import {
  DetailPopover,
  Link,
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  MuiButton as Button,
  MuiChip as Chip,
} from "ui";

type Disease = { label?: string; disease_id: string };

type ProjectData = {
  otar_code: string;
  project_name: string;
  project_lead: string;
  generates_data: string;
  integrated_into_PPP: "Y" | "N";
  integrated_into_Public: "Y" | "N";
  project_status: string;
  open_targets_therapeutic_area: string;
  disease_mapping: Disease[];
};

const INTEGRATION_ICON = {
  Y: faCircleCheck,
  N: faCircleNotch,
};

function IntegrationBadge({ label, value }: { label: string; value: "Y" | "N" }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
      <Box
        component="span"
        sx={{ color: value === "Y" ? "primary.main" : "grey.400", display: "flex" }}
      >
        <FontAwesomeIcon icon={INTEGRATION_ICON[value]} size="sm" />
      </Box>
      <Typography variant="caption" color={value === "Y" ? "text.primary" : "text.disabled"}>
        {label}
      </Typography>
    </Box>
  );
}

function ProjectCard({ data }: { data: ProjectData }) {
  const diseases = data.disease_mapping?.filter(d => d?.disease_id) ?? [];

  return (
    <Card
      sx={{
        width: "350px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxShadow: "none",
        border: theme => `1px solid ${theme.palette.grey[300]}`,
      }}
    >
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {/* OTAR code overline */}
        {data.otar_code && (
          <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1, mb: 0.5 }}>
            {data.otar_code}
          </Typography>
        )}

        {/* Project name */}
        <Typography
          variant="h6"
          component="div"
          sx={{
            fontWeight: "bold",
            lineHeight: 1.3,
            mb: 0.5,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {data.project_name}
        </Typography>

        {/* Lead + Status */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="body2" color="text.secondary">
            {data.project_lead}
          </Typography>
          <Chip
            size="small"
            label={data.project_status}
            color={data.project_status === "Active" ? "success" : "default"}
            variant="outlined"
          />
        </Box>

        {/* Therapeutic area */}
        <Typography variant="body2" color="text.secondary">
          {data.open_targets_therapeutic_area}
        </Typography>

        {/* Integration status */}
        <Box sx={{ display: "flex", gap: 2 }}>
          <IntegrationBadge label="PPP" value={data.integrated_into_PPP} />
          <IntegrationBadge label="Public" value={data.integrated_into_Public} />
        </Box>

        {/* Diseases */}
        {diseases.length > 0 && (
          <Box sx={{ mt: 0.5 }}>
            <DetailPopover
              title={`${diseases.length} disease${diseases.length !== 1 ? "s" : ""}`}
              popoverId={`diseases-${data.otar_code}`}
            >
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, maxWidth: 280 }}>
                {diseases.map(d => (
                  <Link key={d.disease_id} to={`/disease/${d.disease_id}`} asyncTooltip>
                    <Chip
                      size="small"
                      label={d.label || d.disease_id}
                      clickable
                      variant="outlined"
                      sx={{ color: "text.secondary", borderColor: "grey.300" }}
                    />
                  </Link>
                ))}
              </Box>
            </DetailPopover>
          </Box>
        )}
      </CardContent>

      <CardActions sx={{ px: 2, pb: 2 }}>
        {data.otar_code && (
          <Link to={`http://home.opentargets.org/${data.otar_code}`} external newTab>
            <Button variant="outlined" color="primary" sx={{ gap: 1 }}>
              View Project
              <FontAwesomeIcon icon={faArrowUpRightFromSquare} size="sm" />
            </Button>
          </Link>
        )}
      </CardActions>
    </Card>
  );
}

export default ProjectCard;
