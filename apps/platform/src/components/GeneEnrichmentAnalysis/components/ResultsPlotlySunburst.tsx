import {
  faComputerMouse,
  faHandPointer,
  faUpDownLeftRight,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import type { GseaResult } from "../api/gseaApi";
import { PRIORITISATION_COLORS } from "../utils/colorPalettes";
import PlotlySunburstChart from "./PlotlySunburstChart";
import SunburstFilters, { type PathwayFilters } from "./SunburstFilters";

interface ResultsPlotlySunburstProps {
  results: GseaResult[];
}

function ResultsPlotlySunburst({ results }: ResultsPlotlySunburstProps) {
  // Get initial NES range from data
  const nesDataRange = useMemo(() => {
    const nesValues = results.map((r) => r.NES || 0);
    return {
      min: Math.min(...nesValues),
      max: Math.max(...nesValues),
    };
  }, [results]);

  const [filters, setFilters] = useState<PathwayFilters>({
    searchText: "",
    selectedCategories: [],
    nesRange: [nesDataRange.min, nesDataRange.max],
    pValueThreshold: 1.0,
    fdrThreshold: 1.0,
    showSignificantOnly: false,
  });

  // Filter pathways based on current filters
  const filteredResults = useMemo(() => {
    return results.filter((pathway) => {
      // Search text filter
      if (filters.searchText) {
        const pathwayName = pathway.Pathway || "";
        const pathwayId = pathway.ID || "";
        const searchLower = filters.searchText.toLowerCase();
        if (
          !pathwayName.toLowerCase().includes(searchLower) &&
          !pathwayId.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }

      // Category filter
      if (filters.selectedCategories.length > 0) {
        const pathwayName = pathway.Pathway || "";
        const matchesCategory = filters.selectedCategories.some((category) =>
          pathwayName.includes(category)
        );
        if (!matchesCategory) {
          return false;
        }
      }

      // NES range filter
      const nes = pathway.NES || 0;
      if (nes < filters.nesRange[0] || nes > filters.nesRange[1]) {
        return false;
      }

      // P-value threshold filter
      const pValue = pathway["p-value"] || 1;
      if (pValue > filters.pValueThreshold) {
        return false;
      }

      // FDR threshold filter
      const fdr = pathway.FDR || 1;
      if (fdr > filters.fdrThreshold) {
        return false;
      }

      // Show significant only filter
      if (filters.showSignificantOnly && pValue >= 0.05) {
        return false;
      }

      return true;
    });
  }, [results, filters]);

  // NES range from filtered results for legend
  const nesRange = useMemo(() => {
    const nesValues = filteredResults.map((r) => r.NES || 0);
    if (nesValues.length === 0) return { min: 0, max: 0 };
    return {
      min: Math.min(...nesValues),
      max: Math.max(...nesValues),
    };
  }, [filteredResults]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <SunburstFilters
        results={results}
        filters={filters}
        onFiltersChange={setFilters}
        filteredCount={filteredResults.length}
      />
      {/* Color legend + interaction hints */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: 3,
          px: 2,
          pt: 1.5,
        }}
      >
        {/* NES color scale */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="caption" color="text.secondary">
            NES: {nesRange.min.toFixed(2)}
          </Typography>
          <Box
            sx={{
              width: 150,
              height: 12,
              background: `linear-gradient(to right, ${PRIORITISATION_COLORS[0]}, ${PRIORITISATION_COLORS[Math.floor(PRIORITISATION_COLORS.length / 2)]}, ${PRIORITISATION_COLORS[PRIORITISATION_COLORS.length - 1]})`,
              borderRadius: 1,
            }}
          />
          <Typography variant="caption" color="text.secondary">
            {nesRange.max.toFixed(2)}
          </Typography>
        </Box>
        {/* Separator */}
        <Box sx={{ width: "1px", height: 16, backgroundColor: "divider" }} />
        {/* Interaction hints */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <FontAwesomeIcon icon={faHandPointer} style={{ fontSize: "0.7rem", opacity: 0.5 }} />
            <Typography variant="caption" color="text.disabled">
              Click to drill down
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <FontAwesomeIcon icon={faComputerMouse} style={{ fontSize: "0.7rem", opacity: 0.5 }} />
            <Typography variant="caption" color="text.disabled">
              Scroll to zoom
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <FontAwesomeIcon
              icon={faUpDownLeftRight}
              style={{ fontSize: "0.7rem", opacity: 0.5 }}
            />
            <Typography variant="caption" color="text.disabled">
              Shift+drag to pan
            </Typography>
          </Box>
        </Box>
      </Box>
      <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
        <PlotlySunburstChart results={filteredResults} />
      </Box>
    </Box>
  );
}

export default ResultsPlotlySunburst;
