/**
 * Component: GraphLegend
 * Legend showing node categories with filtering capabilities
 */

import React, { useMemo } from 'react';
import { Card, CardContent, Typography, Box, Stack, Checkbox, FormControlLabel } from '@mui/material';
import { getCategoryColor } from '../utils/colorPool';

interface GraphLegendProps {
  nodes?: any[];
  visibleCategories?: string[];
  onCategoryToggle?: (category: string, visible: boolean) => void;
  sx?: any;
}

/**
 * Display legend for graph node categories with filtering
 */
const GraphLegend: React.FC<GraphLegendProps> = ({ 
  nodes = [], 
  visibleCategories = [],
  onCategoryToggle,
  sx = {} 
}) => {
  // Extract unique categories from nodes
  const categories = useMemo(() => {
    const uniqueCategories = new Set(nodes.map((node) => node.data?.type).filter(Boolean));
    return Array.from(uniqueCategories).sort();
  }, [nodes]);

  // Count nodes per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    categories.forEach((cat) => {
      counts[cat] = nodes.filter((node) => node.data?.type === cat).length;
    });
    return counts;
  }, [nodes, categories]);

  return (
    <Card
      sx={{
        height: 'fit-content',
        ...sx,
      }}
    >
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
          Categories
        </Typography>

        <Stack spacing={1.5}>
          {categories.map((category, index) => (
            <Box key={category} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              {/* Color swatch */}
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor: getCategoryColor(index),
                  border: `3px solid ${getCategoryColor(index)}`,
                  flexShrink: 0,
                  mt: 0.3,
                }}
              />

              {/* Text info with checkbox */}
              <Box sx={{ flex: 1 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={visibleCategories.includes(category)}
                      onChange={(e) => onCategoryToggle?.(category, e.target.checked)}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {category} ({categoryCounts[category]})
                      </Typography>
                    </Box>
                  }
                  sx={{ margin: 0, width: '100%' }}
                />
              </Box>
            </Box>
          ))}
        </Stack>

        {/* Statistics section */}
        <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #e0e0e0' }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
            Total Datasets: {nodes.length}
          </Typography>
          <ul style={{ margin: '8px 0', paddingLeft: '16px', fontSize: '12px' }}>
            <li>Click category checkbox to show/hide nodes</li>
            <li>Click a node to select and highlight connections</li>
            <li>Hover over nodes to see details</li>
            <li>Drag to pan, scroll to zoom</li>
          </ul>
        </Box>
      </CardContent>
    </Card>
  );
};

export default GraphLegend;
