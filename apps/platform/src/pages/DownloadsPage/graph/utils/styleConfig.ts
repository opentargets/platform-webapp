/**
 * Cytoscape styling configuration
 * Defines visual styles for nodes, edges, and highlights
 */

import { getNodeTypes } from './nodeClassifier';

interface CytoscapeStyle {
  selector: string;
  css: Record<string, string | number>;
}

/**
 * Get the complete Cytoscape stylesheet
 */
export const getStylesheet = (): CytoscapeStyle[] => {
  const nodeTypes = getNodeTypes();

  return [
    // Core node styling
    {
      selector: 'node[type="core"]',
      css: {
        'background-color': nodeTypes.core.color,
        'border-color': '#1565C0',
        'border-width': nodeTypes.core.borderWidth,
        width: nodeTypes.core.size,
        height: nodeTypes.core.size,
        'text-valign': 'center',
        'text-halign': 'center',
        label: 'data(label)',
        'font-size': 14,
        'font-weight': 'bold',
        color: '#fff',
        'z-index': nodeTypes.core.zIndex,
        'text-background-color': 'data(color)',
        'text-background-opacity': 0.8,
        'text-background-padding': '4px',
        'text-background-shape': 'round',
      },
    },

    // Evidence node styling
    {
      selector: 'node[type="evidence"]',
      css: {
        'background-color': nodeTypes.evidence.color,
        'border-color': '#E65100',
        'border-width': nodeTypes.evidence.borderWidth,
        width: nodeTypes.evidence.size,
        height: nodeTypes.evidence.size,
        'text-valign': 'center',
        'text-halign': 'center',
        label: 'data(label)',
        'font-size': 12,
        color: '#fff',
        'z-index': nodeTypes.evidence.zIndex,
        'text-max-width': '90px',
        'text-wrap': 'wrap',
        'text-background-color': 'data(color)',
        'text-background-opacity': 0.8,
        'text-background-padding': '3px',
        'text-background-shape': 'round',
      },
    },

    // Attribute node styling
    {
      selector: 'node[type="attribute"]',
      css: {
        'background-color': nodeTypes.attribute.color,
        'border-color': '#388E3C',
        'border-width': nodeTypes.attribute.borderWidth,
        width: nodeTypes.attribute.size,
        height: nodeTypes.attribute.size,
        'text-valign': 'center',
        'text-halign': 'center',
        label: 'data(label)',
        'font-size': 11,
        color: '#fff',
        'z-index': nodeTypes.attribute.zIndex,
        'text-max-width': '70px',
        'text-wrap': 'wrap',
        'text-background-color': 'data(color)',
        'text-background-opacity': 0.8,
        'text-background-padding': '2px',
        'text-background-shape': 'round',
      },
    },

    // Selected node styling
    {
      selector: 'node:selected',
      css: {
        'background-color': '#FFD700',
        'border-color': '#FFA500',
        'border-width': 4,
        'box-shadow': '0 0 20px rgba(255, 215, 0, 0.6)',
      },
    },

    // Hover node styling
    {
      selector: 'node:hover',
      css: {
        'box-shadow': '0 0 15px rgba(0, 0, 0, 0.4)',
        opacity: 1,
      },
    },

    // Edge styling
    {
      selector: 'edge',
      css: {
        'line-color': '#BDBDBD',
        'target-arrow-color': '#BDBDBD',
        'target-arrow-shape': 'triangle',
        width: 2,
        'curve-style': 'straight',
        opacity: 0.6,
      },
    },

    // Selected edge styling
    {
      selector: 'edge:selected',
      css: {
        'line-color': '#FFD700',
        'target-arrow-color': '#FFD700',
        width: 3,
        opacity: 1,
        'z-index': 1000,
      },
    },

    // Highlighted edge styling
    {
      selector: 'edge.highlighted',
      css: {
        'line-color': '#2196F3',
        'target-arrow-color': '#2196F3',
        width: 3,
        opacity: 0.9,
      },
    },

    // Faded styling for non-selected elements
    {
      selector: 'node.faded',
      css: {
        opacity: 0.2,
      },
    },

    {
      selector: 'edge.faded',
      css: {
        opacity: 0.1,
      },
    },

    // Active/highlighted node
    {
      selector: 'node.active',
      css: {
        'background-color': '#4CAF50',
        'border-color': '#2E7D32',
        'border-width': 4,
      },
    },
  ];
};

/**
 * Get dark theme stylesheet
 */
export const getDarkThemeStylesheet = (): CytoscapeStyle[] => {
  const baseStyles = getStylesheet();

  return baseStyles.map((style) => {
    if (style.selector === 'edge') {
      return {
        ...style,
        css: {
          ...style.css,
          'line-color': '#424242',
          'target-arrow-color': '#424242',
        },
      };
    }
    return style;
  });
};

/**
 * Get high-contrast stylesheet for accessibility
 */
export const getHighContrastStylesheet = (): CytoscapeStyle[] => {
  const nodeTypes = getNodeTypes();

  return [
    {
      selector: 'node[type="core"]',
      css: {
        'background-color': '#000080',
        'border-color': '#FFFF00',
        'border-width': 4,
        width: nodeTypes.core.size + 10,
        height: nodeTypes.core.size + 10,
        'text-valign': 'center',
        'text-halign': 'center',
        label: 'data(label)',
        'font-size': 16,
        'font-weight': 'bold',
        color: '#FFFF00',
      },
    },

    {
      selector: 'node[type="evidence"]',
      css: {
        'background-color': '#008080',
        'border-color': '#FFFFFF',
        'border-width': 3,
        width: nodeTypes.evidence.size,
        height: nodeTypes.evidence.size,
        'text-valign': 'center',
        'text-halign': 'center',
        label: 'data(label)',
        'font-size': 12,
        color: '#FFFFFF',
      },
    },

    {
      selector: 'node[type="attribute"]',
      css: {
        'background-color': '#800080',
        'border-color': '#FFFFFF',
        'border-width': 3,
        width: nodeTypes.attribute.size,
        height: nodeTypes.attribute.size,
        'text-valign': 'center',
        'text-halign': 'center',
        label: 'data(label)',
        'font-size': 11,
        color: '#FFFFFF',
      },
    },

    {
      selector: 'edge',
      css: {
        'line-color': '#FFFFFF',
        'target-arrow-color': '#FFFFFF',
        width: 3,
      },
    },
  ];
};

export default {
  getStylesheet,
  getDarkThemeStylesheet,
  getHighContrastStylesheet,
};
