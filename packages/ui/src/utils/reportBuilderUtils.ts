/**
 * Report Builder Utilities
 * 
 * Helper functions for common report operations like:
 * - Exporting reports
 * - LocalStorage persistence
 * - Report generation/formatting
 */

import { Report, ReportSection } from '../types/report';

/**
 * Export report as JSON
 */
export const exportReportAsJSON = (report: Report): string => {
  const exportData = {
    metadata: {
      name: report.name,
      description: report.description,
      createdAt: new Date(report.createdAt).toISOString(),
      updatedAt: new Date(report.updatedAt).toISOString(),
      sections: report.sections.length,
    },
    sections: report.sections.map((section) => ({
      name: section.definition.name,
      id: section.definition.id,
      entity: section.definition.entity,
      selectedView: section.selectedView,
      addedAt: new Date(section.addedAt).toISOString(),
      chipText: section.chipText,
      tags: section.tags,
    })),
  };

  return JSON.stringify(exportData, null, 2);
};

/**
 * Download report as JSON file
 */
export const downloadReportAsJSON = (report: Report): void => {
  const jsonContent = exportReportAsJSON(report);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${report.name.replace(/\s+/g, '-')}-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Generate report as CSV (for table data)
 * Note: This is a basic implementation - customize based on your needs
 */
export const exportReportAsCSV = (report: Report): string => {
  const headers = ['Section', 'Entity', 'View', 'Added Date'];
  const rows = report.sections.map((section) => [
    section.definition.name,
    section.definition.entity,
    section.selectedView,
    new Date(section.addedAt).toLocaleDateString(),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
};

/**
 * Download report as CSV file
 */
export const downloadReportAsCSV = (report: Report): void => {
  const csvContent = exportReportAsCSV(report);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${report.name.replace(/\s+/g, '-')}-${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * LocalStorage persistence utilities
 */
const STORAGE_KEY = 'ot-report-builder-reports';

/**
 * Save report metadata to localStorage
 * Note: Rendered content (React nodes) cannot be serialized
 */
export const saveReportToLocalStorage = (report: Report): void => {
  try {
    const reports = getAllReportsFromLocalStorage();
    const reportToSave = {
      id: report.id,
      name: report.name,
      description: report.description,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      entityContext: report.entityContext,
      sections: report.sections.map((section) => ({
        reportSectionId: section.reportSectionId,
        definition: section.definition,
        selectedView: section.selectedView,
        addedAt: section.addedAt,
        tags: section.tags,
        chipText: section.chipText,
        // Note: renderedContent is not serialized
      })),
    };

    reports[report.id] = reportToSave;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  } catch (error) {
    console.error('Failed to save report to localStorage:', error);
  }
};

/**
 * Load reports from localStorage
 */
export const getAllReportsFromLocalStorage = (): Record<string, any> => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Failed to load reports from localStorage:', error);
    return {};
  }
};

/**
 * Load a single report from localStorage
 */
export const loadReportFromLocalStorage = (reportId: string): any | null => {
  try {
    const reports = getAllReportsFromLocalStorage();
    return reports[reportId] || null;
  } catch (error) {
    console.error('Failed to load report from localStorage:', error);
    return null;
  }
};

/**
 * Delete report from localStorage
 */
export const deleteReportFromLocalStorage = (reportId: string): void => {
  try {
    const reports = getAllReportsFromLocalStorage();
    delete reports[reportId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  } catch (error) {
    console.error('Failed to delete report from localStorage:', error);
  }
};

/**
 * Clear all reports from localStorage
 */
export const clearAllReportsFromLocalStorage = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
  }
};

/**
 * Generate a human-readable report summary
 */
export const generateReportSummary = (report: Report): string => {
  const summary = `
Report: ${report.name}
Created: ${new Date(report.createdAt).toLocaleDateString()}
Updated: ${new Date(report.updatedAt).toLocaleDateString()}
Sections: ${report.sections.length}

Sections:
${report.sections
  .map(
    (section, idx) =>
      `${idx + 1}. ${section.definition.name} (${section.selectedView}, added ${new Date(section.addedAt).toLocaleDateString()})`
  )
  .join('\n')}

${report.description ? `\nDescription:\n${report.description}` : ''}
  `.trim();

  return summary;
};

/**
 * Merge multiple sections into a single section (for combining data)
 * Note: This is a utility - actual implementation depends on your data structure
 */
export const mergeReportSections = (
  sections: ReportSection[],
  mergedName: string
): ReportSection | null => {
  if (sections.length === 0) return null;

  const firstSection = sections[0];

  // Create a merged section
  return {
    ...firstSection,
    definition: {
      ...firstSection.definition,
      name: mergedName,
    },
    // Note: Rendering merged content would require custom logic
  };
};

/**
 * Validate report structure
 */
export const isValidReport = (data: any): boolean => {
  return (
    data &&
    typeof data === 'object' &&
    data.id &&
    data.name &&
    Array.isArray(data.sections) &&
    typeof data.createdAt === 'number' &&
    typeof data.updatedAt === 'number'
  );
};

/**
 * Get report statistics
 */
export const getReportStats = (
  report: Report
): {
  totalSections: number;
  tableSections: number;
  chartSections: number;
  privateSections: number;
  age: string;
} => {
  const tableSections = report.sections.filter((s) => s.selectedView === 'table').length;
  const chartSections = report.sections.filter((s) => s.selectedView === 'chart').length;
  const privateSections = report.sections.filter((s) => s.definition.isPrivate).length;

  const now = Date.now();
  const ageMs = now - report.createdAt;
  const days = Math.floor(ageMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ageMs / (1000 * 60 * 60)) % 24);
  const age =
    days > 0
      ? `${days} day${days !== 1 ? 's' : ''} ago`
      : hours > 0
        ? `${hours} hour${hours !== 1 ? 's' : ''} ago`
        : 'just now';

  return {
    totalSections: report.sections.length,
    tableSections,
    chartSections,
    privateSections,
    age,
  };
};

/**
 * Duplicate a report
 */
export const duplicateReport = (
  report: Report,
  newName?: string
): Omit<Report, 'id'> => {
  return {
    name: newName || `${report.name} (Copy)`,
    description: report.description,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    entityContext: report.entityContext,
    sections: report.sections.map((section) => ({
      ...section,
      addedAt: Date.now(),
      // Note: reportSectionId will be regenerated when added
    })),
  };
};

/**
 * Filter report sections by entity type
 */
export const filterReportByEntity = (report: Report, entityType: string): ReportSection[] => {
  return report.sections.filter((section) => section.definition.entity === entityType);
};

/**
 * Filter report sections by view type
 */
export const filterReportByView = (
  report: Report,
  viewType: 'table' | 'chart'
): ReportSection[] => {
  return report.sections.filter((section) => section.selectedView === viewType);
};
