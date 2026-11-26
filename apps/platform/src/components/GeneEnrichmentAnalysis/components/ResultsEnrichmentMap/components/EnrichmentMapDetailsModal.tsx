import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  Button,
  Chip,
  MuiLink,
  MuiTooltip as Tooltip,
  Divider,
  Stack,
} from "ui";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy, faCheck} from "@fortawesome/free-solid-svg-icons";
import { useState, useEffect, useMemo } from "react";
import { useApolloClient } from "@apollo/client";
import {
  getGeneTargetUrl,
  buildGeneToTargetIdMapping,
  buildAOTFLink,
  getTargetIdsFromMapping,
  mappingFromGenes,
} from "../utils/geneMapping";
import type { Gene } from "../../../types";

interface NodeData {
  id: string;
  pathway?: string;
  link?: string;
  nes?: number;
  fdr?: number;
  pValue?: number;
  pathwaySize?: number;
  geneCount?: number;
  displayLabel?: string;
  leadingGenes?: string[];
  pathwayGenes?: string[];
}

interface EdgeData {
  id: string;
  source?: string;
  target?: string;
  sourceName?: string;
  targetName?: string;
  sourceLink?: string;
  targetLink?: string;
  sharedCount?: number;
  sharedGenes?: string[];
  similarityIndex?: number;
}

interface EnrichmentMapDetailsModalProps {
  open: boolean;
  type: "node" | "edge" | null;
  data: NodeData | EdgeData | null;
  onClose: () => void;
  diseaseId?: string; // Optional disease ID for AOTF links
  genes?: Gene[]; // Input genes of the run; their Ensembl IDs seed the target links
}

/**
 * Node Details Content Component
 */
function NodeDetailsContent({
  data,
  diseaseId,
  geneToTargetIdMapping,
  resolving,
}: {
  data: NodeData;
  diseaseId?: string;
  geneToTargetIdMapping?: Map<string, string>;
  resolving?: boolean;
}) {
  return (
    <>
      <Box>
        <Typography variant="subtitle2" fontWeight={600}>
          Pathway Name
        </Typography>
        {data.link ? (
          <MuiLink href={data.link} target="_blank" rel="noopener noreferrer" variant="body2">
            {data.pathway}
          </MuiLink>
        ) : (
          <Typography variant="body2">{data.pathway}</Typography>
        )}
      </Box>

      <Divider />

      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">
            NES Score
          </Typography>
          <Typography variant="body2" fontWeight={500}>
            {(data.nes as number)?.toFixed(3)}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">
            FDR p-value
          </Typography>
          <Typography variant="body2" fontWeight={500}>
            {(data.fdr as number)?.toExponential(2)}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">
            p-value
          </Typography>
          <Typography variant="body2" fontWeight={500}>
            {(data.pValue as number)?.toExponential(2)}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Pathway Size
          </Typography>
          <Typography variant="body2" fontWeight={500}>
            {data.pathwaySize}
          </Typography>
        </Box>
      </Box>

      {data?.pathwayGenes && data.pathwayGenes.length > 0 && (
        <Box>
          <GeneList
            title="Pathway Genes"
            genes={Array.isArray(data.pathwayGenes) ? data.pathwayGenes : data.pathwayGenes.split(",") || []}
            diseaseId={diseaseId}
            geneToTargetIdMapping={geneToTargetIdMapping}
            resolving={resolving}
          />
        </Box>
      )}
    </>
  );
}

type GeneListProps = {
  genes: string[];
  diseaseId?: string;
  geneToTargetIdMapping?: Map<string, string>;
  /** True while symbols are still being resolved to target IDs */
  resolving?: boolean;
};

export function GeneList({
  title,
  genes,
  diseaseId,
  geneToTargetIdMapping,
  resolving = false,
}: GeneListProps & { title: string }) {
  const [copied, setCopied] = useState(false);
  const filteredGenes = useMemo(() => genes.filter((gene) => gene.trim() !== ""), [genes]);

    const handleCopyGenes = async () => {
    const geneText = (filteredGenes || []).join("\n");
    try {
      await navigator.clipboard.writeText(geneText);
      setCopied(true);
      // Reset the icon after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("[COPY_GENES] Failed to copy to clipboard:", err);
    }
  };

  const aotfLink = useMemo(() => {
    const targetIds = getTargetIdsFromMapping(filteredGenes, geneToTargetIdMapping || new Map());
    // Only link when at least one gene resolved to a target; otherwise nothing could be pinned
    return targetIds.length > 0 ? buildAOTFLink(diseaseId, targetIds) : null;
  }, [filteredGenes, geneToTargetIdMapping, diseaseId]);

  const handleViewInAOTF = () => {
    if (aotfLink) window.open(aotfLink, "_blank", "noopener,noreferrer");
  };

  return (
    <Box>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: "center", mb: 1 }}
      >
        <Typography variant="subtitle2" fontWeight={600}>
          {title}: {filteredGenes.length}
        </Typography>

        <Tooltip title={copied ? "Copied!" : "Copy all genes"}>
          <IconButton
            size="small"
            onClick={handleCopyGenes}
            sx={{
              p: 0.5,
              "&:hover": {
                backgroundColor: "rgba(0, 0, 0, 0.04)",
              },
            }}
          >
            {copied ? (
              <FontAwesomeIcon
                icon={faCheck}
                style={{
                  fontSize: "12px",
                  color: "#4caf50",
                  fontWeight: "bold",
                }}
              />
            ) : (
              <FontAwesomeIcon
                icon={faCopy}
                style={{
                  fontSize: "12px",
                  color: "#1976d2",
                }}
              />
            )}
          </IconButton>
        </Tooltip>
      </Stack>

      <Box
        sx={{
          mt: 1,
          p: 1.5,
          bgcolor: "#f5f5f5",
          borderRadius: 1,
          maxHeight: 200,
          overflow: "auto",
        }}
      >
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
          {filteredGenes.map((gene, idx) => {
            const targetUrl = getGeneTargetUrl(gene, geneToTargetIdMapping || new Map());

            // No Ensembl ID resolved: render a plain chip rather than a broken /target/<symbol> link
            if (!targetUrl) {
              return (
                <Tooltip
                  key={`${gene}-${idx}`}
                  title={resolving ? "Resolving target…" : "No matching target found"}
                >
                  <Chip label={gene} variant="filled" size="small" component="span" />
                </Tooltip>
              );
            }

            return (
              <MuiLink
                key={`${gene}-${idx}`}
                href={targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  textDecoration: "none",
                  display: "inline-block",
                }}
              >
                <Chip
                  label={gene}
                  variant="filled"
                  size="small"
                  component="span"
                  sx={{
                    "&:hover": {
                      backgroundColor: "#e0e0e0",
                      cursor: "pointer",
                    },
                  }}
                />
              </MuiLink>
            );
          })}
        </Box>
      </Box>

      {aotfLink && (
        <Button
          onClick={handleViewInAOTF}
          size="small"
          variant="outlined"
          sx={{ mt: 1 }}
        >
          View genes in Disease Association page.
        </Button>
      )}
    </Box>
  );
}

/**
 * Edge Details Content Component
 */
function EdgeDetailsContent({
  data,
  geneToTargetIdMapping,
  diseaseId,
  resolving,
}: {
  data: EdgeData;
  geneToTargetIdMapping?: Map<string, string>;
  diseaseId?: string;
  resolving?: boolean;
}) {

  return (
    <>
      <Box>
        <Typography variant="subtitle2" fontWeight={600}>
          Connected Pathways
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 1, alignItems: "center" }}>
          <Box sx={{ flex: 1 }}>
            {data.sourceLink ? (
              <MuiLink href={data.sourceLink} target="_blank" rel="noopener noreferrer">
                {data.sourceName || data.source}
              </MuiLink>
            ) : (
              <Typography variant="body2">{data.sourceName || data.source}</Typography>
            )}
          </Box>
          <Typography variant="body2" sx={{ mx: 0.5 }}>
            →
          </Typography>
          <Box sx={{ flex: 1 }}>
            {data.targetLink ? (
              <MuiLink href={data.targetLink} target="_blank" rel="noopener noreferrer">
                {data.targetName || data.target}
              </MuiLink>
            ) : (
              <Typography variant="body2">{data.targetName || data.target}</Typography>
            )}
          </Box>
        </Stack>
      </Box>

      <Divider />

      <GeneList
        title="Shared Genes"
        genes={data.sharedGenes || []}
        diseaseId={diseaseId}
        geneToTargetIdMapping={geneToTargetIdMapping}
        resolving={resolving}
      />

      <Box>
        <Typography variant="caption" color="text.secondary">
          Similarity score
        </Typography>
        <Typography variant="body2" fontWeight={500}>
          {(data.similarityIndex as number)?.toFixed(3)}
        </Typography>
      </Box>
    </>
  );
}

/**
 * Main Modal Component
 */
export function EnrichmentMapDetailsModal({
  open,
  type,
  data,
  onClose,
  diseaseId,
  genes,
}: EnrichmentMapDetailsModalProps) {
  const apolloClient = useApolloClient();
  // IDs we already know from the run's input genes; no round trip needed for these
  const knownMapping = useMemo(() => mappingFromGenes(genes), [genes]);
  const [geneToTargetIdMapping, setGeneToTargetIdMapping] = useState<Map<string, string>>(
    knownMapping
  );
  const [resolving, setResolving] = useState(false);

  // Lazy-load gene mapping when modal opens with edge data
  useEffect(() => {
    if (!open || !data || (!(data as EdgeData).sharedGenes && !(data as NodeData).pathwayGenes)) {
      return;
    }

    let cancelled = false;
    setGeneToTargetIdMapping(knownMapping);

    const buildMapping = async () => {
      if (!apolloClient) return;
      setResolving(true);
      let sharedGenes: string[] = [];
      if( type === "edge") {
        sharedGenes = (data as EdgeData).sharedGenes || [];
      } else if (type === "node") {
        const leadingGenes = (data as NodeData).leadingGenes;
        const pathwayGenes = (data as NodeData).pathwayGenes;
        // Combine leading genes and pathway genes for mapping
        const leadingGenesList = Array.isArray(leadingGenes) 
          ? leadingGenes 
          : leadingGenes?.split(",") || [];
        const pathwayGenesList = Array.isArray(pathwayGenes) 
          ? pathwayGenes 
          : pathwayGenes?.split(",") || [];
        sharedGenes = [...new Set([...leadingGenesList, ...pathwayGenesList])];
      } else {
        sharedGenes = [];
      }
      const mapping = await buildGeneToTargetIdMapping(apolloClient, sharedGenes, knownMapping);
      if (!cancelled) {
        setGeneToTargetIdMapping(mapping);
        setResolving(false);
      }
    };

    buildMapping();
    return () => {
      cancelled = true;
    };
  }, [open, type, data, apolloClient, knownMapping]);

  if (!data) return null;



  const isNode = type === "node";
  const isEdge = type === "edge";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isNode ? "Pathway Details" : "Connection Details"}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
          {isNode && (data as NodeData).pathway && (
            <NodeDetailsContent
              data={data as NodeData}
              diseaseId={diseaseId}
              geneToTargetIdMapping={geneToTargetIdMapping}
              resolving={resolving}
            />
          )}

          {isEdge && (data as EdgeData).sharedGenes && (
            <EdgeDetailsContent
              data={data as EdgeData}
              geneToTargetIdMapping={geneToTargetIdMapping}
              diseaseId={diseaseId}
              resolving={resolving}
            />
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
